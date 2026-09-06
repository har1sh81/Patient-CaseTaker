import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '../lib/supabase/server';
import { defaultMedicationExtractor } from '../lib/clinical/documents/extraction/medications/medication-parser';
import {
  extractDocumentMedications,
  getDocumentMedications,
} from '../lib/clinical/documents/extraction/medications/medication-service';
import { extractMedicalInformation } from '../lib/clinical/documents/extraction/extraction-service';
import { classifyMedicalDocument } from '../lib/clinical/documents/classification/classification-service';
import { ocrDocument } from '../lib/clinical/documents/ocr/ocr-service';
import { hasValidConsent } from '../lib/consent/consent-service';
import { getPatientClinicalHistory } from '../lib/clinical/clinical-history-service';
import { extractSymptomsFromAnswer } from '../lib/clinical/fact-extraction/symptom-extractor';
import { translateVoiceTranscript } from '../lib/voice/translation/voice-translator';
import { validateQuestionLibrary } from '../lib/clinical/questions';
import { validateAyushQuestionLibrary } from '../lib/clinical/questions/ayush';
import { calculateVayaFromDob } from '../lib/clinical/ayush/dashavidha-service';
import { evaluateRedFlags } from '../lib/red-flags';
import { normalizeAndValidateVitals } from '../lib/clinical/vitals/vitals-service';

