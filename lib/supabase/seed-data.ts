import { DatabaseService } from './repository';
import { Consent, IntakeSession } from '../../types';
import { DemoScenarioSchema } from '../../schemas';
import standardScenario from '../../data/demo/standard-patient.json';
import attentionScenario from '../../data/demo/attention-case.json';
import ayushScenario from '../../data/demo/ayush-patient.json';

export async function loadAndSeedScenario(scenarioId: 'standard' | 'attention' | 'ayush', db: DatabaseService) {
  let rawScenario: unknown;
  if (scenarioId === 'standard') {
    rawScenario = standardScenario;
  } else if (scenarioId === 'attention') {
    rawScenario = attentionScenario;
  } else {
    rawScenario = ayushScenario;
  }

  // Parse and validate with DemoScenarioSchema
  const scenario = DemoScenarioSchema.parse(rawScenario);

  // 1. Create Patient
  await db.createPatient(scenario.patient);

  // 2. Create Consent
  if (scenario.consent && scenario.consent.id) {
    await db.saveConsent(scenario.consent as unknown as Consent);
  }

  // 3. Create Session
  if (scenario.session && scenario.session.id) {
    await db.createSession(scenario.session as unknown as IntakeSession);
  }

  // 4. Create Messages from conversation list
  if (scenario.conversation && scenario.session && scenario.session.id) {
    for (let idx = 0; idx < scenario.conversation.length; idx++) {
      const step = scenario.conversation[idx];
      // Assistant Question Message
      await db.saveMessage({
        id: `msg_q_${scenario.id}_${idx}`,
        sessionId: scenario.session.id,
        speaker: 'ai',
        content: `Question: ${step.questionId}`,
        language: scenario.session.language || 'en',
        timestamp: new Date(Date.now() - (scenario.conversation.length - idx) * 60000).toISOString(),
        linkedQuestionId: step.questionId,
      });

      // Patient Response Message
      await db.saveMessage({
        id: `msg_a_${scenario.id}_${idx}`,
        sessionId: scenario.session.id,
        speaker: 'patient',
        content: step.patientResponse,
        language: scenario.session.language || 'en',
        timestamp: new Date(Date.now() - (scenario.conversation.length - idx) * 60000 + 10000).toISOString(),
        linkedQuestionId: step.questionId,
      });

      // Also save as ConversationAnswer
      await db.saveAnswer({
        id: `ans_${scenario.id}_${idx}`,
        sessionId: scenario.session.id,
        questionId: step.questionId,
        section: 'chief_complaint',
        rawValue: step.patientResponse,
        normalizedValue: step.patientResponse,
        inputMethod: step.inputMethod,
        transcript: step.transcript || step.patientResponse,
        provenance: { 
          source: step.inputMethod === 'voice' ? 'patient_voice' : 'patient_touch', 
          confidence: 'high' 
        },
        answeredAt: new Date(Date.now() - (scenario.conversation.length - idx) * 60000 + 10000).toISOString(),
        editedByPatient: false,
      });
    }
  }

  // 5. Create Clinical History expectations
  if (scenario.expectedClinicalHistory && scenario.session && scenario.session.id) {
    await db.saveClinicalHistory({
      id: `his_${scenario.session.id}`,
      sessionId: scenario.session.id,
      patientId: scenario.patient.id,
      chiefComplaint: {
        primaryComplaint: scenario.conversation[0]?.patientResponse || 'Intake complaint',
        additionalComplaints: [],
        provenance: { source: 'patient_voice', confidence: 'high' }
      },
      historyOfPresentIllness: {
        patientNarrative: scenario.expectedReportSummary,
        completeness: { missingFields: [], completedFields: ['chiefComplaint'] }
      },
      pastMedicalHistory: scenario.expectedClinicalHistory.pastMedicalHistory || [],
      pastSurgicalHistory: scenario.expectedClinicalHistory.pastSurgicalHistory || [],
      medications: scenario.expectedClinicalHistory.medications || [],
      allergies: scenario.expectedClinicalHistory.allergies || [],
      familyHistory: scenario.expectedClinicalHistory.familyHistory || [],
      sourceSummary: {
        patientInterviewCompleted: true,
        documentsProcessed: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // 6. Create Attention Flags
  if (scenario.expectedFlags && scenario.expectedFlags.length > 0 && scenario.session && scenario.session.id) {
    for (let idx = 0; idx < scenario.expectedFlags.length; idx++) {
      const flagText = scenario.expectedFlags[idx];
      await db.saveAttentionFlag({
        id: `flg_${scenario.session.id}_${idx}`,
        sessionId: scenario.session.id,
        patientId: scenario.patient?.id || 'mock_patient',
        category: 'missing_information',
        severity: 'high',
        label: 'Missing Height and Weight',
        message: scenario.expectedReportSummary,
        evidence: [flagText],
        provenances: [{ source: 'demo_data' }],
        requiresClinicalReview: true,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    // Inject a specific medication conflict for the SIH demo scenario
    if (scenarioId === 'attention' && scenario.session && scenario.session.id) {
      await db.saveAttentionFlag({
        id: `flg_${scenario.session.id}_medconflict`,
        sessionId: scenario.session.id,
        patientId: scenario.patient?.id || 'mock_patient',
        category: 'medication_attention',
        severity: 'high',
        label: 'Medication Conflict',
        message: 'Discrepancy found between Patient Interview and ABDM records for Amlodipine.',
        evidence: ['Patient: Amlodipine 5mg', 'ABDM: Amlodipine 10mg'],
        provenances: [
          { source: 'patient_voice', confidence: 'high' },
          { source: 'abdm', confidence: 'high' }
        ],
        requiresClinicalReview: true,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  console.log(`[Seed Loader] Successfully loaded scenario: ${scenarioId}`);
}
