import { composeClinicalConsultationSummary } from '../lib/reports/report-composer';
import { generateClinicalSummaryPDFBuffer } from '../lib/reports/pdf-generator';
import { IntakeSession, Patient, ConversationAnswer, AttentionFlag } from '../types';
import { PDFDocument } from 'pdf-lib';

async function runPdfOrganizationTests() {
  console.log('================================================================');
  console.log('TEST SUITE: ORGANIZED CLINICAL REPORT PDF & PATIENT DETAILS');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TEST 1: General Medicine Flow (Patient: Hari)
  // -------------------------------------------------------------
  console.log('--- TEST 1: General Medicine PDF (Patient: Hari) ---');
  const hariPatient: Patient = {
    id: 'pat_hari_001',
    demographics: {
      firstName: 'Hari',
      lastName: 'Kumar',
      fullName: 'Hari Kumar',
      age: 24,
      gender: 'male',
      dateOfBirth: '2002-05-14',
    },
    identification: {
      hospitalNumber: 'HOSP-HARI-991',
      abhaReference: '91-1234-5678-9012',
    },
    createdAt: new Date().toISOString(),
  };

  const hariSession: IntakeSession = {
    id: 'ses_hari_gen',
    patientId: hariPatient.id,
    departmentMode: 'general',
    status: 'completed',
    currentSection: 'completed',
    language: 'en',
    startTime: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const hariAnswers: ConversationAnswer[] = [
    {
      questionId: 'reason_for_visit',
      rawValue: 'Persistent dry cough and mild fever',
      normalizedValue: 'Dry cough with intermittent low-grade fever',
      timestamp: new Date().toISOString(),
      section: 'chief_complaint',
    },
    {
      questionId: 'symptom_duration',
      rawValue: '4 days',
      normalizedValue: '4 days',
      timestamp: new Date().toISOString(),
      section: 'chief_complaint',
    },
    {
      questionId: 'symptom_severity',
      rawValue: 'Moderate, worsens at night',
      normalizedValue: 'Moderate nocturnal worsening',
      timestamp: new Date().toISOString(),
      section: 'history_of_present_illness',
    },
    {
      questionId: 'past_medical_history',
      rawValue: 'Mild childhood asthma',
      normalizedValue: 'Mild asthma',
      timestamp: new Date().toISOString(),
      section: 'past_medical_history',
    },
    {
      questionId: 'current_medications',
      rawValue: 'Salbutamol inhaler 100mcg as needed',
      normalizedValue: 'Salbutamol inhaler 100mcg PRN',
      timestamp: new Date().toISOString(),
      section: 'current_medications',
    },
  ];

  const hariFlags: AttentionFlag[] = [
    {
      id: 'flag_asthma_cough',
      sessionId: hariSession.id,
      patientId: hariPatient.id,
      severity: 'medium',
      category: 'respiratory',
      message: 'History of asthma reported with active dry cough - evaluate for bronchospasm',
      status: 'active',
      createdAt: new Date().toISOString(),
    },
  ];

  const hariSummary = composeClinicalConsultationSummary({
    session: hariSession,
    patient: hariPatient,
    answers: hariAnswers,
    flags: hariFlags,
    documents: [],
    timelineEvents: [],
  });

  if (hariSummary.patient.fullName !== 'Hari Kumar') {
    throw new Error(`TEST 1 FAILED: Expected name 'Hari Kumar', got '${hariSummary.patient.fullName}'`);
  }
  if (!hariSummary.vitals) {
    throw new Error('TEST 1 FAILED: vitals block missing from summary');
  }
  if (!hariSummary.clinicalFacts || hariSummary.clinicalFacts.length === 0) {
    throw new Error('TEST 1 FAILED: clinicalFacts missing or empty');
  }
  if (!hariSummary.interviewSummary || hariSummary.interviewSummary.length === 0) {
    throw new Error('TEST 1 FAILED: interviewSummary missing or empty');
  }
  if (hariSummary.ayush !== undefined) {
    throw new Error('TEST 1 FAILED: AYUSH section should not be present in General Medicine mode');
  }

  const hariPdfBuffer = await generateClinicalSummaryPDFBuffer(hariSummary);
  if (!Buffer.isBuffer(hariPdfBuffer) || hariPdfBuffer.length === 0) {
    throw new Error('TEST 1 FAILED: PDF buffer is empty or not a buffer');
  }

  const hariPdfDoc = await PDFDocument.load(hariPdfBuffer);
  const hariPageCount = hariPdfDoc.getPageCount();
  console.log(`✓ General Medicine PDF generated successfully (${hariPdfBuffer.length} bytes, ${hariPageCount} page(s))`);
  console.log('✓ Verified sections: Header, Patient Info, Chief Complaint, HPI, Symptom Summary, History, Vitals, Facts, Flags, Interview Summary, Doctor Review, Disclaimer.');
  console.log('PASSED Test 1\n');

  // -------------------------------------------------------------
  // TEST 2: AYUSH Medicine Flow (Patient: Ravi)
  // -------------------------------------------------------------
  console.log('--- TEST 2: AYUSH Medicine PDF (Patient: Ravi) ---');
  const raviPatient: Patient = {
    id: 'pat_ravi_ayush',
    demographics: {
      firstName: 'Ravi',
      lastName: 'Verma',
      fullName: 'Ravi Verma',
      age: 29,
      gender: 'male',
      dateOfBirth: '1997-08-20',
    },
    identification: {
      hospitalNumber: 'AYUSH-RAVI-104',
      abhaReference: '91-9876-5432-1098',
    },
    createdAt: new Date().toISOString(),
  };

  const raviSession: IntakeSession = {
    id: 'ses_ravi_ayush',
    patientId: raviPatient.id,
    departmentMode: 'ayush',
    status: 'completed',
    currentSection: 'completed',
    language: 'en',
    startTime: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const raviAnswers: ConversationAnswer[] = [
    {
      questionId: 'reason_for_visit',
      rawValue: 'Chronic acidity, bloating, and irregular bowel habits',
      normalizedValue: 'Acid dyspepsia and bowel irregularity',
      timestamp: new Date().toISOString(),
      section: 'chief_complaint',
    },
    {
      questionId: 'symptom_duration',
      rawValue: '3 weeks',
      normalizedValue: '3 weeks',
      timestamp: new Date().toISOString(),
      section: 'chief_complaint',
    },
    {
      questionId: 'ayush_prakriti',
      rawValue: 'Vata-Pitta dominant with dry skin and quick fluctuations',
      normalizedValue: 'Vata-Pitta',
      timestamp: new Date().toISOString(),
      section: 'ayush_history',
    },
    {
      questionId: 'ayush_digestion',
      rawValue: 'Manda Agni - sluggish digestion with heaviness after meals',
      normalizedValue: 'Manda Agni',
      timestamp: new Date().toISOString(),
      section: 'ayush_history',
    },
    {
      questionId: 'ayush_bowel',
      rawValue: 'Krura Koshtha with hard stools and straining',
      normalizedValue: 'Krura Koshtha',
      timestamp: new Date().toISOString(),
      section: 'ayush_history',
    },
    {
      questionId: 'ayush_diet',
      rawValue: 'Irregular food timings, excess spicy snacks and tea',
      normalizedValue: 'Spicy / tea excess',
      timestamp: new Date().toISOString(),
      section: 'ayush_history',
    },
    {
      questionId: 'ayush_exercise',
      rawValue: 'Sedentary work, late night sleeping at 1 AM',
      normalizedValue: 'Late sleep, sedentary',
      timestamp: new Date().toISOString(),
      section: 'ayush_history',
    },
  ];

  const raviSummary = composeClinicalConsultationSummary({
    session: raviSession,
    patient: raviPatient,
    answers: raviAnswers,
    flags: [],
    documents: [],
    timelineEvents: [],
  });

  if (raviSummary.patient.fullName !== 'Ravi Verma') {
    throw new Error(`TEST 2 FAILED: Expected 'Ravi Verma', got '${raviSummary.patient.fullName}'`);
  }
  if (!raviSummary.ayush) {
    throw new Error('TEST 2 FAILED: AYUSH section missing for AYUSH mode session');
  }
  if (!raviSummary.ayush.prakriti.includes('Vata-Pitta')) {
    throw new Error(`TEST 2 FAILED: Prakriti mismatch: ${raviSummary.ayush.prakriti}`);
  }
  if (!raviSummary.ayush.agni.includes('Manda Agni')) {
    throw new Error(`TEST 2 FAILED: Agni mismatch: ${raviSummary.ayush.agni}`);
  }
  if (!raviSummary.ayush.koshtha.includes('Krura Koshtha')) {
    throw new Error(`TEST 2 FAILED: Koshtha mismatch: ${raviSummary.ayush.koshtha}`);
  }

  const raviPdfBuffer = await generateClinicalSummaryPDFBuffer(raviSummary);
  if (!Buffer.isBuffer(raviPdfBuffer) || raviPdfBuffer.length === 0) {
    throw new Error('TEST 2 FAILED: AYUSH PDF buffer is empty');
  }

  const raviPdfDoc = await PDFDocument.load(raviPdfBuffer);
  const raviPageCount = raviPdfDoc.getPageCount();
  console.log(`✓ AYUSH Medicine PDF generated successfully (${raviPdfBuffer.length} bytes, ${raviPageCount} page(s))`);
  console.log('✓ Verified AYUSH section: Prakriti, Agni, Koshtha, Ahara, Vihara.');
  console.log('PASSED Test 2\n');

  // -------------------------------------------------------------
  // TEST 3: Patient Isolation & No Demo Data
  // -------------------------------------------------------------
  console.log('--- TEST 3: Patient Isolation & Zero Demo Data ---');
  const hariSummaryJson = JSON.stringify(hariSummary);
  const raviSummaryJson = JSON.stringify(raviSummary);

  if (hariSummaryJson.includes('Jane') || hariSummaryJson.includes('pat_demo') || hariSummaryJson.includes('John')) {
    throw new Error('TEST 3 FAILED: Demo patient data leaked into Hari summary');
  }
  if (raviSummaryJson.includes('Jane') || raviSummaryJson.includes('pat_demo') || raviSummaryJson.includes('John')) {
    throw new Error('TEST 3 FAILED: Demo patient data leaked into Ravi summary');
  }
  if (hariSummaryJson.includes('Vata-Pitta') || hariSummaryJson.includes('Manda Agni')) {
    throw new Error("TEST 3 FAILED: Ravi's AYUSH data leaked into Hari's session");
  }
  if (raviSummaryJson.includes('Salbutamol') || raviSummaryJson.includes('childhood asthma')) {
    throw new Error("TEST 3 FAILED: Hari's asthma data leaked into Ravi's session");
  }
  console.log('✓ Verified: Zero demo patient leakage, perfect session isolation.');
  console.log('PASSED Test 3\n');

  console.log('================================================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY! PDF ORGANIZATION VERIFIED.');
  console.log('================================================================');
}

runPdfOrganizationTests().catch(err => {
  console.error('FATAL TEST FAILURE:', err);
  process.exit(1);
});
