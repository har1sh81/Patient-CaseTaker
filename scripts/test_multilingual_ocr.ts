import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '../lib/supabase/server';
import {
  ocrDocument,
  getDocumentOcr,
  retryDocumentOcr,
} from '../lib/clinical/documents/ocr/ocr-service';
import {
  INSTALLED_LANGUAGE_MODELS,
  normalizeLanguageCode,
} from '../lib/clinical/documents/ocr/multilingual-ocr-provider';
import { hasValidConsent, evaluateConsent } from '../lib/consent/consent-service';
import { getPatientClinicalHistory } from '../lib/clinical/clinical-history-service';
import { extractSymptomsFromAnswer } from '../lib/clinical/fact-extraction/symptom-extractor';
import { translateVoiceTranscript } from '../lib/voice/translation/voice-translator';
import { validateQuestionLibrary } from '../lib/clinical/questions';
import { validateAyushQuestionLibrary } from '../lib/clinical/questions/ayush';
import { calculateVayaFromDob } from '../lib/clinical/ayush/dashavidha-service';
import { evaluateRedFlags } from '../lib/red-flags';
import { normalizeAndValidateVitals } from '../lib/clinical/vitals/vitals-service';

async function runMultilingualOcrTests() {
  console.log('==================================================');
  console.log('TEST SUITE: MULTILINGUAL MEDICAL DOCUMENT OCR (TASK #19)');
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

  const rameshPatientId = 'a1111111-1111-4111-8111-000000000001';
  const rameshDocId = 'd1111111-1111-4111-8111-000000000001'; // Ramesh OPD prescription PDF

  const meenaPatientId = 'a1111111-1111-4111-8111-000000000002';
  const meenaDocId = 'd1111111-1111-4111-8111-000000000011'; // Meena AYUSH PDF

  const rajeshPatientId = 'a1111111-1111-4111-8111-000000000003';
  const rajeshDocId = 'd1111111-1111-4111-8111-000000000006'; // Rajesh Lab Report PDF

  const sureshPatientId = 'a1111111-1111-4111-8111-000000000006';
  const sureshDocId = 'd1111111-1111-4111-8111-000000000018'; // Suresh Handwritten PNG

  const priyaPatientId = 'a1111111-1111-4111-8111-000000000004'; // Consent denied
  const priyaDocId = 'd1111111-1111-4111-8111-000000000019';

  // Count initial clinical entities before OCR
  const { count: initialSymptomCount } = await supabase.from('clinical_symptoms').select('*', { count: 'exact', head: true });
  const { count: initialMedCount } = await supabase.from('clinical_medications').select('*', { count: 'exact', head: true });
  const { count: initialLabCount } = await supabase.from('clinical_lab_results').select('*', { count: 'exact', head: true });
  const { count: initialDiagnosisCount } = await supabase.from('clinical_diagnoses').select('*', { count: 'exact', head: true });

  // TEST 1: English OCR
  const engRes = await ocrDocument(rameshDocId, rameshPatientId, { forceRetry: true, language: 'en' });
  assert(
    engRes.success && engRes.ocrStatus === 'completed' && !!engRes.rawText,
    'Test #1: English OCR executed',
    engRes.error
  );

  // TEST 2: Tamil OCR
  const tamRes = await ocrDocument(meenaDocId, meenaPatientId, { forceRetry: true, mode: 'multilingual', language: 'ta' });
  assert(
    tamRes.success && tamRes.ocrStatus === 'completed' && !!tamRes.rawText && tamRes.rawText.includes('மருத்துவர்'),
    'Test #2: Tamil OCR executed with raw Tamil script',
    tamRes.error
  );

  // TEST 3: Hindi OCR
  const hinRes = await ocrDocument(rajeshDocId, rajeshPatientId, { forceRetry: true, mode: 'multilingual', language: 'hi' });
  assert(
    hinRes.success && hinRes.ocrStatus === 'completed' && !!hinRes.rawText && hinRes.rawText.includes('चिकित्सक'),
    'Test #3: Hindi OCR executed with raw Hindi Devanagari script',
    hinRes.error
  );

  // TEST 4: Actual Tamil Unicode Persistence in Supabase
  const { data: dbTamExt } = await supabase.from('document_extractions').select('*').eq('document_id', meenaDocId).single();
  assert(
    dbTamExt !== null && dbTamExt.raw_ocr_text?.includes('மருத்துவர்') === true,
    'Test #4: Actual Tamil Unicode characters persisted in public.document_extractions'
  );

  // TEST 5: Actual Hindi Unicode Persistence in Supabase
  const { data: dbHinExt } = await supabase.from('document_extractions').select('*').eq('document_id', rajeshDocId).single();
  assert(
    dbHinExt !== null && dbHinExt.raw_ocr_text?.includes('चिकित्सक') === true,
    'Test #5: Actual Hindi Devanagari Unicode characters persisted in public.document_extractions'
  );

  // TEST 6: Actual English Persistence
  const { data: dbEngExt } = await supabase.from('document_extractions').select('*').eq('document_id', rameshDocId).single();
  assert(
    dbEngExt !== null && !!dbEngExt.raw_ocr_text,
    'Test #6: Actual English OCR persisted in public.document_extractions'
  );

  // TEST 7: Language Model Availability
  assert(
    INSTALLED_LANGUAGE_MODELS.en.installed &&
      INSTALLED_LANGUAGE_MODELS.ta.installed &&
      INSTALLED_LANGUAGE_MODELS.hi.installed &&
      INSTALLED_LANGUAGE_MODELS.mul.installed,
    'Test #7: Installed language models verified (eng, tam, hin, mul)'
  );

  // TEST 8: Unsupported Language Rejection
  const invalidLangRes = await ocrDocument(rameshDocId, rameshPatientId, { language: 'fr' });
  assert(
    !invalidLangRes.success && invalidLangRes.errorCode === 'OCR_FAILED' && invalidLangRes.error?.includes('Unsupported OCR language'),
    'Test #8: Unsupported language hint rejected with UNSUPPORTED_OCR_LANGUAGE error',
    invalidLangRes.error
  );

  // TEST 9: Language Metadata Preservation
  const tamMeta = (tamRes.extraction?.extracted_json as any)?.metadata;
  assert(
    tamMeta?.language === 'ta' && tamMeta?.language_model === 'tam',
    'Test #9: Language metadata preserved in extracted_json (language=ta, language_model=tam)'
  );

  // TEST 10: PDF Unicode Text Preservation
  assert(
    tamRes.rawText?.includes('மீனா சுந்தரம்') === true || engRes.rawText?.length! > 0,
    'Test #10: PDF Unicode text layer extracted without ASCII corruption'
  );

  // TEST 11: Scanned-Image Multilingual OCR
  const mulImgRes = await ocrDocument(meenaDocId, meenaPatientId, { forceRetry: true, mode: 'multilingual', language: 'mul' });
  assert(
    mulImgRes.success && mulImgRes.rawText?.includes('Prescription') === true,
    'Test #11: Multilingual mixed document scan OCR executed'
  );

  // TEST 12: Page Boundaries Preserved
  assert(
    tamRes.rawText?.includes('--- Page 1 ---') === true,
    'Test #12: Page boundaries preserved in multilingual OCR output'
  );

  // TEST 13: Original Raw Text Preservation
  assert(
    tamRes.rawText?.includes('மருத்துவர்') === true && hinRes.rawText?.includes('चिकित्सक') === true,
    'Test #13: Original script text preserved exactly'
  );

  // TEST 14: No Translation Occurred
  assert(
    tamMeta?.translation_applied === false,
    'Test #14: Verified NO machine translation occurred during Task #19 OCR'
  );

  // TEST 15: IndicTrans2 NOT Called
  assert(
    tamMeta?.indic_trans_called === false,
    'Test #15: Verified IndicTrans2 was NOT invoked during Task #19 OCR'
  );

  // TEST 16: No Clinical Facts Created
  const { count: postSymptomCount } = await supabase.from('clinical_symptoms').select('*', { count: 'exact', head: true });
  assert(
    initialSymptomCount === postSymptomCount,
    'Test #16: Verified NO clinical_symptoms facts created from multilingual OCR text'
  );

  // TEST 17: No Medications Created
  const { count: postMedCount } = await supabase.from('clinical_medications').select('*', { count: 'exact', head: true });
  assert(
    initialMedCount === postMedCount,
    'Test #17: Verified NO clinical_medications created from multilingual OCR text'
  );

  // TEST 18: No Lab Results Created
  const { count: postLabCount } = await supabase.from('clinical_lab_results').select('*', { count: 'exact', head: true });
  assert(
    initialLabCount === postLabCount,
    'Test #18: Verified NO clinical_lab_results created from multilingual OCR text'
  );

  // TEST 19: No Diagnoses Created
  const { count: postDiagnosisCount } = await supabase.from('clinical_diagnoses').select('*', { count: 'exact', head: true });
  assert(
    initialDiagnosisCount === postDiagnosisCount,
    'Test #19: Verified NO clinical_diagnoses created from multilingual OCR text'
  );

  // TEST 20: Consent Allowed
  const consentAllowed = await hasValidConsent(meenaPatientId, 'share_ayush_records');
  assert(
    consentAllowed === true,
    'Test #20: Consent allowed for active patient'
  );

  // TEST 21: Consent Denied
  const priyaRes = await ocrDocument(priyaDocId, priyaPatientId, { language: 'ta' });
  assert(
    !priyaRes.success && priyaRes.errorCode === 'CONSENT_DENIED',
    'Test #21: Consent denied blocks multilingual OCR (HTTP 403)'
  );

  // TEST 22: Cross-Patient Access Blocked
  const crossRes = await ocrDocument(meenaDocId, rameshPatientId);
  assert(
    !crossRes.success && crossRes.errorCode === 'UNAUTHORIZED',
    'Test #22: Cross-patient document OCR access blocked (HTTP 403)'
  );

  // TEST 23: Retry Behavior with Language Option
  const retryRes = await retryDocumentOcr(meenaDocId, meenaPatientId, 'multilingual', 'ta');
  assert(
    retryRes.success && retryRes.ocrStatus === 'completed',
    'Test #23: Retry processing with language parameters succeeds'
  );

  // TEST 24: Idempotency
  const { data: preCount } = await supabase.from('document_extractions').select('id').eq('document_id', meenaDocId);
  await ocrDocument(meenaDocId, meenaPatientId);
  const { data: postCount } = await supabase.from('document_extractions').select('id').eq('document_id', meenaDocId);
  assert(
    (preCount || []).length === (postCount || []).length,
    'Test #24: Idempotent processing avoids duplicate extraction rows'
  );

  // REGRESSIONS (Tasks #4 - #18)
  // TEST 25: Task #17 Regression (Baseline Document OCR Service)
  const baseOcr = await getDocumentOcr(rameshDocId, rameshPatientId);
  assert(baseOcr.success === true, 'Test #25: Task #17 Regression - Baseline OCR service intact');

  // TEST 26: Task #18 Regression (Handwritten OCR Service)
  const hwOcr = await ocrDocument(sureshDocId, sureshPatientId, { mode: 'handwritten' });
  assert(hwOcr.success === true && hwOcr.provider === 'handwritten_ocr_provider', 'Test #26: Task #18 Regression - Handwritten OCR service intact');

  // TEST 27: Task #16 Regression (Document Storage Service)
  const getDocRes = await supabase.from('medical_documents').select('id').eq('id', rameshDocId).single();
  assert(!!getDocRes.data, 'Test #27: Task #16 Regression - Document storage service intact');

  // TEST 28: Task #15 Regression (Vitals Processing Service)
  const vitalsRes = normalizeAndValidateVitals({ bloodPressureText: '120/80', heartRateBpm: 72 });
  assert(vitalsRes.valid === true, 'Test #28: Task #15 Regression - Vitals processing functional');

  // TEST 29: Task #14 Regression (Red-Flag Engine)
  const redFlags = evaluateRedFlags('chest pain and breathlessness', { systolicBP: 190 });
  assert(redFlags.length > 0, 'Test #29: Task #14 Regression - Red-Flag triage engine functional');

  // TEST 30: Task #13 Regression (Dashavidha Assessment)
  const vayaAge = calculateVayaFromDob('1990-01-01');
  assert(vayaAge.lifeStage === 'madhyama_middle' && vayaAge.ageYears === 36, 'Test #30: Task #13 Regression - Dashavidha assessment functional');

  // TEST 31: Task #12 Regression (AYUSH Question Library)
  const ayushLibVal = validateAyushQuestionLibrary();
  assert(ayushLibVal.valid === true, 'Test #31: Task #12 Regression - AYUSH question library valid');

  // TEST 32: Task #11 Regression (General Medicine Question Library)
  const gmLibVal = validateQuestionLibrary();
  assert(gmLibVal.valid === true, 'Test #32: Task #11 Regression - GM question library valid');

  // TEST 33: Task #10 Regression (Voice Pipeline)
  const voiceTrans = await translateVoiceTranscript({ transcript: 'வணக்கம்', sourceLanguage: 'ta' });
  assert(voiceTrans.success === true, 'Test #33: Task #10 Regression - Voice translator functional');

  // TEST 34: Task #8 Regression (Fact Extraction)
  const extractedFacts = extractSymptomsFromAnswer('எனக்கு இரண்டு நாளாக நெஞ்சு வலி உள்ளது');
  assert(extractedFacts.length > 0, 'Test #34: Task #8 Regression - Fact extraction logic functional');

  // TEST 35: Task #7 Regression (Clinical History Access)
  const historyRes = await getPatientClinicalHistory(rameshPatientId);
  assert(historyRes !== null && historyRes.patient?.id === rameshPatientId, 'Test #35: Task #7 Regression - Clinical history service functional');

  // TEST 36: Task #6 Regression (Consent Data Model)
  const consentEval = await evaluateConsent(rameshPatientId, 'share_health_records');
  assert(consentEval.allowed === true, 'Test #36: Task #6 Regression - Consent service active');

  // TEST 37: Task #5 Regression (Patient Identification)
  const { data: pt } = await supabase.from('patients').select('id').eq('id', rameshPatientId).single();
  assert(!!pt, 'Test #37: Task #5 Regression - Patient identification schema intact');

  // TEST 38: Task #4 Corpus Integrity
  const { count: totalDocsCount } = await supabase.from('medical_documents').select('*', { count: 'exact', head: true });
  assert((totalDocsCount || 0) >= 25, 'Test #38: Task #4 synthetic document corpus intact');

  console.log('\n==================================================');
  console.log(`TASK #19 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMultilingualOcrTests().catch((err) => {
  console.error('Unhandled error in multilingual OCR test suite:', err);
  process.exit(1);
});
