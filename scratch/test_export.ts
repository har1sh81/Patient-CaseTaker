import { mapToFHIRBundle } from '../lib/fhir/mapper';
import { IntakeSession, ClinicalHistoryReport } from '../types';

const mockSession: IntakeSession = {
  id: 'ses_test',
  patientId: 'pat_test',
  status: 'finalized',
  language: 'en',
  departmentMode: 'standard',
  startedAt: new Date().toISOString(),
  currentStep: 'completed',
  progress: { completedSections: [], pendingSections: [], percentage: 100 },
  cleanupStatus: { temporaryDataDeleted: false },
};

const mockReport: ClinicalHistoryReport = {
  reportId: 'rep_test',
  reportVersion: '1.0',
  generatedAt: new Date().toISOString(),
  sessionId: 'ses_test',
  patient: {
    fullName: 'Test Patient',
    gender: 'male',
    abhaReference: '99-9999-9999-9999',
  },
  visit: {
    generatedDate: new Date().toISOString(),
    departmentMode: 'standard',
    intakeLanguage: 'en',
    reasonForVisit: 'Routine Checkup',
  },
  clinicalHistory: {
    pastMedicalHistory: [],
    pastSurgicalHistory: [],
    medications: [
      { id: 'med1', name: 'Aspirin', status: 'active', dosage: '81mg', frequency: 'daily', provenance: { source: 'patient_voice', confidence: 'high' } }
    ],
    allergies: [],
    familyHistory: [],
  },
  documentSummary: {
    uploadedDocumentCount: 0,
    documents: [],
    extractedConditions: [],
    laboratoryResults: [],
    admissions: [],
  },
  medicalTimeline: [],
  attentionFlags: [],
  patientConfirmation: {
    confirmedByPatient: true,
    correctionsMade: 0,
  },
  physicianVerification: {
    status: 'verified',
    signatureRequired: false,
  },
  reference: {
    referenceNumber: 'REF-123',
    qrPayload: 'qr_test',
    generatedAt: new Date().toISOString(),
  },
};

const bundle = mapToFHIRBundle(mockSession, mockReport);
console.log(JSON.stringify(bundle, null, 2));
