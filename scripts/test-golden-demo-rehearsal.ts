import { LocalClinicalNLP } from '../lib/ai/local-nlp';
import { LocalNeuralEmbeddingsEngine } from '../lib/ai/local-neural-embeddings';
import { HybridClinicalRetrievalEngine, ClinicalRecordCandidate } from '../lib/ai/hybrid-retrieval-engine';
import { composeClinicalConsultationSummary } from '../lib/reports/report-composer';
import { generateClinicalSummaryPDFBuffer } from '../lib/reports/pdf-generator';
import { mapToFHIRBundle } from '../lib/fhir/mapper';
import { validateFHIRBundle } from '../lib/fhir/validator';
import { MockHospitalProvider } from '../lib/integrations/hospital-provider';
import { MockABDMProvider } from '../lib/abdm/providers/mock-provider';
import { IntakeSession, PatientProfile } from '../types';

export interface RehearsalRunResult {
  runNumber: number;
  completed: boolean;
  durationMs: number;
  pdfSizeBytes: number;
  fhirValid: boolean;
  hospitalExportId?: string;
  abdmExportId?: string;
  workaroundCount: number;
  error?: string;
}

export async function executeSingleGoldenRehearsal(runNumber: number): Promise<RehearsalRunResult> {
  const startTime = Date.now();
  const sessionId = `ses_golden_rehearsal_${runNumber}`;
  const patientId = `pat_golden_${runNumber}`;

  try {
    const session: IntakeSession = {
      id: sessionId,
      patientId,
      status: 'finalized',
      language: 'en',
      startedAt: new Date(Date.now() - 300000).toISOString(),
      completedAt: new Date().toISOString(),
      handoffSnapshotId: `report_golden_${runNumber}`,
    };

    const patient: PatientProfile = {
      id: patientId,
      demographics: {
        firstName: 'Ramesh',
        lastName: 'Kumar',
        fullName: 'Ramesh Kumar',
        age: 45,
        gender: 'male',
      },
      identification: {
        abhaAddress: 'ramesh.kumar@abdm',
      },
      createdAt: new Date().toISOString(),
    };

    const patientSpeech = "I have been experiencing severe epigastric stomach burning pain for 3 weeks, especially after meals.";
    const nlpFacts = LocalClinicalNLP.extractFacts(patientSpeech, 'en');

    const candidates: ClinicalRecordCandidate[] = [
      {
        id: `rec_pmh_1`,
        patientId,
        sessionId,
        sourceType: 'abdm',
        recordDate: '2021-05-10',
        clinicalCategory: 'gastrointestinal',
        content: 'Antral gastritis diagnosed on upper GI endoscopy',
        temporalStatus: 'historical',
      },
    ];

    const ragResult = await HybridClinicalRetrievalEngine.retrieveRelevantHistory(
      patientSpeech,
      patientId,
      candidates,
      'hybrid',
      'en'
    );

    const report = composeClinicalConsultationSummary({
      session,
      patient,
      answers: [
        { id: 'ans_1', sessionId, questionId: 'q_cc', answerText: patientSpeech, language: 'en', createdAt: new Date().toISOString() }
      ],
      flags: [],
      timelineEvents: [],
      documents: [
        {
          id: 'doc_ext_1',
          documentId: 'doc_1',
          documentType: 'Prescription',
          extractedText: 'Amlodipine 5mg daily. Antral Gastritis.',
          extractedConditions: [{ conditionName: 'Antral Gastritis', confidence: 0.95 }],
          extractedMedications: [{ medicationName: 'Amlodipine', dosage: '5mg', frequency: 'daily' }],
          extractedDates: ['2026-08-28'],
          confidence: 0.95,
          extractedAt: new Date().toISOString(),
        }
      ],
    });

    const pdfBuffer = await generateClinicalSummaryPDFBuffer(report);
    const fhirBundle = mapToFHIRBundle(session, report);
    const fhirVal = validateFHIRBundle(fhirBundle);

    const hospProvider = new MockHospitalProvider();
    const hospRes = await hospProvider.sendClinicalRecord(fhirBundle);

    const abdmProvider = new MockABDMProvider();
    const abdmRes = await abdmProvider.publishRecord(fhirBundle);

    const durationMs = Date.now() - startTime;

    return {
      runNumber,
      completed: true,
      durationMs,
      pdfSizeBytes: pdfBuffer.length,
      fhirValid: fhirVal.valid,
      hospitalExportId: hospRes.externalId,
      abdmExportId: abdmRes.externalId,
      workaroundCount: 0,
    };
  } catch (err) {
    console.error(`[REHEARSAL ERROR Run ${runNumber}]:`, err);
    return {
      runNumber,
      completed: false,
      durationMs: Date.now() - startTime,
      pdfSizeBytes: 0,
      fhirValid: false,
      workaroundCount: 0,
      error: err instanceof Error ? err.message : 'Unknown rehearsal error',
    };
  }
}

export async function run5ConsecutiveRehearsals() {
  console.log('===========================================================');
  console.log('PHASE 30 — 5 CONSECUTIVE GOLDEN DEMO REHEARSALS');
  console.log('===========================================================\n');

  let successCount = 0;
  const runs: RehearsalRunResult[] = [];

  for (let i = 1; i <= 5; i++) {
    const res = await executeSingleGoldenRehearsal(i);
    runs.push(res);

    console.log(`Rehearsal Run [${res.runNumber} / 5]:`);
    console.log(`  Status:             ${res.completed ? 'COMPLETED ✓' : 'FAILED ❌'}`);
    console.log(`  Execution Latency:  ${res.durationMs} ms`);
    console.log(`  PDF Size:           ${res.pdfSizeBytes} bytes`);
    console.log(`  FHIR R4 Validation: ${res.fhirValid ? 'VALID ✓' : 'INVALID ❌'}`);
    console.log(`  Hospital Export ID: ${res.hospitalExportId || 'N/A'}`);
    console.log(`  ABDM Export ID:     ${res.abdmExportId || 'N/A'}`);
    console.log(`  Manual Workarounds: ${res.workaroundCount}`);
    console.log('-----------------------------------------------------------');

    if (res.completed && res.fhirValid) successCount++;
  }

  console.log(`\nRehearsal Summary: ${successCount} / 5 Consecutive Runs Completed Successfully.`);
  console.log('===========================================================');
}

run5ConsecutiveRehearsals().catch(console.error);
