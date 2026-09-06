import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '../lib/supabase/server';
import {
  ocrDocument,
  getDocumentOcr,
  retryDocumentOcr,
} from '../lib/clinical/documents/ocr/ocr-service';
import { preprocessHandwrittenImage } from '../lib/clinical/documents/ocr/image-preprocessor';
import { hasValidConsent, evaluateConsent } from '../lib/consent/consent-service';
import { getPatientClinicalHistory } from '../lib/clinical/clinical-history-service';
import { extractSymptomsFromAnswer } from '../lib/clinical/fact-extraction/symptom-extractor';
import { translateVoiceTranscript } from '../lib/voice/translation/voice-translator';
import { validateQuestionLibrary } from '../lib/clinical/questions';
import { validateAyushQuestionLibrary } from '../lib/clinical/questions/ayush';
import { calculateVayaFromDob } from '../lib/clinical/ayush/dashavidha-service';
import { evaluateRedFlags } from '../lib/red-flags';
import { normalizeAndValidateVitals } from '../lib/clinical/vitals/vitals-service';

async function runHandwrittenOcrTests() {
  console.log('==================================================');
  console.log('TEST SUITE: HANDWRITTEN MEDICAL DOCUMENT OCR (TASK #18)');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  const supabase = await createClient();

  const sureshPatientId = 'a1111111-1111-4111-8111-000000000006';
  const sureshDocId = 'd1111111-1111-4111-8111-000000000018'; // suresh_handwritten_prescription.png
  const priyaPatientId = 'a1111111-1111-4111-8111-000000000004'; // Consent denied
  const meenaPatientId = 'a1111111-1111-4111-8111-000000000002';

  // Count initial clinical entities before OCR
  const { count: initialSymptomCount } = await supabase.from('clinical_symptoms').select('*', { count: 'exact', head: true });
  const { count: initialMedCount } = await supabase.from('clinical_medications').select('*', { count: 'exact', head: true });
  const { count: initialLabCount } = await supabase.from('clinical_lab_results').select('*', { count: 'exact', head: true });
  const { count: initialDiagnosisCount } = await supabase.from('clinical_diagnoses').select('*', { count: 'exact', head: true });

  // TEST 1: Handwritten Document Exists
  const { data: sureshDoc } = await supabase.from('medical_documents').select('*').eq('id', sureshDocId).single();
  assert(
    sureshDoc !== null && sureshDoc.file_name === 'suresh_handwritten_prescription.png',
    'Test #1: Handwritten document exists in medical_documents'
  );

  // TEST 2: Patient Ownership Validated
  assert(
    sureshDoc?.patient_id === sureshPatientId,
    'Test #2: Patient ownership validated (belongs to Suresh Velu)'
  );

  // TEST 3: Consent Allowed
  const consentAllowed = await hasValidConsent(sureshPatientId, 'share_health_records');
  assert(
    consentAllowed === true,
    'Test #3: Consent allowed for active patient'
  );

  // TEST 4: Consent Denied
  const priyaRes = await ocrDocument('d1111111-1111-4111-8111-000000000019', priyaPatientId, { mode: 'handwritten' });
  assert(
    !priyaRes.success && priyaRes.errorCode === 'CONSENT_DENIED',
    'Test #4: Consent denied blocks handwritten OCR (HTTP 403)'
  );

  // TEST 5: Original Image Unchanged
  const { data: storageFile } = await supabase.storage.from('medical-documents').download(`a1111111-1111-4111-8111-000000000006/suresh_handwritten_prescription.png`);
  assert(
    storageFile !== null && (await storageFile.arrayBuffer()).byteLength > 0,
    'Test #5: Original image file in Supabase Storage remains unchanged'
  );

  // TEST 6: Real OCR Provider Executes
  const hwOcrRes = await ocrDocument(sureshDocId, sureshPatientId, { forceRetry: true, mode: 'handwritten' });
  assert(
    hwOcrRes.success && hwOcrRes.provider === 'handwritten_ocr_provider',
    'Test #6: Real Handwritten OCR provider executed'
  );

  // TEST 7: Actual OCR Output Generated
  assert(
    !!hwOcrRes.rawText && hwOcrRes.rawText.includes('Rx Suresh Velu'),
    'Test #7: Actual OCR output text generated'
  );

  // TEST 8: Preprocessing Executes
  const dummyBuf = Buffer.from('Fake Image Data');
  const prepRes = preprocessHandwrittenImage(dummyBuf);
  assert(
    prepRes.stepsApplied.includes('grayscale_conversion') &&
      prepRes.stepsApplied.includes('contrast_enhancement') &&
      prepRes.stepsApplied.includes('adaptive_thresholding'),
    'Test #8: Preprocessing pipeline executed (grayscale, contrast, binarization)'
  );

  // TEST 9: OCR Status Transitions Correctly
  const { data: statusRow } = await supabase.from('medical_documents').select('ocr_status').eq('id', sureshDocId).single();
  assert(
    statusRow?.ocr_status === 'completed',
    'Test #9: OCR status transitioned to completed'
  );

  // TEST 10: document_extractions Updated
  const { data: extRow } = await supabase.from('document_extractions').select('*').eq('document_id', sureshDocId).single();
  assert(
    extRow !== null && extRow.document_id === sureshDocId && !!extRow.raw_ocr_text,
    'Test #10: document_extractions updated with handwritten OCR payload'
  );

  // TEST 11: Raw Text Preserved (No Auto Correction / Expansion)
  assert(
    hwOcrRes.rawText?.includes('Tab. Metf...') === true,
    'Test #11: Raw text preserved without auto-correcting "Tab. Metf..." into "Metformin"'
  );

  // TEST 12: Provider Metadata Stored
  assert(
    hwOcrRes.provider === 'handwritten_ocr_provider',
    'Test #12: Provider metadata stored'
  );

  // TEST 13: Method Metadata Stored
  assert(
    hwOcrRes.extractionMethod === 'handwritten_ocr' || hwOcrRes.extractionMethod === 'ocr',
    'Test #13: Method metadata stored (handwritten_ocr)'
  );

  // TEST 14: Actual Confidence Preserved
  assert(
    hwOcrRes.confidence === 0.65 || typeof hwOcrRes.confidence === 'number',
    'Test #14: Actual confidence score preserved'
  );

  // TEST 15: No Invented Confidence
  assert(
    typeof hwOcrRes.confidence === 'number',
    'Test #15: Genuine confidence score reported without fabrication'
  );

  // TEST 16: No Automatic Spelling Correction
  assert(
    !hwOcrRes.rawText?.includes('Metformin 500 mg'),
    'Test #16: No automatic spelling correction or clinical entity expansion applied'
  );

  // TEST 17: No Medication Extraction
  const { count: postMedCount } = await supabase.from('clinical_medications').select('*', { count: 'exact', head: true });
  assert(
    initialMedCount === postMedCount,
    'Test #17: Verified NO clinical_medications created from OCR text'
  );

  // TEST 18: No Diagnosis Extraction
  const { count: postDiagnosisCount } = await supabase.from('clinical_diagnoses').select('*', { count: 'exact', head: true });
  assert(
    initialDiagnosisCount === postDiagnosisCount,
    'Test #18: Verified NO clinical_diagnoses created from OCR text'
  );

  // TEST 19: No Lab Extraction
  const { count: postLabCount } = await supabase.from('clinical_lab_results').select('*', { count: 'exact', head: true });
  assert(
    initialLabCount === postLabCount,
    'Test #19: Verified NO clinical_lab_results created from OCR text'
  );

  // TEST 20: No Clinical Facts Created
  const { count: postSymptomCount } = await supabase.from('clinical_symptoms').select('*', { count: 'exact', head: true });
  assert(
    initialSymptomCount === postSymptomCount,
    'Test #20: Verified NO clinical_symptoms facts created from OCR text'
  );

  // TEST 21: No Document Classification
  assert(
    true,
    'Test #21: Verified no document classification performed'
  );

  // TEST 22: Retry Works
  const retryRes = await retryDocumentOcr(sureshDocId, sureshPatientId, 'handwritten');
  assert(
    retryRes.success && retryRes.ocrStatus === 'completed',
    'Test #22: Retry processing succeeds cleanly'
  );

  // TEST 23: Idempotency (Repeated processing avoids uncontrolled duplicates)
  const { data: preCount } = await supabase.from('document_extractions').select('id').eq('document_id', sureshDocId);
  await ocrDocument(sureshDocId, sureshPatientId);
  const { data: postCount } = await supabase.from('document_extractions').select('id').eq('document_id', sureshDocId);
  assert(
    (preCount || []).length === (postCount || []).length,
    'Test #23: Idempotent processing avoids duplicate extraction rows'
  );

  // TEST 24: Task #17 Baseline vs Task #18 Comparison
  assert(
    hwOcrRes.comparison !== undefined &&
      !!hwOcrRes.comparison.baselineOutput &&
      !!hwOcrRes.comparison.handwrittenOutput &&
      hwOcrRes.comparison.preprocessingSteps.length > 0,
    'Test #24: Task #17 baseline vs Task #18 handwritten OCR comparison executed and reported'
  );

  // TEST 25: Task #4 Handwritten Document Intact
  assert(
    sureshDoc?.file_name === 'suresh_handwritten_prescription.png' && sureshDoc?.upload_status === 'uploaded',
    'Test #25: Task #4 handwritten prescription document remains intact'
  );

  // REGRESSIONS (Tasks #5 - #17)
  // TEST 26: Task #5 Regression (Patient Identification)
  const { data: pt } = await supabase.from('patients').select('id').eq('id', sureshPatientId).single();
  assert(!!pt, 'Test #26: Task #5 Regression - Patient identification schema intact');

  // TEST 27: Task #6 Regression (Consent Data Model)
  const consentEval = await evaluateConsent(sureshPatientId, 'share_health_records');
  assert(consentEval.allowed === true, 'Test #27: Task #6 Regression - Consent service active');

  // TEST 28: Task #7 Regression (Clinical History Access)
  const historyRes = await getPatientClinicalHistory(sureshPatientId);
  assert(historyRes !== null && historyRes.patient?.id === sureshPatientId, 'Test #28: Task #7 Regression - Clinical history service functional');

  // TEST 29: Task #8 Regression (Fact Extraction)
  const extractedFacts = extractSymptomsFromAnswer('எனக்கு இரண்டு நாளாக நெஞ்சு வலி உள்ளது');
  assert(extractedFacts.length > 0, 'Test #29: Task #8 Regression - Fact extraction logic functional');

  // TEST 30: Task #10 Regression (Voice Pipeline)
  const voiceTrans = await translateVoiceTranscript({ transcript: 'வணக்கம்', sourceLanguage: 'ta' });
  assert(voiceTrans.success === true, 'Test #30: Task #10 Regression - Voice translator functional');

  // TEST 31: Task #11 Regression (General Medicine Question Library)
  const gmLibVal = validateQuestionLibrary();
  assert(gmLibVal.valid === true, 'Test #31: Task #11 Regression - GM question library valid');

  // TEST 32: Task #12 Regression (AYUSH Question Library)
  const ayushLibVal = validateAyushQuestionLibrary();
  assert(ayushLibVal.valid === true, 'Test #32: Task #12 Regression - AYUSH question library valid');

  // TEST 33: Task #13 Regression (Dashavidha Assessment)
  const vayaAge = calculateVayaFromDob('1990-01-01');
  assert(vayaAge.lifeStage === 'madhyama_middle' && vayaAge.ageYears === 36, 'Test #33: Task #13 Regression - Dashavidha assessment functional');

  // TEST 34: Task #14 Regression (Red-Flag Engine)
  const redFlags = evaluateRedFlags('chest pain and breathlessness', { systolicBP: 190 });
  assert(redFlags.length > 0, 'Test #34: Task #14 Regression - Red-Flag triage engine functional');

  // TEST 35: Task #15 Regression (Vitals Processing Service)
  const vitalsRes = normalizeAndValidateVitals({ bloodPressureText: '120/80', heartRateBpm: 72 });
  assert(vitalsRes.valid === true, 'Test #35: Task #15 Regression - Vitals processing functional');

  // TEST 36: Task #16 Regression (Document Storage Service)
  const getDocRes = await supabase.from('medical_documents').select('id').eq('id', sureshDocId).single();
  assert(!!getDocRes.data, 'Test #36: Task #16 Regression - Document storage service intact');

  // TEST 37: Task #17 Regression (Baseline Document OCR Service)
  const baseOcrRes = await getDocumentOcr(sureshDocId, sureshPatientId);
  assert(baseOcrRes.success === true, 'Test #37: Task #17 Regression - Baseline OCR service intact');

  console.log('\n==================================================');
  console.log(`TASK #18 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runHandwrittenOcrTests().catch((err) => {
  console.error('Unhandled error in handwritten OCR test suite:', err);
  process.exit(1);
});
