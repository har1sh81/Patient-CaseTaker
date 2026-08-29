import { GeminiProvider } from '../lib/ai/providers/gemini-provider';
import { AdaptiveQuestionRequest } from '../types';

async function runTest() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Missing GEMINI_API_KEY in .env.local');
    return;
  }

  const provider = new GeminiProvider(apiKey, 'gemini-3.6-flash');

  const request: AdaptiveQuestionRequest = {
    sessionId: 'test-session-123',
    language: 'en',
    currentSection: 'chief_complaint',
    latestAnswer: {
      id: 'ans_1',
      questionId: 'chief_complaint',
      sessionId: 'test_session',
      rawValue: 'I have had severe stomach pain for 3 weeks and it gets worse when I eat.'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    structuredHistory: {},
    currentQuestion: {
      id: 'chief_complaint',
      section: 'chief_complaint',
      question: { en: 'What brings you to the hospital today?' },
      options: [],
      informationFields: ['chief_complaint']
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    previousAnswers: [],
    extractedFacts: [],
    questionBankContext: [
      {
        id: 'symptom_duration',
        section: 'hpi',
        question: { en: 'How long have you had this pain?' },
        options: [],
        informationFields: ['duration']
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      {
        id: 'pain_scale',
        section: 'hpi',
        question: { en: 'On a scale of 1 to 10, how severe is it?' },
        options: [],
        informationFields: ['severity']
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      {
        id: 'associated_symptoms',
        section: 'hpi',
        question: { en: 'Do you have any other symptoms like fever or vomiting?' },
        options: [],
        informationFields: ['associated_symptoms']
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any
    ],
    allowedQuestionIds: [
      'symptom_duration',
      'pain_scale',
      'aggravating_factors',
      'relieving_factors',
      'associated_symptoms'
    ]
  };

  try {
    console.log('Sending request to Gemini API...');
    const result = await provider.analyzeAnswer(request);
    console.log('--- RESPONSE ---');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();