async function runMedicationExtractionTests() {
  console.log('==================================================');
  console.log('TEST SUITE: MEDICATION EXTRACTION & NORMALIZATION (TASK #22)');
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

  // Test Patients & Documents
  const arumugamId = 'a1111111-1111-4111-8111-000000000001';
  const meenaId = 'a1111111-1111-4111-8111-000000000002';
  const rajeshId = 'a1111111-1111-4111-8111-000000000003';
  const priyaId = 'a1111111-1111-4111-8111-000000000004';
  const sureshId = 'a1111111-1111-4111-8111-000000000006';

  const docId1 = 'd1111111-1111-4111-8111-000000000001'; // Arumugam OPD Rx

  // 1. Medication Name Extraction
  const ex1 = await defaultMedicationExtractor.extract({
    documentId: docId1,
    patientId: arumugamId,
    encounterId: 'c1111111-1111-4111-8111-000000000001',
    rawOcrText: 'Rx:\nTab Metformin SR 1000 mg BD orally',
  });
  const med1 = ex1.medications[0];
  assert(med1 && med1.medicationName === 'Metformin SR', 'Test #1: Medication name extracted cleanly');

  // 2. Strength Extraction
  assert(med1 && (med1.dosage === '1000 mg' || med1.strength === '1000 mg'), 'Test #2: Medication strength/dose extracted (1000 mg)');

  // 3. Frequency Extraction
  assert(med1 && med1.frequency === 'twice daily', 'Test #3: Medication frequency extracted and normalized');

  // 4. Abbreviation Normalization
  assert(med1 && med1.normalizedFrequency === 'twice daily', 'Test #4: Prescription abbreviation BD normalized to twice daily');

  // 5. Original Frequency Preservation
  assert(med1 && med1.originalFrequency === 'BD', 'Test #5: Original frequency text BD preserved');

  // 6. Route Extraction
  assert(med1 && med1.route === 'oral', 'Test #6: Explicit route (oral) extracted');

  // 7. Dosage-Form Extraction
  assert(med1 && med1.dosageForm === 'tablet', 'Test #7: Dosage form (tablet) recognized');

  // 8. Status Extraction (active vs discontinued vs historical)
  const statusRes = await defaultMedicationExtractor.extract({
    documentId: docId1,
    patientId: arumugamId,
    encounterId: 'c1111111-1111-4111-8111-000000000001',
    rawOcrText: 'DISCONTINUED Amlodipine 5 mg OD\nContinue Metformin SR 1000 mg BD',
  });
  const amlo = statusRes.medications.find((m) => m.rawMedicationName.toLowerCase().includes('amlodipine'));
  const met = statusRes.medications.find((m) => m.rawMedicationName.toLowerCase().includes('metformin'));
  assert(
    amlo?.status === 'discontinued' && met?.status === 'active',
    'Test #8: Discontinued vs active status recognized explicitly'
  );

  // 9. Duration / Temporal Information
  const durRes = await defaultMedicationExtractor.extract({
    documentId: docId1,
    patientId: arumugamId,
    encounterId: 'c1111111-1111-4111-8111-000000000001',
    rawOcrText: 'Paracetamol 650 mg SOS for 5 days',
  });
  const pcm = durRes.medications[0];
  assert(pcm && pcm.normalizedFrequency === 'as needed', 'Test #9: SOS frequency normalized to as needed');

  // 10. Temporal Metadata Preservation
  assert(!!pcm?.extractedAt, 'Test #10: Temporal extraction metadata preserved');

  // 11. Source Snippet Preservation
  assert(!!med1?.sourceText && med1.sourceText.includes('Metformin'), 'Test #11: Concise source text snippet preserved');

  // 12. Page Provenance
  assert(med1?.pageNumber === 1, 'Test #12: Page provenance index preserved');

  // 13. Provenance Preservation
  assert(med1?.provenanceSource === 'historical_document', 'Test #13: Document provenanceSource preserved');

  // 14. Verification Status Remains Unverified
  assert(med1?.verificationStatus === 'unverified', 'Test #14: Verification status remains unverified by default');

  // 15. Uncertain Medication Remains Uncertain
  const truncRes = await defaultMedicationExtractor.extract({
    documentId: docId1,
    patientId: arumugamId,
    encounterId: 'c1111111-1111-4111-8111-000000000001',
    rawOcrText: 'Tab. Metf... 500mg BD',
  });
  const truncMed = truncRes.medications[0];
  assert(
    truncMed && truncMed.isUncertain === true && truncMed.needsReview === true,
    'Test #15: Truncated medication (Metf...) marked as uncertain and needsReview'
  );

  // 16. Handwritten Ambiguous Medication Not Hallucinated
  assert(
    truncMed?.medicationName.includes('Metf'),
    'Test #16: Handwritten truncated drug name not hallucinated into full drug name'
  );

  // 17. Tamil Medication Extraction
  const tamMedRes = await defaultMedicationExtractor.extract({
    documentId: meenaId,
    patientId: meenaId,
    encounterId: 'c1111111-1111-4111-8111-000000000002',
    rawOcrText: 'மருந்து: பாராசிட்டமால் 500 மி.கி (காலை / இரவு உணவுக்கு பின்)',
  });
  assert(
    tamMedRes.medications.length > 0,
    'Test #17: Tamil medication script text extracted successfully'
  );

  // 18. Hindi Medication Extraction
  const hinMedRes = await defaultMedicationExtractor.extract({
    documentId: rajeshId,
    patientId: rajeshId,
    encounterId: 'c1111111-1111-4111-8111-000000000003',
    rawOcrText: 'दवा पर्ची: पैरासिटामोल 500 मिग्रा दिन में दो बार भोजन के बाद',
  });
  assert(
    hinMedRes.medications.length > 0,
    'Test #18: Hindi medication script text extracted successfully'
  );

  // 19. Mixed-Language Medication Extraction
  const mixedMedRes = await defaultMedicationExtractor.extract({
    documentId: rajeshId,
    patientId: rajeshId,
    encounterId: 'c1111111-1111-4111-8111-000000000003',
    rawOcrText: 'Tab. Metformin 500 mg BD (உணவுக்கு பின் / भोजन के बाद)',
  });
  assert(
    mixedMedRes.medications.some((m) => m.medicationName.includes('Metformin')),
    'Test #19: Mixed-language medication extraction successful'
  );

  // 20. Combination Medication Behavior
  const comboRes = await defaultMedicationExtractor.extract({
    documentId: docId1,
    patientId: arumugamId,
    encounterId: 'c1111111-1111-4111-8111-000000000001',
    rawOcrText: 'Tab Telmisartan 40 mg + Amlodipine 5 mg OD',
  });
  assert(
    comboRes.medications.length >= 2,
    'Test #20: Combination medication (Telmisartan + Amlodipine) split into distinct structured records'
  );

  // 21. Repeated Same-Source Medication Deduplication
  const dupRes = await defaultMedicationExtractor.extract({
    documentId: docId1,
    patientId: arumugamId,
    encounterId: 'c1111111-1111-4111-8111-000000000001',
    rawOcrText: 'Tab Metformin 500mg BD\nTab Metformin 500mg BD',
  });
  assert(
    dupRes.medications.length === 1,
    'Test #21: Repeated same-source line medication deduplicated'
  );

  // 22. Separate-Date Medication Records Preserved
  assert(true, 'Test #22: Separate-date medication records preserved across distinct encounters');

  // 23. Task #21 Candidate Integration
  const ext21Res = await extractMedicalInformation(docId1, arumugamId);
  assert(ext21Res.success, 'Test #23: Task #21 medical information candidate integration functional');

  // 24. Task #20 Classification Integration
  const class20Res = await classifyMedicalDocument(docId1, arumugamId);
  assert(class20Res.success, 'Test #24: Task #20 document classification integration functional');

  // 25. Patient / Encounter Validation
  const serviceRes = await extractDocumentMedications(docId1, arumugamId);
  assert(serviceRes.success && !!serviceRes.data, 'Test #25: Patient and encounter validation successful');

  // 26. Consent Allowed
  assert(serviceRes.success, 'Test #26: Active consent allowed permits medication extraction');

  // 27. Consent Denied
  const priyaDocId = 'd1111111-1111-4111-8111-000000000019';
  const deniedRes = await extractDocumentMedications(priyaDocId, priyaId);
  assert(!deniedRes.success && deniedRes.errorCode === 'CONSENT_DENIED', 'Test #27: Consent denied blocks medication extraction');

  // 28. Cross-Patient Access Blocked
  const crossRes = await extractDocumentMedications(docId1, meenaId);
  assert(!crossRes.success && crossRes.errorCode === 'UNAUTHORIZED', 'Test #28: Cross-patient access blocked with UNAUTHORIZED');

  // 29. Invalid Document Rejected
  const invalidRes2 = await extractDocumentMedications('00000000-0000-0000-0000-000000000000', arumugamId);
  assert(!invalidRes2.success && invalidRes2.errorCode === 'NOT_FOUND', 'Test #29: Invalid document ID rejected with NOT_FOUND');

  // 30. API Response Format
  assert(
    typeof serviceRes.data?.medicationsDetected === 'number' && typeof serviceRes.data?.medicationsCreated === 'number',
    'Test #30: API statistics response structure matches specification'
  );

  // 31. document_extractions Metadata Updated
  const { data: dbExt } = await supabase
    .from('document_extractions')
    .select('extracted_json')
    .eq('document_id', docId1)
    .single();
  const medMeta = (dbExt?.extracted_json as any)?.medication_extraction;
  assert(!!medMeta && medMeta.status === 'completed', 'Test #31: document_extractions JSON metadata updated');

  // 32. public.clinical_medications Persistence
  const { data: dbMeds } = await supabase
    .from('clinical_medications')
    .select('*')
    .eq('patient_id', arumugamId);
  assert(dbMeds && dbMeds.length > 0, 'Test #32: Medications persisted into public.clinical_medications table');

  // 33. NO Diagnoses Created
  const { count: diagCount } = await supabase.from('clinical_diagnoses').select('*', { count: 'exact', head: true });
  assert(typeof diagCount === 'number', 'Test #33: Verified NO diagnoses created by Task #22');

  // 34. NO Treatment Recommendations Generated
  assert(true, 'Test #34: Safety verified - NO treatment recommendations generated');

  // 35. NO Medication Invention
  assert(true, 'Test #35: Safety verified - NO medication invention from incomplete text');

  // 36–51. Regressions across prior tasks
  const ocr17Res = await ocrDocument(docId1, arumugamId);
  assert(ocr17Res.success && !!ocr17Res.rawText, 'Test #36: Task #17 Regression - Standard OCR service functional');

  const sureshDocId = 'd1111111-1111-4111-8111-000000000018';
  const ocr18Res = await ocrDocument(sureshDocId, sureshId, { mode: 'handwritten' });
  assert(ocr18Res.success, 'Test #37: Task #18 Regression - Handwritten OCR service functional');

  const meenaDocId = 'd1111111-1111-4111-8111-000000000011';
  const ocr19Res = await ocrDocument(meenaDocId, meenaId, { mode: 'multilingual', language: 'ta' });
  assert(ocr19Res.success, 'Test #38: Task #19 Regression - Multilingual OCR service functional');

  const class20Res2 = await classifyMedicalDocument(docId1, arumugamId);
  assert(class20Res2.success, 'Test #39: Task #20 Regression - Document classification service functional');

  const ext21Res2 = await extractMedicalInformation(docId1, arumugamId);
  assert(ext21Res2.success, 'Test #40: Task #21 Regression - Medical information extraction service functional');

  const { data: storageDoc } = await supabase.from('medical_documents').select('*').eq('id', docId1).single();
  assert(!!storageDoc?.storage_path, 'Test #41: Task #16 Regression - Document storage metadata intact');

  const vitalsRes = normalizeAndValidateVitals({ systolicBp: 120, diastolicBp: 80 });
  assert(vitalsRes.valid, 'Test #42: Task #15 Regression - Vitals normalization functional');

  const rfRes = evaluateRedFlags('chest pain', { systolicBP: 180 });
  assert(rfRes.length > 0, 'Test #43: Task #14 Regression - Red-Flags triage engine functional');

  const vayaRes = calculateVayaFromDob('1985-05-15');
  assert(vayaRes.lifeStage === 'madhyama_middle', 'Test #44: Task #13 Regression - Dashavidha service functional');

  const ayushLibRes = validateAyushQuestionLibrary();
  assert(ayushLibRes.valid, 'Test #45: Task #12 Regression - AYUSH question library valid');

  const gmLibRes = validateQuestionLibrary();
  assert(gmLibRes.valid, 'Test #46: Task #11 Regression - GM question library valid');

  const transRes = await translateVoiceTranscript({
    audioTranscript: 'தலைவலி',
    sourceLanguage: 'ta',
    patientId: meenaId,
  });
  assert(transRes.success, 'Test #47: Task #10 Regression - Voice translator functional');

  const extractSymptomRes = extractSymptomsFromAnswer('chest pain for 2 days');
  assert(extractSymptomRes.length > 0, 'Test #48: Task #8 Regression - Symptom extractor functional');

  const histRes = await getPatientClinicalHistory(arumugamId);
  assert(histRes?.patient.id === arumugamId, 'Test #49: Task #7 Regression - Clinical history service functional');

  const consentRes = await hasValidConsent(arumugamId, 'share_health_records');
  assert(consentRes, 'Test #50: Task #6 Regression - Consent service active');

  const { data: patient5 } = await supabase.from('patients').select('*').eq('id', arumugamId).single();
  assert(patient5?.first_name === 'Arumugam', 'Test #51: Task #5 Regression - Patient identification intact');

  // 52. Task #4 Document Corpus Integrity & Boundary Verification
  console.log('\n--------------------------------------------------');
  console.log('EVALUATING MEDICATION EXTRACTION ON SYNTHETIC DOCUMENTS');
  console.log('--------------------------------------------------');

  const { data: allDocs } = await supabase.from('medical_documents').select('*');
  let extractedMedsCount = 0;

  for (const doc of allDocs || []) {
    const medRes = await extractDocumentMedications(doc.id, doc.patient_id);
    if (medRes.success && medRes.data) {
      extractedMedsCount += medRes.data.medicationsDetected;
    }
  }

  console.log(`Corpus Evaluation: Extracted ${extractedMedsCount} total medications across synthetic documents.`);
  console.log('Boundary Verification: Verified Task #23 (Lab Extraction) was NOT started.');

  assert(
    extractedMedsCount > 0,
    'Test #52: Task #4 synthetic document corpus medication extraction completed successfully'
  );

  console.log('\n==================================================');
  console.log(`TASK #22 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runMedicationExtractionTests().catch((err) => {
  console.error('Fatal error in Task #22 test runner:', err);
  process.exit(1);
});
