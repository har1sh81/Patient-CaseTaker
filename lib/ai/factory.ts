import { AIProvider } from './provider-interface';
import { MockProvider } from './providers/mock-provider';
import { GeminiProvider } from './providers/gemini-provider';
import { LocalProvider } from './providers/local-provider';
import { QuestionSelector, LocalQuestionSelector, GeminiQuestionSelector } from './question-selector';

export function getAIProvider(): AIProvider {
  const providerType = (process.env.AI_PROVIDER || 'local').toLowerCase();

  if (providerType === 'local') {
    return new LocalProvider();
  }

  if (providerType === 'mock') {
    return new MockProvider();
  }

  if (providerType === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[AI Provider Factory] AI_PROVIDER=gemini configured but GEMINI_API_KEY is missing. Using LocalProvider for fallback.');
      return new LocalProvider();
    }
    return new GeminiProvider(apiKey, process.env.GEMINI_MODEL || 'gemini-3.6-flash');
  }

  return new LocalProvider();
}

export function getQuestionSelectionProvider(): QuestionSelector {
  const selectionProvider = (
    process.env.QUESTION_SELECTION_PROVIDER ||
    process.env.AI_PROVIDER ||
    'local'
  ).toLowerCase();

  if (selectionProvider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[Question Selection Factory] QUESTION_SELECTION_PROVIDER=gemini but GEMINI_API_KEY missing. Using LocalQuestionSelector.');
      return new LocalQuestionSelector();
    }
    return new GeminiQuestionSelector(apiKey, process.env.GEMINI_MODEL || 'gemini-3.6-flash');
  }

  return new LocalQuestionSelector();
}

export function getFactExtractionProvider(): 'local' {
  // Fact extraction is ALWAYS local in MediKiosk architecture for privacy & reliability
  return 'local';
}
