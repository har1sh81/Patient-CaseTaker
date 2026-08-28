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
      rawValue: 'I have had severe stomach pain for 3 weeks and it gets worse when I eat.',
      timestamp: new Date().toISOString()
    },
    structuredHistory: {},
    currentQuestion: {
      id: 'chief_complaint',
      question: { en: 'What brings you to the hospital today?' },
      type: 'text',
      options: [],
      informationFields: ['chief_complaint']
    },
    previousAnswers: [],
    extractedFacts: [],
    questionBankContext: [
      {
        id: 'symptom_duration',
        question: { en: 'How long have you had this pain?' },
        type: 'text',
        options: [],
        informationFields: ['duration']
      },
      {
        id: 'pain_scale',
        question: { en: 'On a scale of 1 to 10, how severe is it?' },
        type: 'number',
        options: [],
        informationFields: ['severity']
      },
      {
        id: 'associated_symptoms',
        question: { en: 'Do you have any other symptoms like fever or vomiting?' },
        type: 'text',
        options: [],
        informationFields: ['associated_symptoms']
      }
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
