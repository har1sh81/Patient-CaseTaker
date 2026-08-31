import { getAIProvider, getQuestionSelectionProvider } from '../lib/ai/factory';
import { buildAdaptiveContext, evaluateDomainCompleteness, getCandidateQuestionIds } from '../lib/conversation/adaptive-logic';
import { PHASE6_DEMO_QUESTIONS } from '../lib/conversation/question-library';
import { ConversationAnswer } from '../types';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testLiveGeminiAdaptive() {
  console.log('====================================================');
  console.log('Testing Live Gemini Adaptive Questioning Setup');
  console.log('====================================================\n');

  console.log('Environment Settings:');
  console.log(`- AI_PROVIDER: ${process.env.AI_PROVIDER}`);
  console.log(`- QUESTION_SELECTION_PROVIDER: ${process.env.QUESTION_SELECTION_PROVIDER}`);
  console.log(`- GEMINI_MODEL: ${process.env.GEMINI_MODEL}`);
  console.log(`- GEMINI_API_KEY Present: ${Boolean(process.env.GEMINI_API_KEY)}\n`);

  const factProvider = getAIProvider();
  const questionProvider = getQuestionSelectionProvider();

  // Test Case 1: Rich Stomach Pain Complaint
  const testAnswer: ConversationAnswer = {
    questionId: 'reason_for_visit',
    rawValue: "I have had severe burning stomach pain for 3 weeks, especially after eating meals.",
    transcript: "I have had severe burning stomach pain for 3 weeks, especially after eating meals.",
    answeredAt: new Date().toISOString(),
  };

  const allowedQuestionIds = PHASE6_DEMO_QUESTIONS.map(q => q.id);
  const answersMap: Record<string, ConversationAnswer> = {
    reason_for_visit: testAnswer
  };

  console.log('--- TEST 1: Extracting Clinical Facts (Local Clinical NLP) ---');
  const factsResult = await factProvider.analyzeAnswer({
    sessionId: 'test_session_gemini_1',
    language: 'en',
    currentSection: 'chief_complaint',
    currentQuestion: PHASE6_DEMO_QUESTIONS[0],
    latestAnswer: testAnswer,
    previousAnswers: [],
    structuredHistory: {},
    allowedQuestionIds,
    questionBankContext: PHASE6_DEMO_QUESTIONS,
  });

  console.log('Extracted Facts Count:', factsResult.extractedFacts.length);
  factsResult.extractedFacts.forEach(f => console.log(`  - Field: ${f.field} = "${f.value}" (confidence: ${f.confidence})`));

  console.log('\n--- TEST 2: Selecting Next Question (Gemini Reasoning) ---');
  const ctx = buildAdaptiveContext(answersMap, testAnswer, allowedQuestionIds, 'en');
  const domains = evaluateDomainCompleteness(ctx);
  const candidates = getCandidateQuestionIds(ctx, domains);

  console.log('Missing Domains:', Object.entries(domains).filter(([_, d]) => d.status !== 'COMPLETE').map(([k]) => k).join(', '));
  console.log('Approved Candidate Questions:', candidates.join(', '));

  const startMs = Date.now();
  const questionResult = await questionProvider.selectQuestion({
    context: ctx,
    domains,
    candidates
  });
  const elapsedMs = Date.now() - startMs;

  console.log('\nGemini Question Selection Result:');
  console.log(`- Selected Question ID: "${questionResult.selectedQuestionId}"`);
  console.log(`- Provider Used: ${questionResult.providerUsed}`);
  console.log(`- Fallback Used: ${questionResult.fallbackUsed}`);
  console.log(`- Response Time: ${elapsedMs}ms`);
  console.log(`- Reasoning: ${questionResult.reasoning}`);

  // Find question text in library
  const selectedQuestion = PHASE6_DEMO_QUESTIONS.find(q => q.id === questionResult.selectedQuestionId);
  if (selectedQuestion) {
    console.log(`- Localized Question Text (EN): "${selectedQuestion.question.en}"`);
  }

  console.log('\n====================================================');
  if (questionResult.providerUsed === 'gemini' && !questionResult.fallbackUsed && questionResult.selectedQuestionId) {
    console.log('SUCCESS: Gemini Question Selection is ACTIVE and functioning correctly!');
  } else {
    console.log('NOTICE: Question Selection ran via local fallback or mock.');
  }
  console.log('====================================================');
}

testLiveGeminiAdaptive().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
