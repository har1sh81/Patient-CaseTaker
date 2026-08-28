import { AIProvider } from './provider-interface';
import { MockProvider } from './providers/mock-provider';
import { GeminiProvider } from './providers/gemini-provider';

export function getAIProvider(): AIProvider {
  const isMock = process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED === 'true' || process.env.AI_PROVIDER === 'mock';
  
  if (isMock) {
    return new MockProvider();
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. Falling back to MockProvider.');
    return new MockProvider();
  }

  return new GeminiProvider(apiKey, process.env.GEMINI_MODEL || 'gemini-3.6-flash');
}
