import { PHASE6_DEMO_QUESTIONS } from '../lib/conversation/question-library';
import { buildAdaptiveContext, evaluateDomainCompleteness, getCandidateQuestionIds } from '../lib/conversation/adaptive-logic';
import { LocalQuestionSelector, GeminiQuestionSelector } from '../lib/ai/question-selector';
import { ConversationAnswer } from '../types';

interface BenchmarkScenario {
  id: string;
  name: string;
  answers: ConversationAnswer[];
  language: 'en' | 'hi' | 'ta';
}

const TEST_SCENARIOS: BenchmarkScenario[] = [
  {
    id: 'scen_1',
    name: 'Rich Stomach Pain Statement',
    language: 'en',
    answers: [
      {
        questionId: 'reason_for_visit',
        rawValue: "I've had severe burning pain in my upper stomach for 3 weeks, worse after eating.",
        transcript: "I've had severe burning pain in my upper stomach for 3 weeks, worse after eating.",
        answeredAt: new Date().toISOString(),
      }
    ]
  },
  {
    id: 'scen_2',
    name: 'Headache with No Chest or GI Symptoms',
    language: 'en',
    answers: [
      {
        questionId: 'reason_for_visit',
        rawValue: 'Severe throbbing migraine for 2 days on the left side of my head.',
        transcript: 'Severe throbbing migraine for 2 days on the left side of my head.',
        answeredAt: new Date().toISOString(),
      }
    ]
  },
  {
    id: 'scen_3',
    name: 'Chest Pain (Requires Cardiac Check)',
    language: 'en',
    answers: [
      {
        questionId: 'reason_for_visit',
        rawValue: 'Tight chest pressure for 2 hours while walking upstairs.',
        transcript: 'Tight chest pressure for 2 hours while walking upstairs.',
        answeredAt: new Date().toISOString(),
      }
    ]
  },
  {
    id: 'scen_4',
    name: 'Negation Handling (Nausea but no vomiting)',
    language: 'en',
    answers: [
      {
        questionId: 'reason_for_visit',
        rawValue: 'Stomach ache for 1 day. I have nausea but no vomiting or fever.',
        transcript: 'Stomach ache for 1 day. I have nausea but no vomiting or fever.',
        answeredAt: new Date().toISOString(),
      }
    ]
  },
  {
    id: 'scen_5',
    name: 'Minimal Statement (Only "It hurts")',
    language: 'en',
    answers: [
      {
        questionId: 'reason_for_visit',
        rawValue: 'It hurts.',
        transcript: 'It hurts.',
        answeredAt: new Date().toISOString(),
      }
    ]
  }
];

async function runBenchmark() {
  console.log('====================================================');
  console.log('Phase 33 Question Selection Benchmark (Local vs Gemini)');
  console.log('====================================================\n');

  const localSelector = new LocalQuestionSelector();
  const apiKey = process.env.GEMINI_API_KEY;
  const geminiSelector = new GeminiQuestionSelector(apiKey);

  let localTotalMs = 0;
  let geminiTotalMs = 0;
  let geminiCallCount = 0;
  let geminiFallbackCount = 0;

  const allowedIds = PHASE6_DEMO_QUESTIONS.map(q => q.id);

  for (let i = 0; i < 20; i++) { // Run 20 iterations over 5 scenarios = 100 evaluations
    for (const scenario of TEST_SCENARIOS) {
      const answersMap: Record<string, ConversationAnswer> = {};
      scenario.answers.forEach(a => { answersMap[a.questionId] = a; });

      const ctx = buildAdaptiveContext(answersMap, scenario.answers[0], allowedIds, scenario.language);
      const domains = evaluateDomainCompleteness(ctx);
      const candidates = getCandidateQuestionIds(ctx, domains);

      // Local Selector Run
      const startLocal = Date.now();
      const localRes = await localSelector.selectQuestion({ context: ctx, domains, candidates });
      localTotalMs += (Date.now() - startLocal);

      // Gemini Selector Run
      const startGemini = Date.now();
      const geminiRes = await geminiSelector.selectQuestion({ context: ctx, domains, candidates });
      geminiTotalMs += (Date.now() - startGemini);

      if (geminiRes.providerUsed === 'gemini') geminiCallCount++;
      if (geminiRes.fallbackUsed) geminiFallbackCount++;
    }
  }

  console.log(`Evaluated ${100} conversation iterations.`);
  console.log(`Local Selector Total Time: ${localTotalMs}ms (Avg ${(localTotalMs / 100).toFixed(2)}ms / call)`);
  console.log(`Gemini Selector Total Time: ${geminiTotalMs}ms (Avg ${(geminiTotalMs / 100).toFixed(2)}ms / call)`);
  console.log(`Gemini Successful API Calls: ${geminiCallCount}`);
  console.log(`Gemini Fallbacks to Local: ${geminiFallbackCount}`);
  console.log('\n====================================================');
  console.log('Benchmark Completed Successfully.');
  console.log('====================================================');
}

runBenchmark().catch(err => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
