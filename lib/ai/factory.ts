import { AIProvider } from './provider-interface';
import { MockProvider } from './providers/mock-provider';
import { GeminiProvider } from './providers/gemini-provider';
import { LocalProvider } from './providers/local-provider';

export function getAIProvider(): AIProvider {
  const providerType = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

  if (providerType === 'local') {
    return new LocalProvider();
  }

  if (providerType === 'mock') {
    return new MockProvider();
  }

  if (providerType === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[AI Provider Factory] AI_PROVIDER=gemini configured but GEMINI_API_KEY is missing. Using MockProvider for fallback.');
      return new MockProvider();
    }
    return new GeminiProvider(apiKey, process.env.GEMINI_MODEL || 'gemini-3.6-flash');
  }

  throw new Error(`Invalid AI_PROVIDER configuration: "${providerType}". Supported values: "local", "gemini", "mock".`);
}
