import { AIProvider } from './provider-interface';
import { MockProvider } from './providers/mock-provider';
import { GeminiProvider } from './providers/gemini-provider';
import { LocalProvider } from './providers/local-provider';

export function getAIProvider(): AIProvider {
  const providerType = process.env.AI_PROVIDER || (process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED === 'true' ? 'mock' : 'gemini');

  if (providerType === 'local') {
    return new LocalProvider();
  }

  if (providerType === 'mock') {
    return new MockProvider();
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. Falling back to LocalProvider.');
    return new LocalProvider();
  }

  return new GeminiProvider(apiKey, process.env.GEMINI_MODEL || 'gemini-3.6-flash');
}
