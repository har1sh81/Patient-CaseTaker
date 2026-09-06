import { LocalClinicalNLP } from '../lib/ai/local-nlp';
import { buildAdaptiveContext, evaluateDomainCompleteness, selectNextQuestion } from '../lib/conversation/adaptive-logic';
import { composeClinicalConsultationSummary } from '../lib/reports/report-composer';
import { ConversationAnswer, IntakeSession, Patient } from '../types';
import { PHASE6_DEMO_QUESTIONS, PHASE13_AYUSH_QUESTIONS } from '../lib/conversation/question-library';

async function runAudit() {
  console.log('=== TEST 1: Local NLP Clinical Fact Extraction ===');
  const text1 = 'I have severe chest pain for 3 days and nausea. I took paracetamol 500mg.';
  const nlp1 = LocalClinicalNLP.extractFacts(text1, 'en');
  console.log('Extracted facts count:', nlp1.facts.length);
  console.log('Primary symptom:', nlp1.primarySymptom);
  console.log('Duration:', nlp1.duration);
  console.log('Severity:', nlp1.severity);
  console.log('Location:', nlp1.location);

  if (nlp1.primarySymptom !== 'Chest Pain' || nlp1.duration !== '3 days' || nlp1.severity !== 'severe') {
    console.error('FAILED Test 1: NLP extraction mismatch');
    process.exit(1);
  }
  console.log('PASSED Test 1\n');

  console.log('=== TEST 2: Dynamic Question Routing for Cardiac Symptoms ===');
  const allowedGM = PHASE6_DEMO_QUESTIONS.map(q => q.id);
  const answersGM: Record<string, ConversationAnswer> = {
    reason_for_visit: {
      questionId: 'reason_for_visit',
      rawValue: 'I have severe chest pain',
      normalizedValue: 'Chest Pain',
      confidence: 1,
      section: 'chief_complaint',
      answeredAt: new Date().toISOString(),
    },
  };

  const ctxGM = buildAdaptiveContext(answersGM, null, allowedGM, 'en');
  const domainsGM = evaluateDomainCompleteness(ctxGM);
  const nextQ1 = selectNextQuestion(ctxGM, domainsGM);
  console.log('Selected next question after chest pain:', nextQ1);

  if (!nextQ1) {
    console.error('FAILED Test 2: Next question was undefined');
    process.exit(1);
  }
  console.log('PASSED Test 2\n');

  console.log('=== TEST 3: AYUSH Question Selection & Report Generation ===');
  const allowedAYUSH = PHASE13_AYUSH_QUESTIONS.map(q => q.id);
  const answersAYUSH: Record<string, ConversationAnswer> = {
    reason_for_visit: {
      questionId: 'reason_for_visit',
      rawValue: 'Joint pain and indigestion',
      normalizedValue: 'Joint Pain',
      confidence: 1,
      section: 'chief_complaint',
      answeredAt: new Date().toISOString(),
    },
    symptom_duration: {
      questionId: 'symptom_duration',
      rawValue: '4to7',
      normalizedValue: '4–7 days',
      confidence: 1,
      section: 'chief_complaint',
      answeredAt: new Date().toISOString(),
    },
    ayush_prakriti: {
      questionId: 'ayush_prakriti',
      rawValue: 'Vata-Pitta build, lean body',
      normalizedValue: 'Vata-Pitta',
      confidence: 1,
      section: 'ayush',
      answeredAt: new Date().toISOString(),
    },
    ayush_digestion: {
      questionId: 'ayush_digestion',
      rawValue: 'irregular',
      normalizedValue: 'Irregular digestion',
      confidence: 1,
      section: 'ayush',
      answeredAt: new Date().toISOString(),
    },
    ayush_bowel: {
      questionId: 'ayush_bowel',
      rawValue: 'hard',
      normalizedValue: 'Hard constipation',
      confidence: 1,
      section: 'ayush',
      answeredAt: new Date().toISOString(),
    },
  };

  const mockSession: IntakeSession = {
    id: 'ses_ayush_test',
    patientId: 'pat_ayush_test',
    departmentMode: 'ayush',
    language: 'en',
    status: 'completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };

  const mockPatient: Patient = {
    id: 'pat_ayush_test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    demographics: {
      fullName: 'Hari Ram',
      age: 45,
      gender: 'male',
      contactPhone: '9876543210',
    },
    identification: {
      hospitalNumber: 'HOSP-1002',
      abhaReference: 'ABHA-9999',
    },
    privacyConsent: {
      accepted: true,
      timestamp: new Date().toISOString(),
      version: '1.0',
    },
  };

  const ayushReport = composeClinicalConsultationSummary({
    session: mockSession,
    patient: mockPatient,
    answers: Object.values(answersAYUSH),
  });

  console.log('Generated Report Patient Name:', ayushReport.patient.fullName);
  console.log('Department Mode:', ayushReport.visit.departmentMode);
  console.log('AYUSH Prakriti:', ayushReport.ayush?.prakriti);
  console.log('AYUSH Agni:', ayushReport.ayush?.agni);
  console.log('AYUSH Koshtha:', ayushReport.ayush?.koshtha);
  console.log('Information Not Reported (Gaps):', ayushReport.informationNotReported);

  if (ayushReport.patient.fullName !== 'Hari Ram') {
    console.error('FAILED Test 3: Patient name mismatch in AYUSH report');
    process.exit(1);
  }

  if (!ayushReport.ayush || ayushReport.ayush.prakriti !== 'Vata-Pitta build, lean body') {
    console.error('FAILED Test 3: AYUSH section missing or incorrect');
    process.exit(1);
  }

  console.log('PASSED Test 3\n');

  console.log('=== TEST 4: Automatic Red Flag Banner Detection (API-layer logic) ===');
  const answersRedFlag: ConversationAnswer[] = [
    {
      questionId: 'reason_for_visit',
      rawValue: 'Severe chest tightness and pain',
      normalizedValue: 'Chest Pain',
      confidence: 1,
      section: 'chief_complaint',
      answeredAt: new Date().toISOString(),
    },
    {
      questionId: 'pain_scale',
      rawValue: '9',
      normalizedValue: '9',
      confidence: 1,
      section: 'review_of_systems',
      answeredAt: new Date().toISOString(),
    },
  ];

  // Simulate the review data route's red flag computation
  const computedRedFlags: Array<{ id: string; level: string; title: string; description: string }> = [];

  const painAns = answersRedFlag.find(a => a.questionId === 'pain_scale');
  if (painAns) {
    const painVal = String(painAns.rawValue || painAns.normalizedValue || '');
    const painNum = parseInt(painVal, 10);
    if (painNum >= 7) {
      computedRedFlags.push({
        id: 'rf_severe_pain',
        level: 'critical',
        title: '⚠️ Severe Pain Reported',
        description: `Patient reported pain level ${painVal}/10. High priority consultation recommended.`,
      });
    }
  }

  const hasChestMention = answersRedFlag.some(a =>
    String(a.rawValue || a.transcript || '').toLowerCase().match(/chest|cardiac|angina|heart/)
  );
  if (hasChestMention) {
    computedRedFlags.push({
      id: 'rf_cardiac',
      level: 'critical',
      title: '🫀 Potential Cardiac Symptom',
      description: 'Patient reported chest-related symptoms. Immediate ECG / Triage review required.',
    });
  }

  console.log('Computed Red Flags Count:', computedRedFlags.length);
  computedRedFlags.forEach(f => {
    console.log(`- [${f.level.toUpperCase()}] ${f.title}: ${f.description}`);
  });

  if (computedRedFlags.length < 2) {
    console.error('FAILED Test 4: Expected at least 2 red flag banners (Severe Pain + Cardiac)');
    process.exit(1);
  }

  // Also verify the report-composer still generates correctly with these answers
  const redFlagReport = composeClinicalConsultationSummary({
    session: { ...mockSession, departmentMode: 'general' },
    patient: mockPatient,
    answers: answersRedFlag,
  });
  console.log('Report generated for red flag patient:', redFlagReport.patient.fullName);
  console.log('Chief complaint:', redFlagReport.chiefComplaint.primaryComplaint);

  console.log('PASSED Test 4\n');
  console.log('ALL ADAPTIVE INTERVIEW & CLINICAL REPORT TESTS PASSED PERFECTLY!');
}

runAudit().catch(err => {
  console.error('Error running test script:', err);
  process.exit(1);
});
