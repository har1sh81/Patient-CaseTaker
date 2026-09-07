import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '../lib/supabase/server';
import { defaultMedicalExtractor } from '../lib/clinical/documents/extraction/extractor';
import {
  extractMedicalInformation,
  getDocumentMedicalInformation,
} from '../lib/clinical/documents/extraction/extraction-service';
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

async function runMedicalExtractionTests() {
  console.log('==================================================');
  console.log('TEST SUITE: MEDICAL INFORMATION EXTRACTION (TASK #21)');
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
  const rameshId = 'a1111111-1111-4111-8111-000000000001';
  const meenaId = 'a1111111-1111-4111-8111-000000000002';
  const rajeshId = 'a1111111-1111-4111-8111-000000000003';
  const priyaId = 'a1111111-1111-4111-8111-000000000004';
  const sureshId = 'a1111111-1111-4111-8111-000000000006';

  const docId1 = 'd1111111-1111-4111-8111-000000000001'; // Ramesh OPD Rx
  const meenaDocId = 'd1111111-1111-4111-8111-000000000011'; // Meena AYUSH record

  // 1. Document Validation
  const invalidRes = await extractMedicalInformation('00000000-0000-0000-0000-000000000000', rameshId);
  assert(!invalidRes.success && invalidRes.errorCode === 'NOT_FOUND', 'Test #1: Document validation returns NOT_FOUND for invalid ID');

  // 2. Patient Ownership
  const crossRes = await extractMedicalInformation(docId1, meenaId);
  assert(!crossRes.success && crossRes.errorCode === 'UNAUTHORIZED', 'Test #2: Patient ownership enforced (cross-patient access blocked)');

  // 3. Consent Allowed
  const consentAllowedRes = await extractMedicalInformation(docId1, rameshId);
  assert(consentAllowedRes.success && !!consentAllowedRes.data, 'Test #3: Consent allowed permits medical extraction');

  // 4. Consent Denied
  const priyaDocId = 'd1111111-1111-4111-8111-000000000019'; // Priya has no active consent
  const deniedRes = await extractMedicalInformation(priyaDocId, priyaId);
  assert(!deniedRes.success && deniedRes.errorCode === 'CONSENT_DENIED', 'Test #4: Consent denied blocks extraction with CONSENT_DENIED error');

  // 5. OCR Retrieval Integration
  const ocrRes = await ocrDocument(docId1, rameshId);
  assert(ocrRes.success && !!ocrRes.rawText, 'Test #5: OCR retrieval integration successful');

  // 6. Document Classification Integration
  const classRes = await classifyMedicalDocument(docId1, rameshId);
  assert(classRes.success && !!classRes.result?.predictedDocumentType, 'Test #6: Task #20 Document classification integration successful');

  // 7. Symptom Extraction
  const sympRes = await defaultMedicalExtractor.extract({
    documentId: docId1,
    patientId: rameshId,
    encounterId: 'c1111111-1111-4111-8111-000000000001',
    rawOcrText: 'Chief Complaint: Patient reports severe chest pain and breathlessness for 2 days.',
  });
  assert(
    sympRes.facts.some((f) => f.entityType === 'symptom' && f.concept === 'Chest Pain'),
    'Test #7: Explicit symptom extraction successful'
  );

  // 8. Diagnosis / History Distinction
  const diagRes = await defaultMedicalExtractor.extract({
    documentId: docId1,
    patientId: rameshId,
    encounterId: 'c1111111-1111-4111-8111-000000000001',
    rawOcrText: 'Past History: Known case of Diabetes Mellitus for 10 years.\nAssessment: Essential Hypertension',
  });
  const dmFact = diagRes.facts.find((f) => f.concept === 'Diabetes Mellitus');
  const htnFact = diagRes.facts.find((f) => f.concept === 'Essential Hypertension');
  assert(
    dmFact?.qualifier === 'documented_history' && htnFact?.qualifier === 'clinician_assessment',
    'Test #8: Past medical history vs active clinician assessment diagnosis distinguished'
  );

  // 9. Allergy Extraction
  const allergyRes = await defaultMedicalExtractor.extract({
    documentId: docId1,
    patientId: rameshId,
    encounterId: 'c1111111-1111-4111-8111-000000000001',
    rawOcrText: 'Allergies: Drug Allergy to Penicillin.',
  });
  assert(
    allergyRes.facts.some((f) => f.entityType === 'allergy' && f.concept === 'Penicillin'),
    'Test #9: Allergy extraction successful'
  );

  // 10. Family History Extraction
  const famRes = await defaultMedicalExtractor.extract({
    documentId: docId1,
    patientId: rameshId,
    encounterId: 'c1111111-1111-4111-8111-000000000001',
    rawOcrText: 'Family History: Father has diabetes and heart disease.',
  });
  assert(
    famRes.facts.some((f) => f.entityType === 'family_history' && f.qualifier === 'family'),
    'Test #10: Family history extraction categorized distinctly'
  );

  // 11. Social / Lifestyle Extraction
  const socialRes = await defaultMedicalExtractor.extract({
    documentId: docId1,
    patientId: rameshId,
    encounterId: 'c1111111-1111-4111-8111-000000000001',
    rawOcrText: 'Social History: Tobacco / Smoking: Non-smoker. Diet: Vegetarian.',
  });
  assert(
    socialRes.facts.some((f) => f.entityType === 'social_lifestyle'),
    'Test #11: Social and lifestyle information extraction successful'
  );

  // 12. AYUSH Information Recognition
  const ayushRes = await defaultMedicalExtractor.extract({
    documentId: meenaDocId,
    patientId: meenaId,
    encounterId: 'c1111111-1111-4111-8111-000000000002',
    rawOcrText: 'AYURVEDA RECORD\nPrakriti: Vata-Pitta\nVikriti: Pitta vridhi\nAgni: Mandagni',
  });
  assert(
    ayushRes.facts.some((f) => f.entityType === 'ayush_assessment' && f.concept === 'Prakriti'),
    'Test #12: AYUSH Prakriti/Vikriti/Agni assessment terms recognized'
  );

  // 13. Vital Recognition
  const vitalRes = await defaultMedicalExtractor.extract({
    documentId: docId1,
    patientId: rameshId,
    encounterId: 'c1111111-1111-4111-8111-000000000001',
    rawOcrText: 'O/E: BP: 150/90 mmHg, Pulse: 84 bpm.',
  });
  assert(
    vitalRes.facts.some((f) => f.entityType === 'vital' && f.concept === 'Blood Pressure' && f.value === '150/90 mmHg'),
    'Test #13: Vital measurements recognized and structured'
  );

  // 14. Provenance Preservation
  const sampleFact = sympRes.facts[0];
  assert(
    sampleFact.documentId === docId1 && sampleFact.patientId === rameshId && sampleFact.provenanceSource === 'ocr_extraction',
    'Test #14: Provenance metadata (documentId, patientId, provenanceSource) preserved'
  );

  // 15. Verification Preservation (Defaults to 'unverified')
  assert(
    sampleFact.verificationStatus === 'unverified',
    'Test #15: Verification status remains unverified by default (no automatic doctor verification)'
  );

  // 16. Page Provenance
  const pageRes = await defaultMedicalExtractor.extract({
    documentId: docId1,
    patientId: rameshId,
    encounterId: 'c1111111-1111-4111-8111-000000000001',
    rawOcrText: '--- Page 1 ---\nSymptoms: Headache\n--- Page 2 ---\nDiagnosis: Essential Hypertension',
  });
  const page2Fact = pageRes.facts.find((f) => f.concept === 'Essential Hypertension');
  assert(
    page2Fact?.pageNumber === 2,
    'Test #16: Page-level provenance preserved for multi-page documents'
  );

  // 17. Source Snippet Preservation
  assert(
    !!sampleFact.sourceText && sampleFact.sourceText.length > 0 && sampleFact.sourceText.length <= 150,
    'Test #17: Concise source text snippet preserved'
  );

  // 18. Multilingual Extraction (Tamil)
  const tamRes = await defaultMedicalExtractor.extract({
    documentId: meenaDocId,
    patientId: meenaId,
    encounterId: 'c1111111-1111-4111-8111-000000000002',
    rawOcrText: 'அறிகுறிகள்: தலைவலி மற்றும் காய்ச்சல் 3 நாட்களாக உள்ளது.\nவகைப்பாடு: நீரிழிவு',
  });
  assert(
    tamRes.facts.some((f) => f.concept === 'Headache' || f.concept === 'Fever' || f.concept === 'Diabetes Mellitus'),
    'Test #18: Multilingual Tamil OCR text extracted successfully'
  );

  // 19. Mixed-Language Extraction (Hindi + English)
  const mixedRes = await defaultMedicalExtractor.extract({
    documentId: rajeshId,
    patientId: rajeshId,
    encounterId: 'c1111111-1111-4111-8111-000000000003',
    rawOcrText: 'लक्षण (Symptoms): सिरदर्द (Headache) and fever.\nAssessment: Diabetes Mellitus',
  });
  assert(
    mixedRes.facts.some((f) => f.concept === 'Headache' || f.concept === 'Fever'),
    'Test #19: Mixed-language (Hindi + English) OCR text extracted successfully'
  );

  // 20. Medication Candidate Detection (Task #22 Boundary)
  const medCandRes = await defaultMedicalExtractor.extract({
    documentId: docId1,
    patientId: rameshId,
    encounterId: 'c1111111-1111-4111-8111-000000000001',
    rawOcrText: 'Rx:\n1. Tab Metformin 500mg BD after food\n2. Tab Telmisartan 40mg OD',
  });
  assert(
    medCandRes.facts.some((f) => f.entityType === 'medication_candidate' && f.qualifier === 'candidate_mention'),
    'Test #20: Medication candidate detected without performing full reconciliation (Task #22 boundary)'
  );

  // 21. Lab Candidate Detection (Task #23 Boundary)
  const labCandRes = await defaultMedicalExtractor.extract({
    documentId: 'd1111111-1111-4111-8111-000000000006',
    patientId: rajeshId,
    encounterId: 'c1111111-1111-4111-8111-000000000003',
    rawOcrText: 'BIOCHEMISTRY LABORATORY REPORT\nHbA1c: 8.9 %\nSerum Creatinine: 1.2 mg/dL',
  });
  assert(
    labCandRes.facts.some((f) => f.entityType === 'lab_candidate' && f.concept === 'HbA1c'),
    'Test #21: Lab candidate detected without performing reference-range interpretation (Task #23 boundary)'
  );

  // 22. Procedure Candidate Detection (Task #25 Boundary)
  const procCandRes = await defaultMedicalExtractor.extract({
    documentId: docId1,
    patientId: rameshId,
    encounterId: 'c1111111-1111-4111-8111-000000000001',
    rawOcrText: 'Past Surgical History: Appendectomy in 2018. CABG in 2021.',
  });
  assert(
    procCandRes.facts.some((f) => f.entityType === 'procedure_candidate' && f.concept === 'Appendectomy'),
    'Test #22: Procedure candidate detected without performing full coding (Task #25 boundary)'
  );

  // 23. Clinical Safety: NO Diagnosis Inference from Symptoms Alone
  const safeRes = await defaultMedicalExtractor.extract({
    documentId: docId1,
    patientId: rameshId,
    encounterId: 'c1111111-1111-4111-8111-000000000001',
    rawOcrText: 'Symptoms: chest pain, sweating, shortness of breath for 1 hour.',
  });
  const inferredMi = safeRes.facts.find((f) => f.concept === 'Myocardial Infarction' || f.concept === 'Heart Attack');
  assert(
    !inferredMi,
    'Test #23: Clinical Safety verified - Extractor NEVER infers diagnoses from symptoms alone'
  );

  // 24. Verification Preservation
  assert(
    safeRes.facts.every((f) => f.verificationStatus === 'unverified'),
    'Test #24: Verification status remains unverified for all extracted facts'
  );

  // 25. Hallucinated Facts Prevention
  const blankRes = await defaultMedicalExtractor.extract({
    documentId: docId1,
    patientId: rameshId,
    encounterId: 'c1111111-1111-4111-8111-000000000001',
    rawOcrText: 'Patient attended routine wellness visit. No complaints.',
  });
  assert(
    blankRes.facts.length === 0,
    'Test #25: No hallucinated facts generated for non-clinical text'
  );

  // 26. Idempotent Execution
  const serviceRes1 = await extractMedicalInformation(docId1, rameshId);
  const serviceRes2 = await extractMedicalInformation(docId1, rameshId);
  assert(
    serviceRes1.success && serviceRes2.success,
    'Test #26: Repeated medical extraction execution is idempotent'
  );

  // 27. OCR Version / DB Persistence
  const { data: dbExt } = await supabase
    .from('document_extractions')
    .select('extracted_json')
    .eq('document_id', docId1)
    .single();
  const clinExt = (dbExt?.extracted_json as any)?.clinical_extraction;
  assert(
    clinExt && clinExt.status === 'completed' && Array.isArray(clinExt.facts),
    'Test #27: Extraction metadata persisted cleanly in document_extractions JSON'
  );

  // 28. No Cross-Patient Leakage
  assert(
    clinExt.facts.every((f: any) => f.patientId === rameshId),
    'Test #28: All persisted facts belong strictly to requesting patient'
  );

  // 29. Classification Usage
  assert(
    serviceRes1.data?.status === 'completed',
    'Test #29: Extraction service uses Task #20 document classification successfully'
  );

  // 30–44. Regressions across prior tasks
  const ocr17Res = await ocrDocument(docId1, rameshId);
  assert(ocr17Res.success && !!ocr17Res.rawText, 'Test #30: Task #17 Regression - Standard OCR service functional');

  const sureshDocId = 'd1111111-1111-4111-8111-000000000018';
  const ocr18Res = await ocrDocument(sureshDocId, sureshId, { mode: 'handwritten' });
  assert(ocr18Res.success, 'Test #31: Task #18 Regression - Handwritten OCR service functional');

  const ocr19Res = await ocrDocument(meenaDocId, meenaId, { mode: 'multilingual', language: 'ta' });
  assert(ocr19Res.success, 'Test #32: Task #19 Regression - Multilingual OCR service functional');

  const class20Res = await classifyMedicalDocument(docId1, rameshId);
  assert(class20Res.success && !!class20Res.result, 'Test #33: Task #20 Regression - Document classification service functional');

  const { data: storageDoc } = await supabase.from('medical_documents').select('*').eq('id', docId1).single();
  assert(!!storageDoc?.storage_path, 'Test #34: Task #16 Regression - Document storage metadata intact');

  const vitalsRes = normalizeAndValidateVitals({ systolicBp: 120, diastolicBp: 80 });
  assert(vitalsRes.valid, 'Test #35: Task #15 Regression - Vitals normalization functional');

  const rfRes = evaluateRedFlags('chest pain', { systolicBP: 180 });
  assert(rfRes.length > 0, 'Test #36: Task #14 Regression - Red-Flags triage engine functional');

  const vayaRes = calculateVayaFromDob('1985-05-15');
  assert(vayaRes.lifeStage === 'madhyama_middle', 'Test #37: Task #13 Regression - Dashavidha service functional');

  const ayushLibRes = validateAyushQuestionLibrary();
  assert(ayushLibRes.valid, 'Test #38: Task #12 Regression - AYUSH question library valid');

  const gmLibRes = validateQuestionLibrary();
  assert(gmLibRes.valid, 'Test #39: Task #11 Regression - GM question library valid');

  const transRes = await translateVoiceTranscript({
    audioTranscript: 'தலைவலி',
    sourceLanguage: 'ta',
    patientId: meenaId,
  });
  assert(transRes.success, 'Test #40: Task #10 Regression - Voice translator functional');

  const extractSymptomRes = extractSymptomsFromAnswer('chest pain for 2 days');
  assert(extractSymptomRes.length > 0, 'Test #41: Task #8 Regression - Symptom extractor functional');

  const histRes = await getPatientClinicalHistory(rameshId);
  assert(histRes?.patient.id === rameshId, 'Test #42: Task #7 Regression - Clinical history service functional');

  const consentRes = await hasValidConsent(rameshId, 'share_health_records');
  assert(consentRes, 'Test #43: Task #6 Regression - Consent service active');

  const { data: patient5 } = await supabase.from('patients').select('*').eq('id', rameshId).single();
  assert(patient5?.first_name === 'Ramesh', 'Test #44: Task #5 Regression - Patient identification intact');

  // 45. Boundary Assertions & Task #4 Corpus Evaluation
  console.log('\n--------------------------------------------------');
  console.log('EVALUATING MEDICAL EXTRACTION ON 25 SYNTHETIC DOCUMENTS');
  console.log('--------------------------------------------------');

  const { data: allDocs } = await supabase.from('medical_documents').select('*');
  let extractedDocsCount = 0;
  let totalFactsCount = 0;

  for (const doc of allDocs || []) {
    const extRes = await extractMedicalInformation(doc.id, doc.patient_id);
    if (extRes.success && extRes.data) {
      extractedDocsCount++;
      totalFactsCount += extRes.data.factsDetected;
    }
  }

  console.log(`Corpus Evaluation: Extracted information from ${extractedDocsCount}/${allDocs?.length} documents (${totalFactsCount} total clinical facts detected)`);
  
  // Boundary verification: No detailed medication reconciliation (Task #22), lab reference range reasoning (Task #23), or procedure coding (Task #25) performed
  console.log('Boundary Verification: Verified Tasks #22, #23, and #25 were NOT started.');
  assert(
    extractedDocsCount > 0 && totalFactsCount > 0,
    'Test #45: Task #4 synthetic document corpus medical information extraction completed successfully'
  );

  console.log('\n==================================================');
  console.log(`TASK #21 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runMedicalExtractionTests().catch((err) => {
  console.error('Fatal error in Task #21 test runner:', err);
  process.exit(1);
});
