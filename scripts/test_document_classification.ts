import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '../lib/supabase/server';
import {
  RuleBasedDocumentClassifier,
  defaultClassifier,
} from '../lib/clinical/documents/classification/classifier';
import {
  classifyMedicalDocument,
  getDocumentClassification,
} from '../lib/clinical/documents/classification/classification-service';
import { normalizeDocumentType } from '../lib/clinical/documents/classification/types';
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

async function runDocumentClassificationTests() {
  console.log('==================================================');
  console.log('TEST SUITE: MEDICAL DOCUMENT CLASSIFICATION (TASK #20)');
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

  // Baseline clinical fact counts before Task #20 execution
  const { count: initSymptomCount } = await supabase.from('clinical_symptoms').select('*', { count: 'exact', head: true });
  const { count: initMedCount } = await supabase.from('clinical_medications').select('*', { count: 'exact', head: true });
  const { count: initLabCount } = await supabase.from('clinical_lab_results').select('*', { count: 'exact', head: true });
  const { count: initDiagCount } = await supabase.from('clinical_diagnoses').select('*', { count: 'exact', head: true });
  const { count: initAyushCount } = await supabase.from('clinical_ayush_assessments').select('*', { count: 'exact', head: true });

  // Test Patients
  const rameshId = 'a1111111-1111-4111-8111-000000000001';
  const meenaId = 'a1111111-1111-4111-8111-000000000002';
  const priyaId = 'a1111111-1111-4111-8111-000000000004';
  const sureshId = 'a1111111-1111-4111-8111-000000000006';

  // 1. Prescription Classification
  const rxRes = await defaultClassifier.classify({
    rawOcrText: 'Rx: Tab Metformin 500mg BD after food\nTab Telmisartan 40mg OD morning',
    fileName: 'prescription_note.pdf',
  });
  assert(
    rxRes.predictedDocumentType === 'opd_prescription' && rxRes.confidence >= 0.70,
    'Test #1: OPD Prescription classification executed',
    `got ${rxRes.predictedDocumentType} (${rxRes.confidence})`
  );

  // 2. Laboratory Report Classification
  const labRes = await defaultClassifier.classify({
    rawOcrText: 'BIOCHEMISTRY LABORATORY REPORT\nHbA1c: 8.9 %\nReference Range: < 5.7 %\nSpecimen Date: 2026-08-25',
    fileName: 'lab_hba1c_report.pdf',
  });
  assert(
    labRes.predictedDocumentType === 'laboratory_report' && labRes.confidence >= 0.70,
    'Test #2: Laboratory Report classification executed',
    `got ${labRes.predictedDocumentType} (${labRes.confidence})`
  );

  // 3. Discharge Summary Classification
  const dcRes = await defaultClassifier.classify({
    rawOcrText: 'INPATIENT DISCHARGE SUMMARY\nDate of Admission: 2024-11-15\nDate of Discharge: 2024-11-22\nCourse in Hospital: Patient presented with severe abdominal pain.',
    fileName: 'discharge_summary.pdf',
  });
  assert(
    dcRes.predictedDocumentType === 'discharge_summary' && dcRes.confidence >= 0.70,
    'Test #3: Discharge Summary classification executed',
    `got ${dcRes.predictedDocumentType} (${dcRes.confidence})`
  );

  // 4. Imaging / ECG Classification
  const imgRes = await defaultClassifier.classify({
    rawOcrText: 'RADIOLOGY ULTRASOUND REPORT\nFindings: Fatty liver grade 1. Gallbladder normal.\nImpression: Mild hepatic steatosis.',
    fileName: 'usg_abdomen.pdf',
  });
  assert(
    imgRes.predictedDocumentType === 'imaging_report' && imgRes.confidence >= 0.70,
    'Test #4: Imaging / Ultrasound classification executed',
    `got ${imgRes.predictedDocumentType} (${imgRes.confidence})`
  );

  // 5. Consultation Note Classification
  const noteRes = await defaultClassifier.classify({
    rawOcrText: 'OUTPATIENT CLINICAL CONSULTATION NOTE\nChief Complaint: Headache and fever for 3 days.\nO/E: BP 120/80 mmHg.\nAssessment & Plan: Viral fever. Rest and hydration.',
    fileName: 'consultation_note.pdf',
  });
  assert(
    noteRes.predictedDocumentType === 'consultation_note' && noteRes.confidence >= 0.70,
    'Test #5: Consultation Note classification executed',
    `got ${noteRes.predictedDocumentType} (${noteRes.confidence})`
  );

  // 6. AYUSH Record Classification
  const ayushRes = await defaultClassifier.classify({
    rawOcrText: 'AYURVEDA DASH AVIDHA PARIKSHA RECORD\nPrakriti: Vata-Pitta\nVikriti: Pitta vridhi\nAgni: Mandagni\nKoshtha: Krura',
    fileName: 'meena_ayurveda_consultation.pdf',
  });
  assert(
    ayushRes.predictedDocumentType === 'ayush_record' && ayushRes.confidence >= 0.70,
    'Test #6: AYUSH Record classification executed',
    `got ${ayushRes.predictedDocumentType} (${ayushRes.confidence})`
  );

  // 7. Referral Classification
  const refRes = await defaultClassifier.classify({
    rawOcrText: 'PATIENT REFERRAL LETTER\nReferred To: Gastroenterology Department\nReason for Referral: Evaluation of chronic abdominal pain.',
    fileName: 'gastro_referral.pdf',
  });
  assert(
    refRes.predictedDocumentType === 'referral_note' && refRes.confidence >= 0.70,
    'Test #7: Referral Note classification executed',
    `got ${refRes.predictedDocumentType} (${refRes.confidence})`
  );

  // 8. Pediatric Record Classification
  const pedRes = await defaultClassifier.classify({
    rawOcrText: 'PEDIATRIC GROWTH CARD AND IMMUNIZATION RECORD\nWeight Percentile: 50th\nHeight Percentile: 60th\nVaccination: DPT booster given.',
    fileName: 'pediatric_growth_card.pdf',
  });
  assert(
    pedRes.predictedDocumentType === 'pediatric_record' && pedRes.confidence >= 0.70,
    'Test #8: Pediatric Record classification executed',
    `got ${pedRes.predictedDocumentType} (${pedRes.confidence})`
  );

  // 9. Low Evidence / "other" Behavior
  const lowEvRes = await defaultClassifier.classify({
    rawOcrText: 'Generic blank text without medical terminology or structure.',
    fileName: 'unknown_document.txt',
  });
  assert(
    lowEvRes.predictedDocumentType === 'other' && lowEvRes.needsReview === true,
    'Test #9: Low-evidence text classified as "other" with needsReview flag',
    `got ${lowEvRes.predictedDocumentType}`
  );

  // 10. Multilingual English Document Classification
  const mulEngRes = await defaultClassifier.classify({
    rawOcrText: 'APOLLO CLINICAL CONSULTATION NOTE\nPatient Name: Rajesh Kumar\nDiagnosis: Essential Hypertension',
    fileName: 'rajesh_note.pdf',
  });
  assert(
    mulEngRes.predictedDocumentType === 'consultation_note',
    'Test #10: Multilingual English document classified correctly'
  );

  // 11. Tamil Document Classification
  const tamRes = await defaultClassifier.classify({
    rawOcrText: 'மருத்துவர் ஆலோசனை குறிப்பு\nநோயாளி பெயர்: மீனா சுந்தரம்\nஅறிகுறிகள்: தலைவலி மற்றும் காய்ச்சல் 3 நாட்களாக உள்ளது.',
    fileName: 'meena_tamil_consult.pdf',
  });
  assert(
    tamRes.predictedDocumentType === 'consultation_note' || tamRes.predictedDocumentType === 'ayush_record',
    'Test #11: Tamil document script classified correctly',
    `got ${tamRes.predictedDocumentType}`
  );

  // 12. Hindi Document Classification
  const hinRes = await defaultClassifier.classify({
    rawOcrText: 'चिकित्सक परामर्श रिपोर्ट\nरोगी नाम: राजेश कुमार शर्मा\nलक्षण: 4 दिनों से लगातार सिरदर्द और हल्का बुखार।',
    fileName: 'rajesh_hindi_consult.pdf',
  });
  assert(
    hinRes.predictedDocumentType === 'consultation_note',
    'Test #12: Hindi document script classified correctly',
    `got ${hinRes.predictedDocumentType}`
  );

  // 13. Mixed-Language Document Classification
  const mixedRes = await defaultClassifier.classify({
    rawOcrText: 'APOLLO CLINICAL CONSULTATION NOTE / ராஜேஷ் குமார்\nदवा पर्ची (Prescription):\n1. Tab. Metformin 500 mg BD (உணவுக்கு பின் / भोजन के बाद)',
    fileName: 'mixed_rx.pdf',
  });
  assert(
    mixedRes.predictedDocumentType === 'opd_prescription',
    'Test #13: Mixed-language document script classified correctly'
  );

  // 14. Handwritten Prescription Classification
  const handwrittenClassRes = await defaultClassifier.classify({
    rawOcrText: 'Rx Tab Metf 500mg BD Tab Telmi 40mg OD',
    fileName: 'suresh_handwritten_prescription.png',
  });
  assert(
    handwrittenClassRes.predictedDocumentType === 'opd_prescription',
    'Test #14: Handwritten prescription OCR text classified correctly'
  );

  // 15. OCR Missing Behavior
  const noTextRes = await defaultClassifier.classify({
    rawOcrText: '',
    fileName: 'rajesh_prescription_2026.pdf',
  });
  assert(
    noTextRes.predictedDocumentType === 'opd_prescription',
    'Test #15: OCR missing behavior fallbacks to filename/metadata classification'
  );

  // 16. Document Metadata Fallback Evidence
  assert(
    noTextRes.evidence.some((e) => e.includes('metadata_filename')),
    'Test #16: Document metadata fallback recorded in evidence list'
  );

  // 17. Prediction Confidence & Evidence
  assert(
    rxRes.confidence > 0.50 && rxRes.evidence.length > 0,
    'Test #17: Genuine prediction confidence score and evidence array returned'
  );

  // 18. Classifier Method Recorded
  assert(
    rxRes.method === 'rule_based',
    'Test #18: Classification method recorded as "rule_based"'
  );

  // 19. Classifier Version Recorded
  assert(
    rxRes.classifierVersion === '1.0.0',
    'Test #19: Classifier version recorded as "1.0.0"'
  );

  // 20. Manual / Trusted document_type Not Overwritten in DB
  const docId1 = 'd1111111-1111-4111-8111-000000000001'; // Ramesh OPD Prescription
  const classifyServiceRes = await classifyMedicalDocument(docId1, rameshId);
  const { data: dbDoc } = await supabase
    .from('medical_documents')
    .select('document_type')
    .eq('id', docId1)
    .single();

  assert(
    dbDoc?.document_type === 'opd_prescription',
    'Test #20: Manual trusted document_type in public.medical_documents remains unchanged'
  );

  // 21. Predicted Type Stored Separately in document_extractions
  const { data: dbExt } = await supabase
    .from('document_extractions')
    .select('extracted_json')
    .eq('document_id', docId1)
    .single();

  const storedClass = (dbExt?.extracted_json as any)?.classification;
  assert(
    storedClass && storedClass.predicted_document_type === 'opd_prescription',
    'Test #21: Predicted document type stored separately in document_extractions JSON'
  );

  // 22. Consent Allowed
  const rameshDoc2 = 'd1111111-1111-4111-8111-000000000002';
  const consentAllowedRes = await classifyMedicalDocument(rameshDoc2, rameshId);
  assert(
    consentAllowedRes.success && consentAllowedRes.result?.predictedDocumentType === 'laboratory_report',
    'Test #22: Consent allowed permits document classification'
  );

  // 23. Consent Denied Blocks Classification
  const priyaDocId = 'd1111111-1111-4111-8111-000000000019'; // Priya Ramanathan has no active consent
  const deniedClassRes = await classifyMedicalDocument(priyaDocId, priyaId);
  assert(
    !deniedClassRes.success && deniedClassRes.errorCode === 'CONSENT_DENIED',
    'Test #23: Consent denied blocks classification with CONSENT_DENIED error'
  );

  // 24. Cross-Patient Access Blocked
  const crossRes = await classifyMedicalDocument(docId1, meenaId); // Ramesh doc requested by Meena
  assert(
    !crossRes.success && crossRes.errorCode === 'UNAUTHORIZED',
    'Test #24: Cross-patient document classification access blocked with UNAUTHORIZED error'
  );

  // 25. Invalid Document Handling
  const invalidRes = await classifyMedicalDocument('00000000-0000-0000-0000-000000000000', rameshId);
  assert(
    !invalidRes.success && invalidRes.errorCode === 'NOT_FOUND',
    'Test #25: Invalid document ID returns NOT_FOUND error'
  );

  // 26–30. Verify ZERO New Clinical Facts Created in Database by Task #20
  const { count: finalSymptomCount } = await supabase.from('clinical_symptoms').select('*', { count: 'exact', head: true });
  assert(finalSymptomCount === initSymptomCount, 'Test #26: Verified NO new clinical_symptoms facts created');

  const { count: finalMedCount } = await supabase.from('clinical_medications').select('*', { count: 'exact', head: true });
  assert(finalMedCount === initMedCount, 'Test #27: Verified NO new clinical_medications facts created');

  const { count: finalLabCount } = await supabase.from('clinical_lab_results').select('*', { count: 'exact', head: true });
  assert(finalLabCount === initLabCount, 'Test #28: Verified NO new clinical_lab_results facts created');

  const { count: finalDiagCount } = await supabase.from('clinical_diagnoses').select('*', { count: 'exact', head: true });
  assert(finalDiagCount === initDiagCount, 'Test #29: Verified NO new clinical_diagnoses facts created');

  const { count: finalAyushCount } = await supabase.from('clinical_ayush_assessments').select('*', { count: 'exact', head: true });
  assert(finalAyushCount === initAyushCount, 'Test #30: Verified NO new clinical_ayush_assessments facts created');

  // 31–44. Regressions across prior tasks
  // Task #17 Regression: Standard OCR
  const ocr17Res = await ocrDocument(docId1, rameshId);
  assert(ocr17Res.success && !!ocr17Res.rawText, 'Test #31: Task #17 Regression - Standard OCR service functional');

  // Task #18 Regression: Handwritten OCR
  const sureshDocId = 'd1111111-1111-4111-8111-000000000018';
  const ocr18Res = await ocrDocument(sureshDocId, sureshId, { mode: 'handwritten' });
  assert(ocr18Res.success, 'Test #32: Task #18 Regression - Handwritten OCR service functional');

  // Task #19 Regression: Multilingual OCR
  const meenaDocId = 'd1111111-1111-4111-8111-000000000011';
  const ocr19Res = await ocrDocument(meenaDocId, meenaId, { mode: 'multilingual', language: 'ta' });
  assert(ocr19Res.success, 'Test #33: Task #19 Regression - Multilingual OCR service functional');

  // Task #16 Regression: Storage service
  const { data: storageDoc } = await supabase.from('medical_documents').select('*').eq('id', docId1).single();
  assert(!!storageDoc?.storage_path, 'Test #34: Task #16 Regression - Document storage metadata intact');

  // Task #15 Regression: Vitals normalization
  const vitalsRes = normalizeAndValidateVitals({ systolicBp: 120, diastolicBp: 80 });
  assert(vitalsRes.valid, 'Test #35: Task #15 Regression - Vitals normalization functional');

  // Task #14 Regression: Red-Flags engine
  const rfRes = evaluateRedFlags('chest pain', { systolicBP: 180 });
  assert(rfRes.length > 0, 'Test #36: Task #14 Regression - Red-Flags triage engine functional');

  // Task #13 Regression: Dashavidha service
  const vayaRes = calculateVayaFromDob('1985-05-15');
  assert(vayaRes.lifeStage === 'madhyama_middle', 'Test #37: Task #13 Regression - Dashavidha service functional');

  // Task #12 Regression: AYUSH Question library
  const ayushLibRes = validateAyushQuestionLibrary();
  assert(ayushLibRes.valid, 'Test #38: Task #12 Regression - AYUSH question library valid');

  // Task #11 Regression: GM Question library
  const gmLibRes = validateQuestionLibrary();
  assert(gmLibRes.valid, 'Test #39: Task #11 Regression - GM question library valid');

  // Task #10 Regression: Voice translator
  const transRes = await translateVoiceTranscript({
    audioTranscript: 'தலைவலி',
    sourceLanguage: 'ta',
    patientId: meenaId,
  });
  assert(transRes.success, 'Test #40: Task #10 Regression - Voice translator functional');

  // Task #8 Regression: Symptom extractor
  const sympRes = extractSymptomsFromAnswer('chest pain for 2 days');
  assert(sympRes.length > 0, 'Test #41: Task #8 Regression - Symptom extractor functional');

  // Task #7 Regression: Clinical history service
  const histRes = await getPatientClinicalHistory(rameshId);
  assert(histRes?.patient.id === rameshId, 'Test #42: Task #7 Regression - Clinical history service functional');

  // Task #6 Regression: Consent service
  const consentRes = await hasValidConsent(rameshId, 'share_health_records');
  assert(consentRes, 'Test #43: Task #6 Regression - Consent service active');

  // Task #5 Regression: Patient lookup
  const { data: patient5 } = await supabase.from('patients').select('*').eq('id', rameshId).single();
  assert(patient5?.first_name === 'Ramesh', 'Test #44: Task #5 Regression - Patient identification intact');

  // 45. Task #4 Synthetic Corpus Integrity & Classification Accuracy Evaluation over 25 synthetic documents
  console.log('\n--------------------------------------------------');
  console.log('EVALUATING CLASSIFIER ACCURACY ON 25 SYNTHETIC DOCUMENTS');
  console.log('--------------------------------------------------');

  const { data: allDocs } = await supabase.from('medical_documents').select('*');
  let correctCount = 0;
  let totalCount = allDocs?.length || 0;
  let confusionCases: string[] = [];

  for (const doc of allDocs || []) {
    const classRes = await classifyMedicalDocument(doc.id, doc.patient_id);
    const predicted = classRes.result?.predictedDocumentType || 'other';
    const manual = normalizeDocumentType(doc.document_type);

    if (predicted === manual) {
      correctCount++;
    } else {
      confusionCases.push(
        `Doc: ${doc.file_name} | Manual: ${doc.document_type} (${manual}) | Predicted: ${predicted}`
      );
    }
  }

  const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
  console.log(`Corpus Evaluation: ${correctCount}/${totalCount} documents correctly classified (${accuracy.toFixed(1)}%)`);

  if (confusionCases.length > 0) {
    console.log('Confusion Cases:');
    confusionCases.forEach((c) => console.log(`  - ${c}`));
  }

  assert(
    accuracy >= 80.0,
    `Test #45: Task #4 synthetic document corpus classifier accuracy >= 80% (Actual: ${accuracy.toFixed(1)}%)`
  );

  console.log('\n==================================================');
  console.log(`TASK #20 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runDocumentClassificationTests().catch((err) => {
  console.error('Fatal error in Task #20 test runner:', err);
  process.exit(1);
});
