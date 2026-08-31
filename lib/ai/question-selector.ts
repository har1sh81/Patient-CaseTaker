import { AdaptiveContext, DomainStatus, selectNextQuestion } from '../conversation/adaptive-logic';
import { GoogleGenAI, Type, Schema } from '@google/genai';

export interface QuestionSelectorRequest {
  context: AdaptiveContext;
  domains: Record<string, DomainStatus>;
  candidates: string[];
}

export interface QuestionSelectorResponse {
  selectedQuestionId?: string;
  providerUsed: 'local' | 'gemini';
  fallbackUsed: boolean;
  reasoning?: string;
}

export interface QuestionSelector {
  selectQuestion(req: QuestionSelectorRequest): Promise<QuestionSelectorResponse>;
}

export class LocalQuestionSelector implements QuestionSelector {
  async selectQuestion(req: QuestionSelectorRequest): Promise<QuestionSelectorResponse> {
    const selected = selectNextQuestion(req.context, req.domains);
    return {
      selectedQuestionId: selected,
      providerUsed: 'local',
      fallbackUsed: false,
      reasoning: 'Selected deterministically based on missing 9-domain coverage priority.'
    };
  }
}

export class GeminiQuestionSelector implements QuestionSelector {
  private ai: GoogleGenAI | null = null;
  private modelName: string;
  private localFallback: LocalQuestionSelector;

  constructor(apiKey?: string, modelName: string = 'gemini-3.6-flash') {
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
    this.modelName = modelName;
    this.localFallback = new LocalQuestionSelector();
  }

  async selectQuestion(req: QuestionSelectorRequest): Promise<QuestionSelectorResponse> {
    const localResult = await this.localFallback.selectQuestion(req);

    // If no candidate questions remain or Gemini API is unconfigured, return local result
    if (!this.ai || req.candidates.length === 0) {
      return localResult;
    }

    try {
      // Build minimal privacy-focused structured prompt (NO PII, NO raw DB dumps)
      const prompt = `
You are a medical adaptive question reasoning assistant for an automated kiosk.
Your ONLY task is to select the single best next question ID from the provided candidate list.

CURRENT CLINICAL CONTEXT (Extracted Locally):
- Primary Symptom: ${req.context.nlpResult.primarySymptom || 'Not specified'}
- Duration: ${req.context.nlpResult.duration || 'Not specified'}
- Location: ${req.context.nlpResult.location || 'Not specified'}
- Severity: ${req.context.nlpResult.severity || req.context.nlpResult.painScore || 'Not specified'}
- Aggravating Factors: ${req.context.nlpResult.aggravatingFactors || 'Not specified'}

MISSING 9-DOMAIN COVERAGE:
${Object.entries(req.domains)
  .filter(([_, d]) => d.status !== 'COMPLETE')
  .map(([k, d]) => `- Domain: ${k} (Status: ${d.status})`)
  .join('\n')}

APPROVED CANDIDATE QUESTION IDs:
${req.candidates.map(c => `- ${c}`).join('\n')}

SAFETY & RESTRICTION RULES:
1. You MUST pick exactly ONE questionId from the APPROVED CANDIDATE QUESTION IDs listed above.
2. DO NOT invent new question IDs.
3. DO NOT generate patient text or medical diagnosis.
4. Return JSON only in the specified schema.
`;

      const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          questionId: { type: Type.STRING, nullable: true },
          reasoning: { type: Type.STRING, nullable: true }
        },
        required: ['questionId']
      };

      const timeoutMs = 4000; // 4s timeout for snappy UI
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Gemini Question Selector Timeout')), timeoutMs);
      });

      const response = await Promise.race([
        this.ai.models.generateContent({
          model: this.modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.1,
          }
        }),
        timeoutPromise
      ]);

      const text = response.text;
      if (!text) throw new Error('Empty text from Gemini Question Selector');

      const parsed = JSON.parse(text);
      const chosenId = parsed.questionId;

      // Validate that the chosen ID belongs to the approved candidate list
      if (chosenId && req.candidates.includes(chosenId)) {
        return {
          selectedQuestionId: chosenId,
          providerUsed: 'gemini',
          fallbackUsed: false,
          reasoning: parsed.reasoning || 'Gemini selected next question from candidate list.'
        };
      }

      console.warn(`[GeminiQuestionSelector] Chosen ID "${chosenId}" not in candidate list. Falling back to local selector.`);
      return {
        ...localResult,
        fallbackUsed: true,
        reasoning: `Gemini returned invalid or unapproved question ID "${chosenId}". Fell back to local deterministic selection.`
      };
    } catch (err) {
      console.warn('[GeminiQuestionSelector] Error/timeout during selection:', (err as Error).message);
      return {
        ...localResult,
        fallbackUsed: true,
        reasoning: `Gemini selection failed (${(err as Error).message}). Fell back to local deterministic selection.`
      };
    }
  }
}
