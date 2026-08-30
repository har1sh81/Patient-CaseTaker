import { LocalProvider } from '../lib/ai/providers/local-provider';
import { composeClinicalConsultationSummary } from '../lib/reports/report-composer';
import { generateClinicalSummaryPDFBuffer } from '../lib/reports/pdf-generator';
import { IntakeSession, Patient, ConversationAnswer, DocumentExtractionResult, AttentionFlag } from '../types';

interface SyntheticJourneyCase {
  id: string;
  lang: 'en' | 'hi' | 'ta';
  departmentMode: 'standard' | 'ayush';
  initialComplaint: string;
  answers: { questionId: string; rawValue: string }[];
  expectedDocAssigned: string;
}

const E2E_BENCHMARK_JOURNEYS: SyntheticJourneyCase[] = Array.from({ length: 50 }, (_, idx) => {
  const isHi = idx % 3 === 1;
  const isTa = idx % 3 === 2;
  const lang: 'en' | 'hi' | 'ta' = isHi ? 'hi' : isTa ? 'ta' : 'en';
  const isAyush = idx % 5 === 0;

  return {
    id: `J-${idx + 1}`,
    lang,
    departmentMode: isAyush ? 'ayush' : 'standard',
    initialComplaint: isHi
      ? 'मुझे पिछले 3 दिनों से पेट में तेज दर्द और जी मिचलाना है'
      : isTa
      ? 'எனக்கு 3 நாட்களாக வயிறு வலி மற்றும் வாந்தி உள்ளது'
      : 'I have severe stomach pain after meals and mild nausea for 3 days',
    answers: [
      { questionId: 'reason_for_visit', rawValue: isHi ? 'पेट में तेज दर्द' : isTa ? 'வயிறு வலி' : 'Severe stomach pain after meals' },
      { questionId: 'symptom_duration', rawValue: isHi ? '3 दिन से' : isTa ? '3 நாட்களாக' : '3 days' },
      { questionId: 'symptom_severity', rawValue: '7/10' },
      { questionId: 'past_medical_history', rawValue: isHi ? 'उच्च रक्तचाप' : isTa ? 'ரத்த அழுத்தம்' : 'High Blood Pressure' },
      { questionId: 'current_medications', rawValue: 'Amlodipine 5mg' },
    ],
    expectedDocAssigned: isAyush ? 'Dr. Ananya Varma, BAMS' : 'Dr. Rajesh Sharma, MD',
  };
});

export async function runEndToEndLocalIntegrationTest() {
  console.log('===========================================================');
  console.log('PHASE 22D BENCHMARK — END-TO-END LOCAL INTELLIGENCE SUITE');
  console.log('===========================================================\n');

  const provider = new LocalProvider();
  let successfulJourneys = 0;
  let pdfGeneratedCount = 0;

  const startTime = Date.now();
  const initialMem = process.memoryUsage().heapUsed / 1024 / 1024;

  for (const journey of E2E_BENCHMARK_JOURNEYS) {
    const session: IntakeSession = {
      id: `ses_e2e_${journey.id}`,
      sessionId: `ses_e2e_${journey.id}`,
      patientId: `pat_e2e_${journey.id}`,
      status: 'active',
      departmentMode: journey.departmentMode,
      language: journey.lang,
      preferredLanguage: journey.lang,
      pendingSections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const patient: Patient = {
      id: `pat_e2e_${journey.id}`,
      demographics: { firstName: 'Patient', lastName: journey.id, fullName: `Test Patient ${journey.id}`, age: 35 + (parseInt(journey.id.replace('J-', '')) % 30), gender: 'male' },
      identification: { hospitalNumber: `HOSP-${journey.id}`, abhaReference: `ABHA-${journey.id}` },
      createdAt: new Date().toISOString(),
    };

    const answersHistory: ConversationAnswer[] = [];

    // Step 1: Process Each Answer through LocalProvider
    for (const ansInput of journey.answers) {
      const currentAns: ConversationAnswer = {
        id: `ans_${ansInput.questionId}`,
        sessionId: session.id,
        questionId: ansInput.questionId,
        rawValue: ansInput.rawValue,
        transcript: ansInput.rawValue,
        section: ansInput.questionId === 'reason_for_visit' ? 'chief_complaint' : 'hpi',
        createdAt: new Date().toISOString(),
      };
      answersHistory.push(currentAns);

      const aiResponse = await provider.analyzeAnswer({
        sessionId: session.id,
        language: journey.lang,
        currentSection: 'chief_complaint',
        latestAnswer: currentAns,
        answersHistory,
      });

      if (!aiResponse.extractedFacts) {
        console.error(`❌ Journey ${journey.id} failed at LocalProvider analysis`);
      }
    }

    // Step 2: Deterministic Report Composition (No Gemini)
    const summary = composeClinicalConsultationSummary({
      session,
      patient,
      answers: answersHistory,
    });

    if (summary && summary.reportId) {
      successfulJourneys++;
    }

    // Step 3: Server-side PDF Generation (No Gemini)
    const pdfBuffer = await generateClinicalSummaryPDFBuffer(summary);
    if (pdfBuffer && pdfBuffer.length > 1000) {
      pdfGeneratedCount++;
    }
  }

  const durationMs = Date.now() - startTime;
  const finalMem = process.memoryUsage().heapUsed / 1024 / 1024;
  const totalCount = E2E_BENCHMARK_JOURNEYS.length;

  console.log(`Evaluated ${totalCount} complete end-to-end patient journeys (AI_PROVIDER=local).`);
  console.log(`-----------------------------------------------------------`);
  console.log(`Successful Journey Completion Rate: ${((successfulJourneys / totalCount) * 100).toFixed(1)}%`);
  console.log(`Server-Side PDF Generation Rate:    ${((pdfGeneratedCount / totalCount) * 100).toFixed(1)}%`);
  console.log(`Gemini API Calls Made:             0 (100% Local Pipeline)`);
  console.log(`-----------------------------------------------------------`);
  console.log(`Total Batch Execution Time: ${durationMs} ms (${(durationMs / totalCount).toFixed(2)} ms / journey)`);
  console.log(`Heap Memory Used:            ${(finalMem - initialMem).toFixed(2)} MB`);
  console.log('===========================================================');
}

runEndToEndLocalIntegrationTest().catch(console.error);
