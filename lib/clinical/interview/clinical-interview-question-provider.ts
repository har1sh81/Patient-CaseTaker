/**
 * Task #9 — Clinical Interview Question Provider Abstraction & Implementations
 * MediKiosk Clinical Architecture
 * 
 * Provides hybrid LLM question phrasing with automatic safety validation
 * and zero-downtime deterministic library fallback.
 */

import type { GenerateQuestionInput, GenerateQuestionResult, ConversationalQuestion } from './types';
import { getConversationalSystemPrompt, buildConversationalUserPrompt, INTERVIEW_PROMPT_VERSION } from './conversational-question-generator';
import { validateConversationalQuestion } from './conversational-question-validator';
import { getLocalizedQuestionText } from './question-selector';

export interface ClinicalInterviewQuestionProvider {
  generateQuestion(input: GenerateQuestionInput): Promise<GenerateQuestionResult>;
}

/**
 * Deterministic Mock Provider for Natural Conversational Phrasing in Tests & Offline Dev
 */
export class MockClinicalInterviewQuestionProvider implements ClinicalInterviewQuestionProvider {
  async generateQuestion(input: GenerateQuestionInput): Promise<GenerateQuestionResult> {
    const fallbackLocalized = getLocalizedQuestionText(input.libraryFallbackQuestion, input.language);
    const domain = input.intent.domain.toLowerCase();
    const fact = input.intent.targetFact.toLowerCase();
    const lang = input.language;

    let conversationalText = fallbackLocalized.text;

    if (lang === 'en') {
      if (fact.includes('location')) {
        conversationalText = `Where in your ${domain.replace('_', ' ')} do you feel the pain most strongly?`;
      } else if (fact.includes('radiation')) {
        conversationalText = `Does the pain spread anywhere, such as your arm, shoulder, back, or jaw?`;
      } else if (fact.includes('duration') || fact.includes('onset')) {
        conversationalText = `When did this first start, and how long has it been bothering you?`;
      } else if (fact.includes('frequency')) {
        conversationalText = `About how many times has this happened today?`;
      } else if (fact.includes('character') || fact.includes('severity')) {
        conversationalText = `How would you describe the feeling — is it sharp, dull, burning, or squeezing?`;
      } else {
        conversationalText = `Could you tell me a bit more about your ${domain.replace('_', ' ')}?`;
      }
    } else if (lang === 'ta') {
      if (fact.includes('location')) {
        conversationalText = `உங்களுக்கு வலி எங்கு அதிகமாக இருக்கிறது என்று கூற முடியுமா?`;
      } else if (fact.includes('radiation')) {
        conversationalText = `இந்த வலி தோள், கை அல்லது முதுகிற்கு பரவுகிறதா?`;
      } else {
        conversationalText = `உங்களுக்கு இந்த பிரச்சனை எப்போது தொடங்கியது?`;
      }
    } else if (lang === 'hi') {
      if (fact.includes('location')) {
        conversationalText = `आपको दर्द सबसे ज्यादा कहाँ महसूस हो रहा है?`;
      } else if (fact.includes('radiation')) {
        conversationalText = `क्या यह दर्द आपके हाथ, कंधे या पीठ में भी जा रहा है?`;
      } else {
        conversationalText = `यह तकलीफ आपको कब से हो रही है?`;
      }
    }

    const validation = validateConversationalQuestion(conversationalText, input);
    if (!validation.passed) {
      return {
        questionText: fallbackLocalized.text,
        generationMode: 'library_fallback',
        reason: `Mock validation failed: ${validation.rejectionReason}`,
      };
    }

    return {
      questionText: conversationalText,
      generationMode: 'llm',
      provider: 'mock-conversational-v1',
      model: 'deterministic-mock-v1',
    };
  }
}

/**
 * Real OpenAI / LLM Compatible Provider with short timeout and fallback
 */
export class OpenAICompatibleInterviewQuestionProvider implements ClinicalInterviewQuestionProvider {
  private providerName: string;
  private modelName: string;
  private apiKey: string;
  private endpoint: string;
  private timeoutMs: number;

  constructor(options?: {
    providerName?: string;
    modelName?: string;
    apiKey?: string;
    endpoint?: string;
    timeoutMs?: number;
  }) {
    this.providerName = options?.providerName || process.env.INTERVIEW_LLM_PROVIDER || 'openai-compatible';
    this.modelName = options?.modelName || process.env.INTERVIEW_LLM_MODEL || 'gpt-4o-mini';
    this.apiKey = options?.apiKey || process.env.INTERVIEW_LLM_API_KEY || process.env.OPENAI_API_KEY || '';
    this.endpoint = options?.endpoint || process.env.INTERVIEW_LLM_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
    this.timeoutMs = options?.timeoutMs || 6000; // 6 seconds maximum timeout boundary
  }

  async generateQuestion(input: GenerateQuestionInput): Promise<GenerateQuestionResult> {
    const fallbackLocalized = getLocalizedQuestionText(input.libraryFallbackQuestion, input.language);

    if (!this.apiKey && process.env.NODE_ENV !== 'test') {
      const mockProvider = new MockClinicalInterviewQuestionProvider();
      return mockProvider.generateQuestion(input);
    }

    const systemPrompt = getConversationalSystemPrompt(input.language);
    const userPrompt = buildConversationalUserPrompt(input);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
          max_tokens: 150,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        return {
          questionText: fallbackLocalized.text,
          generationMode: 'library_fallback',
          reason: `LLM HTTP Error ${response.status}: ${response.statusText}`,
        };
      }

      const responseData = await response.json();
      const rawOutputText = responseData.choices?.[0]?.message?.content?.trim();

      if (!rawOutputText) {
        return {
          questionText: fallbackLocalized.text,
          generationMode: 'library_fallback',
          reason: 'LLM returned empty completion',
        };
      }

      // Safety Validation
      const validation = validateConversationalQuestion(rawOutputText, input);
      if (!validation.passed) {
        return {
          questionText: fallbackLocalized.text,
          generationMode: 'library_fallback',
          reason: `Safety validation rejected LLM output: ${validation.rejectionReason}`,
        };
      }

      return {
        questionText: rawOutputText,
        generationMode: 'llm',
        provider: this.providerName,
        model: this.modelName,
      };
    } catch (err: any) {
      clearTimeout(timer);
      const isAbort = err?.name === 'AbortError';
      return {
        questionText: fallbackLocalized.text,
        generationMode: 'library_fallback',
        reason: isAbort ? 'LLM call timed out' : `LLM Exception: ${err?.message}`,
      };
    }
  }
}

export function getClinicalInterviewQuestionProvider(): ClinicalInterviewQuestionProvider {
  const providerType = process.env.INTERVIEW_LLM_PROVIDER;
  if (providerType === 'mock' || !process.env.INTERVIEW_LLM_API_KEY && !process.env.OPENAI_API_KEY) {
    return new MockClinicalInterviewQuestionProvider();
  }
  return new OpenAICompatibleInterviewQuestionProvider();
}
