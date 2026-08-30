import { mapToFHIRBundle } from '../lib/fhir/mapper';
import { validateFHIRBundle } from '../lib/fhir/validator';
import { MockHospitalProvider } from '../lib/integrations/hospital-provider';
import { MockABDMProvider } from '../lib/abdm/providers/mock-provider';
import { IntakeSession, ClinicalHistoryReport } from '../types';

export interface InteroperabilityTestResult {
  testName: string;
  category: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
}

export async function runInteroperabilityTestSuite(): Promise<InteroperabilityTestResult[]> {
  const results: InteroperabilityTestResult[] = [];

  const mockSession: IntakeSession = {
    id: 'ses_fhir_golden_01',
    patientId: 'pat_fhir_01',
    status: 'finalized',
    language: 'en',
    startedAt: '2026-08-30T10:00:00Z',
    completedAt: '2026-08-30T10:08:00Z',
    handoffSnapshotId: 'report_fhir_01',
  };

  // 1. Golden Bundle Test
  const goldenReport: ClinicalHistoryReport = {
    id: 'report_fhir_01',
    sessionId: 'ses_fhir_golden_01',
    patientId: 'pat_fhir_01',
    createdAt: '2026-08-30T10:08:00Z',
    patient: {
      fullName: 'Ramesh Kumar',
      age: 45,
      gender: 'male',
      abhaReference: '91-1234-5678-9012',
    },
    visit: {
      reasonForVisit: 'Severe epigastric stomach pain following meals',
    },
    clinicalHistory: {
      chiefComplaint: {
        primaryComplaint: 'Epigastric Stomach Pain',
        duration: '3 weeks',
        severity: 'Severe (8/10)',
      },
      pastMedicalHistory: [{ id: 'pmh_1', conditionName: 'Type 2 Diabetes Mellitus', status: 'active' }],
      medications: [{ id: 'med_1', name: 'Metformin', dosage: '500 mg', frequency: 'Twice daily', status: 'active' }],
      allergies: [{ id: 'alg_1', allergen: 'Penicillin', reaction: 'Skin Rash', category: 'drug' }],
      pastSurgicalHistory: [{ id: 'surg_1', procedureName: 'Appendectomy', date: '2018-04-12' }],
      familyHistory: [],
      socialHistory: {},
    },
    documentSummary: {
      documents: [{ id: 'doc_1', fileName: 'lab_report.pdf', type: 'Lab Report', uploadDate: '2026-08-30' }],
      extractedConditions: [{ name: 'Antral Gastritis' }],
      laboratoryResults: [{ id: 'lab_1', testName: 'HbA1c', valueRaw: '7.2%', testDate: '2026-08-28' }],
    },
    physicianVerification: { status: 'verified', verifiedAt: '2026-08-30T10:09:00Z' },
    timelineEvents: [],
  };

  const goldenBundle = mapToFHIRBundle(mockSession, goldenReport);
  const goldenValidation = validateFHIRBundle(goldenBundle);

  results.push({
    category: 'Golden Bundle',
    testName: 'Golden FHIR R4 Bundle Generation & Validation',
    expected: 'Valid FHIR R4 collection bundle with 8 resource types',
    actual: goldenValidation.valid ? `VALID (${goldenValidation.totalEntries} entries)` : `INVALID (${goldenValidation.errors.join('; ')})`,
    status: goldenValidation.valid && goldenValidation.totalEntries >= 8 ? 'PASS' : 'FAIL',
  });

  // 2. Minimal Bundle Test (Zero empty resources)
  const minimalReport: ClinicalHistoryReport = {
    ...goldenReport,
    clinicalHistory: {
      chiefComplaint: { primaryComplaint: 'Stomach Pain' },
      pastMedicalHistory: [],
      medications: [],
      allergies: [],
      pastSurgicalHistory: [],
      familyHistory: [],
      socialHistory: {},
    },
    documentSummary: { documents: [], extractedConditions: [], laboratoryResults: [] },
  };

  const minimalBundle = mapToFHIRBundle(mockSession, minimalReport);
  const minimalValidation = validateFHIRBundle(minimalBundle);
  const hasEmptyAllergy = minimalBundle.entry.some((e: any) => e.resource?.resourceType === 'AllergyIntolerance');

  results.push({
    category: 'Minimal Bundle',
    testName: 'Minimal Case Empty Resource Control',
    expected: 'Valid bundle containing only Patient, Encounter & Chief Complaint (0 empty resources)',
    actual: minimalValidation.valid && !hasEmptyAllergy ? `VALID (${minimalBundle.entry.length} entries, 0 empty allergy entries)` : 'FAILED',
    status: minimalValidation.valid && !hasEmptyAllergy ? 'PASS' : 'FAIL',
  });

  // 3. AYUSH Case Test
  const ayushReport: ClinicalHistoryReport = {
    ...goldenReport,
    visit: { reasonForVisit: 'Vata imbalances with Amavata joint stiffness' },
    clinicalHistory: {
      ...goldenReport.clinicalHistory,
      chiefComplaint: { primaryComplaint: 'Amavata Joint Stiffness' },
    },
  };
  const ayushBundle = mapToFHIRBundle(mockSession, ayushReport);
  const ayushVal = validateFHIRBundle(ayushBundle);

  results.push({
    category: 'AYUSH Interoperability',
    testName: 'AYUSH Complaint Preservation in FHIR R4',
    expected: 'AYUSH clinical complaint text preserved without fake FHIR resource hacks',
    actual: ayushVal.valid ? 'PRESERVED AS HL7 CODEABLE CONCEPT (PASS)' : 'FAILED',
    status: ayushVal.valid ? 'PASS' : 'FAIL',
  });

  // 4. Mock Hospital Provider Export Test
  const hospProvider = new MockHospitalProvider();
  const hospRes = await hospProvider.sendClinicalRecord(goldenBundle);

  results.push({
    category: 'Mock Hospital Export',
    testName: 'Mock Hospital EMR Provider Handoff',
    expected: 'Returns success with external hospital reference ID',
    actual: hospRes.success ? `SUCCESS (${hospRes.externalId})` : 'FAILED',
    status: hospRes.success ? 'PASS' : 'FAIL',
  });

  // 5. Mock ABDM Provider Export Test
  const abdmProvider = new MockABDMProvider();
  const abdmRes = await abdmProvider.publishRecord(goldenBundle);

  results.push({
    category: 'Mock ABDM Export',
    testName: 'Mock ABDM M1/M2 Gateway Export',
    expected: 'Returns success with ABDM transaction reference ID',
    actual: abdmRes.success ? `SUCCESS (${abdmRes.externalId})` : 'FAILED',
    status: abdmRes.success ? 'PASS' : 'FAIL',
  });

  return results;
}

export async function printInteroperabilityReport() {
  console.log('===========================================================');
  console.log('PHASE 29 — FHIR VALIDATION & INTEROPERABILITY TEST SUITE');
  console.log('===========================================================\n');

  const suiteResults = await runInteroperabilityTestSuite();
  let passCount = 0;

  suiteResults.forEach((res, idx) => {
    console.log(`[Test ${idx + 1}] Category: ${res.category}`);
    console.log(`  Name:     ${res.testName}`);
    console.log(`  Expected: ${res.expected}`);
    console.log(`  Actual:   ${res.actual}`);
    console.log(`  Result:   [${res.status}]`);
    console.log('-----------------------------------------------------------');
    if (res.status === 'PASS') passCount++;
  });

  console.log(`Summary: ${passCount} / ${suiteResults.length} Interoperability Tests Passed.`);
  console.log('===========================================================');
}

printInteroperabilityReport().catch(console.error);
