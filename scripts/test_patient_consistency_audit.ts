import { db } from '../lib/supabase/db-service';
import { composeClinicalConsultationSummary } from '../lib/reports/report-composer';
import { generateClinicalSummaryPDFBuffer } from '../lib/reports/pdf-generator';
import { Patient, IntakeSession, ConversationAnswer } from '../types';

async function runPatientConsistencyAudit() {
  console.log('===============================================================');
  console.log('PATIENT DATA CONSISTENCY & IDENTITY AUDIT');
  console.log('===============================================================\n');

  // ==============================================================
  // TEST 1 — GENERAL MEDICINE WORKFLOW (Patient: Hari)
  // ==============================================================
  console.log('--- TEST 1: GENERAL MEDICINE FLOW (Patient: Hari) ---');

  const hariId = '11111111-2222-3333-4444-555555555555';
  const hariPatient: Patient = {
    id: hariId,
    identification: {
      hospitalNumber: 'HSP-HARI-001',
      mobileNumber: '+919876543210',
    },
    demographics: {
      firstName: 'Hari',
      lastName: 'Kumar',
      fullName: 'Hari Kumar',
      age: 42,
      gender: 'male',
      dateOfBirth: '1984-06-15',
    },
    createdAt: new Date().toISOString(),
  };

  // 1. Create Patient
  const createdHari = await db.createPatient(hariPatient);
  console.log(`✓ 1. Patient record created: id=${createdHari.id}, name=${createdHari.demographics.fullName}`);
  if (createdHari.demographics.fullName !== 'Hari Kumar') {
    throw new Error(`Expected name 'Hari Kumar', got '${createdHari.demographics.fullName}'`);
  }

  // 2. Create General Medicine Session
  const hariSessionId = `ses_hari_${Date.now()}`;
  const hariSession: IntakeSession = {
    id: hariSessionId,
    patientId: createdHari.id,
    status: 'active',
    language: 'en',
    departmentMode: 'standard',
    startedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60000).toISOString(),
    currentStep: 'interview',
    progress: {
      completedSections: ['consent'],
      pendingSections: ['interview', 'documents', 'review'],
      percentage: 20,
    },
    cleanupStatus: { temporaryDataDeleted: false },
  };

  const createdHariSession = await db.createSession(hariSession);
  console.log(`✓ 2. Session created: id=${createdHariSession.id}, patientId=${createdHariSession.patientId}, mode=${createdHariSession.departmentMode}`);
  if (createdHariSession.patientId !== hariId) {
    throw new Error(`Session patientId mismatch! Expected ${hariId}, got ${createdHariSession.patientId}`);
  }

  // 3. Save Interview Answers for Hari
  const hariAnswers: ConversationAnswer[] = [
    {
      id: `ans_hari_1`,
      sessionId: hariSessionId,
      questionId: 'reason_for_visit',
      section: 'chief_complaint',
      rawValue: 'Severe headache and fever for 2 days',
      normalizedValue: 'Severe headache and fever for 2 days',
      inputMethod: 'voice',
      provenance: { source: 'patient_voice', confidence: 'high' },
      editedByPatient: false,
      answeredAt: new Date().toISOString(),
    },
    {
      id: `ans_hari_2`,
      sessionId: hariSessionId,
      questionId: 'symptom_duration',
      section: 'hpi',
      rawValue: '2 days',
      normalizedValue: '2 days',
      inputMethod: 'touch',
      provenance: { source: 'patient_touch', confidence: 'high' },
      editedByPatient: false,
      answeredAt: new Date().toISOString(),
    },
    {
      id: `ans_hari_3`,
      sessionId: hariSessionId,
      questionId: 'past_medical_history',
      section: 'past_medical_history',
      rawValue: 'Hypertension',
      normalizedValue: 'Hypertension',
      inputMethod: 'touch',
      provenance: { source: 'patient_touch', confidence: 'high' },
      editedByPatient: false,
      answeredAt: new Date().toISOString(),
    },
  ];

  for (const ans of hariAnswers) {
    await db.saveAnswer(ans);
  }
  const retrievedHariAnswers = await db.getSessionAnswers(hariSessionId);
  console.log(`✓ 3. Answers saved and retrieved: count=${retrievedHariAnswers.length}`);

  // 4. Compose Clinical Consultation Summary
  const hariSummary = composeClinicalConsultationSummary({
    session: createdHariSession,
    patient: createdHari,
    answers: retrievedHariAnswers,
  });

  console.log(`✓ 4. Clinical summary composed for patient: ${hariSummary.patient.fullName}`);
  if (hariSummary.patient.fullName !== 'Hari Kumar') {
    throw new Error(`Summary patient name mismatch! Expected 'Hari Kumar', got '${hariSummary.patient.fullName}'`);
  }
  if (hariSummary.visit.departmentMode !== 'standard') {
    throw new Error(`Summary department mismatch! Expected 'standard', got '${hariSummary.visit.departmentMode}'`);
  }

  // 5. Generate PDF Buffer for Hari
  const hariPdf = await generateClinicalSummaryPDFBuffer(hariSummary);
  console.log(`✓ 5. PDF snapshot generated: bytes=${hariPdf.length}`);

  // 6. Save Clinical Report for Hari
  const hariReport = {
    reportId: `rep_${hariSessionId}`,
    reportVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    sessionId: hariSessionId,
    patient: {
      fullName: createdHari.demographics.fullName,
      age: createdHari.demographics.age,
      gender: createdHari.demographics.gender,
      hospitalNumber: createdHari.identification?.hospitalNumber,
    },
    visit: {
      generatedDate: new Date().toISOString().split('T')[0],
      departmentMode: 'standard' as const,
      intakeLanguage: 'en',
      reasonForVisit: hariSummary.chiefComplaint.primaryComplaint,
    },
    clinicalHistory: {
      chiefComplaint: {
        primaryComplaint: hariSummary.chiefComplaint.primaryComplaint,
        additionalComplaints: [],
        provenance: { source: 'patient_voice' },
      },
      historyOfPresentIllness: {
        patientNarrative: hariSummary.chiefComplaint.patientWords || hariSummary.chiefComplaint.primaryComplaint,
        completeness: { missingFields: [], completedFields: ['primaryComplaint'] },
      },
      pastMedicalHistory: [{ id: 'pmh_1', conditionName: 'Hypertension', status: 'active' as const, provenance: { source: 'patient_voice' } }],
      pastSurgicalHistory: [],
      medications: [],
      allergies: [],
      familyHistory: [],
    },
    documentSummary: { uploadedDocumentCount: 0, documents: [], extractedConditions: [], laboratoryResults: [], admissions: [] },
    medicalTimeline: [],
    attentionFlags: [],
    patientConfirmation: { confirmedByPatient: true, correctionsMade: 0 },
    physicianVerification: { status: 'pending_physician_review' as const, signatureRequired: true },
    reference: { referenceNumber: `MK-HARI-01`, qrPayload: hariSessionId, generatedAt: new Date().toISOString() },
  };

  await db.saveReport(hariReport);
  await db.updateSession(hariSessionId, { status: 'sent_to_doctor' });
  console.log(`✓ 6. Case sent to doctor queue`);

  // ==============================================================
  // TEST 2 — AYUSH MEDICINE WORKFLOW (Patient: Ravi)
  // ==============================================================
  console.log('\n--- TEST 2: AYUSH MEDICINE FLOW (Patient: Ravi) ---');

  const raviId = '22222222-3333-4444-5555-666666666666';
  const raviPatient: Patient = {
    id: raviId,
    identification: {
      hospitalNumber: 'HSP-RAVI-002',
      abhaReference: 'RAVI@ABDM-002',
      mobileNumber: '+919876543211',
    },
    demographics: {
      firstName: 'Ravi',
      lastName: 'Varma',
      fullName: 'Ravi Varma',
      age: 38,
      gender: 'male',
      dateOfBirth: '1988-03-22',
    },
    createdAt: new Date().toISOString(),
  };

  // 1. Create Patient Ravi
  const createdRavi = await db.createPatient(raviPatient);
  console.log(`✓ 1. AYUSH Patient record created: id=${createdRavi.id}, name=${createdRavi.demographics.fullName}`);
  if (createdRavi.demographics.fullName !== 'Ravi Varma') {
    throw new Error(`Expected name 'Ravi Varma', got '${createdRavi.demographics.fullName}'`);
  }

  // 2. Create AYUSH Session
  const raviSessionId = `ses_ravi_${Date.now()}`;
  const raviSession: IntakeSession = {
    id: raviSessionId,
    patientId: createdRavi.id,
    status: 'active',
    language: 'en',
    departmentMode: 'ayush',
    startedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60000).toISOString(),
    currentStep: 'interview',
    progress: {
      completedSections: ['consent'],
      pendingSections: ['interview', 'documents', 'review'],
      percentage: 20,
    },
    cleanupStatus: { temporaryDataDeleted: false },
  };

  const createdRaviSession = await db.createSession(raviSession);
  console.log(`✓ 2. AYUSH Session created: id=${createdRaviSession.id}, patientId=${createdRaviSession.patientId}, mode=${createdRaviSession.departmentMode}`);
  if (createdRaviSession.departmentMode !== 'ayush') {
    throw new Error(`Expected departmentMode 'ayush', got '${createdRaviSession.departmentMode}'`);
  }

  // 3. Save AYUSH-specific answers
  const raviAnswers: ConversationAnswer[] = [
    {
      id: `ans_ravi_1`,
      sessionId: raviSessionId,
      questionId: 'reason_for_visit',
      section: 'chief_complaint',
      rawValue: 'Chronic indigestion and joint stiffness (Amavata)',
      normalizedValue: 'Chronic indigestion and joint stiffness (Amavata)',
      inputMethod: 'voice',
      provenance: { source: 'patient_voice', confidence: 'high' },
      editedByPatient: false,
      answeredAt: new Date().toISOString(),
    },
    {
      id: `ans_ravi_2`,
      sessionId: raviSessionId,
      questionId: 'ayush_prakriti',
      section: 'ayush',
      rawValue: 'Vata-Pitta',
      normalizedValue: 'Vata-Pitta',
      inputMethod: 'touch',
      provenance: { source: 'patient_touch', confidence: 'high' },
      editedByPatient: false,
      answeredAt: new Date().toISOString(),
    },
    {
      id: `ans_ravi_3`,
      sessionId: raviSessionId,
      questionId: 'ayush_agni',
      section: 'ayush',
      rawValue: 'Mandagni (Low digestive fire)',
      normalizedValue: 'Mandagni',
      inputMethod: 'touch',
      provenance: { source: 'patient_touch', confidence: 'high' },
      editedByPatient: false,
      answeredAt: new Date().toISOString(),
    },
  ];

  for (const ans of raviAnswers) {
    await db.saveAnswer(ans);
  }
  const retrievedRaviAnswers = await db.getSessionAnswers(raviSessionId);
  console.log(`✓ 3. AYUSH answers saved and retrieved: count=${retrievedRaviAnswers.length}`);

  // 4. Compose AYUSH Consultation Summary
  const raviSummary = composeClinicalConsultationSummary({
    session: createdRaviSession,
    patient: createdRavi,
    answers: retrievedRaviAnswers,
  });

  console.log(`✓ 4. AYUSH summary composed for patient: ${raviSummary.patient.fullName}`);
  if (raviSummary.patient.fullName !== 'Ravi Varma') {
    throw new Error(`Summary patient name mismatch! Expected 'Ravi Varma', got '${raviSummary.patient.fullName}'`);
  }
  if (raviSummary.visit.departmentMode !== 'ayush') {
    throw new Error(`Summary department mismatch! Expected 'ayush', got '${raviSummary.visit.departmentMode}'`);
  }
  if (!raviSummary.ayush) {
    throw new Error(`Expected AYUSH section in summary, but it was missing!`);
  }
  console.log(`✓ 4b. AYUSH assessment data verified: Prakriti=${raviSummary.ayush.prakriti}, Agni=${raviSummary.ayush.agni}`);

  // 5. Generate PDF Buffer for Ravi
  const raviPdf = await generateClinicalSummaryPDFBuffer(raviSummary);
  console.log(`✓ 5. AYUSH PDF snapshot generated: bytes=${raviPdf.length}`);

  // 6. Save Clinical Report for Ravi
  const raviReport = {
    reportId: `rep_${raviSessionId}`,
    reportVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    sessionId: raviSessionId,
    patient: {
      fullName: createdRavi.demographics.fullName,
      age: createdRavi.demographics.age,
      gender: createdRavi.demographics.gender,
      hospitalNumber: createdRavi.identification?.hospitalNumber,
    },
    visit: {
      generatedDate: new Date().toISOString().split('T')[0],
      departmentMode: 'ayush' as const,
      intakeLanguage: 'en',
      reasonForVisit: raviSummary.chiefComplaint.primaryComplaint,
    },
    clinicalHistory: {
      chiefComplaint: {
        primaryComplaint: raviSummary.chiefComplaint.primaryComplaint,
        additionalComplaints: [],
        provenance: { source: 'patient_voice' },
      },
      historyOfPresentIllness: {
        patientNarrative: raviSummary.chiefComplaint.patientWords || raviSummary.chiefComplaint.primaryComplaint,
        completeness: { missingFields: [], completedFields: ['primaryComplaint'] },
      },
      pastMedicalHistory: [],
      pastSurgicalHistory: [],
      medications: [],
      allergies: [],
      familyHistory: [],
    },
    documentSummary: { uploadedDocumentCount: 0, documents: [], extractedConditions: [], laboratoryResults: [], admissions: [] },
    medicalTimeline: [],
    attentionFlags: [],
    patientConfirmation: { confirmedByPatient: true, correctionsMade: 0 },
    physicianVerification: { status: 'pending_physician_review' as const, signatureRequired: true },
    reference: { referenceNumber: `MK-RAVI-02`, qrPayload: raviSessionId, generatedAt: new Date().toISOString() },
  };

  await db.saveReport(raviReport);
  await db.updateSession(raviSessionId, { status: 'sent_to_doctor' });
  console.log(`✓ 6. AYUSH Case sent to doctor queue`);

  // ==============================================================
  // TEST 3 — DATA ISOLATION & DOCTOR QUEUE VERIFICATION
  // ==============================================================
  console.log('\n--- TEST 3: ISOLATION & DOCTOR QUEUE AUDIT ---');

  const doctorSessions = await db.getSessionsByStatus('sent_to_doctor');
  const hariQueueItem = doctorSessions.find(s => s.id === hariSessionId);
  const raviQueueItem = doctorSessions.find(s => s.id === raviSessionId);

  if (!hariQueueItem || !raviQueueItem) {
    throw new Error('Both cases should be present in doctor queue');
  }

  const hariPatientInDb = await db.getPatient(hariQueueItem.patientId);
  const raviPatientInDb = await db.getPatient(raviQueueItem.patientId);

  console.log(`✓ Doctor Queue - Hari: Name=${hariPatientInDb?.demographics.fullName}, Mode=${hariQueueItem.departmentMode}`);
  console.log(`✓ Doctor Queue - Ravi: Name=${raviPatientInDb?.demographics.fullName}, Mode=${raviQueueItem.departmentMode}`);

  if (hariPatientInDb?.demographics.fullName !== 'Hari Kumar') {
    throw new Error(`Hari name mismatch in doctor queue! Got: ${hariPatientInDb?.demographics.fullName}`);
  }
  if (raviPatientInDb?.demographics.fullName !== 'Ravi Varma') {
    throw new Error(`Ravi name mismatch in doctor queue! Got: ${raviPatientInDb?.demographics.fullName}`);
  }

  // Verify no Jane Doe in either session
  if (hariPatientInDb?.demographics.fullName.includes('Jane') || raviPatientInDb?.demographics.fullName.includes('Jane')) {
    throw new Error('FATAL: Jane Doe detected in active user sessions!');
  }

  // Verify isolation
  if (hariQueueItem.patientId === raviQueueItem.patientId) {
    throw new Error('FATAL: Patients share the same ID!');
  }

  console.log('\n===============================================================');
  console.log('✅ ALL PATIENT IDENTITY & CONSISTENCY AUDIT CHECKS PASSED!');
  console.log('===============================================================');
}

runPatientConsistencyAudit().catch((err) => {
  console.error('❌ Audit Failed:', err);
  process.exit(1);
});
