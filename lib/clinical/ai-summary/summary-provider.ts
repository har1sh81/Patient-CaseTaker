/**
 * Task #30 — AI Clinical Summary Provider Abstraction & Implementations
 * MediKiosk Clinical Engine
 * 
 * Configurable LLM provider abstraction supporting OpenAI-compatible endpoints
 * and a deterministic Mock provider for automated testing.
 */

import type { AiSummaryInput, AiSummaryGenerationResult, ClinicalSummaryProvider, AiClinicalSummary } from './types';
import { getClinicalSummarySystemPrompt, buildClinicalSummaryUserPrompt, AI_SUMMARY_PROMPT_VERSION } from './summary-prompt';
import { validateClinicalSummary } from './summary-validator';

/**
 * Deterministic Mock Clinical Summary Provider for Testing & Offline Dev
 */
export class MockClinicalSummaryProvider implements ClinicalSummaryProvider {
  async generateSummary(input: AiSummaryInput): Promise<AiSummaryGenerationResult> {
    const lang = input.summaryLanguage || 'en';
    const parts: string[] = [];

    // Heading / Context
    if (input.consultationContext?.chiefComplaint) {
      parts.push(`Patient presents with chief complaint of "${input.consultationContext.chiefComplaint}".`);
    }

    // Current Presentation & Symptoms
    if (input.currentPresentation && input.currentPresentation.length > 0) {
      const syms = input.currentPresentation.map(s => {
        if (s.isNegated) return `explicitly denies ${s.title}`;
        return s.summary || s.title;
      }).join(', ');
      parts.push(`Current presentation includes: ${syms}.`);
    }

    // Vitals
    if (input.vitals && input.vitals.length > 0) {
      const vText = input.vitals.map(v => `${v.title}: ${v.summary}`).join(', ');
      parts.push(`Documented vitals: ${vText}.`);
    }

    // Diagnoses
    if (input.diagnoses && input.diagnoses.length > 0) {
      const dText = input.diagnoses.map(d => `${d.title} (${d.verificationStatus || 'documented'})`).join(', ');
      parts.push(`Documented historical diagnoses: ${dText}.`);
    }

    // Medications
    if (input.medications && input.medications.length > 0) {
      const mText = input.medications.map(m => `${m.title} (${m.status || 'active'})`).join(', ');
      parts.push(`Documented medications: ${mText}.`);
    }

    // Lab Findings
    if (input.laboratoryFindings && input.laboratoryFindings.length > 0) {
      const lText = input.laboratoryFindings.map(l => {
        let labStr = `${l.title}: ${l.summary}`;
        if (l.interpretation) labStr += ` [Interpretation: ${l.interpretation}]`;
        if (l.needsReview) labStr += ` (Extraction Uncertainty Flagged)`;
        return labStr;
      }).join(', ');
      parts.push(`Laboratory findings: ${lText}.`);
    }

    // Procedures
    if (input.procedures && input.procedures.length > 0) {
      const pText = input.procedures.map(p => `${p.title} (Status: ${p.status || 'documented'})`).join(', ');
      parts.push(`Documented procedures: ${pText}.`);
    }

    // AYUSH Context
    if (input.ayushContext && input.ayushContext.length > 0) {
      const aText = input.ayushContext.map(a => `${a.title}: ${a.summary}`).join(', ');
      parts.push(`AYUSH assessment context: ${aText}.`);
    }

    // Conflicts
    if (input.unresolvedConflicts && input.unresolvedConflicts.length > 0) {
      const cText = input.unresolvedConflicts.map(c => c.explanation || c.conflictType).join('; ');
      parts.push(`Unresolved documentation conflicts requiring clinician review: ${cText}.`);
    }

    // Uncertainties
    if (input.uncertainties && input.uncertainties.length > 0) {
      const uText = input.uncertainties.map(u => `${u.title}: ${u.summary}`).join('; ');
      parts.push(`Documented uncertainties: ${uText}.`);
    }

    // Missing Info
    if (input.missingInformation && input.missingInformation.length > 0) {
      const miText = input.missingInformation.join('; ');
      parts.push(`Missing documentation noted: ${miText}.`);
    }

    // Append Mandatory Disclaimer
    parts.push('AI-Generated Draft — Physician Review Required');

    let summaryText = parts.join(' ');

    if (lang === 'ta') {
      summaryText = `[தமிழ் Draft] ${summaryText}`;
    } else if (lang === 'hi') {
      summaryText = `[हिंदी Draft] ${summaryText}`;
    }

    const validation = validateClinicalSummary(summaryText, input);
    if (!validation.passed) {
      return {
        success: false,
        errorCode: 'AI_SUMMARY_SAFETY_VALIDATION_FAILED',
        error: validation.rejectionReason || 'Safety validation failed',
        warnings: validation.warnings,
      };
    }

    const summary: AiClinicalSummary = {
      summaryText,
      status: 'draft',
      generatedAt: new Date().toISOString(),
      modelProvider: 'mock-provider',
      modelName: 'deterministic-mock-v1',
      promptVersion: AI_SUMMARY_PROMPT_VERSION,
      sourceSynthesisVersion: '1.0',
      sourceFingerprint: 'mock-fingerprint',
      safetyCheckStatus: validation.safetyCheckStatus,
      physicianReviewRequired: true,
      generationWarnings: validation.warnings,
    };

    return {
      success: true,
      data: summary,
    };
  }
}

/**
 * OpenAI-Compatible Clinical Summary Provider
 */
export class OpenAICompatibleSummaryProvider implements ClinicalSummaryProvider {
  private providerName: string;
  private modelName: string;
  private apiKey: string;
  private endpoint: string;

  constructor(options?: { providerName?: string; modelName?: string; apiKey?: string; endpoint?: string }) {
    this.providerName = options?.providerName || process.env.AI_SUMMARY_PROVIDER || 'openai-compatible';
    this.modelName = options?.modelName || process.env.AI_SUMMARY_MODEL || 'gpt-4o-mini';
    this.apiKey = options?.apiKey || process.env.AI_SUMMARY_API_KEY || '';
    this.endpoint = options?.endpoint || process.env.AI_SUMMARY_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
  }

  async generateSummary(input: AiSummaryInput): Promise<AiSummaryGenerationResult> {
    if (!this.apiKey && process.env.NODE_ENV !== 'test') {
      // Fallback to Mock provider if API key is unconfigured in development
      const mockProvider = new MockClinicalSummaryProvider();
      return mockProvider.generateSummary(input);
    }

    const systemPrompt = getClinicalSummarySystemPrompt(input.summaryLanguage);
    const userPrompt = buildClinicalSummaryUserPrompt(input);

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
          temperature: 0.1, // Conservative temperature for fact grounding
          max_tokens: 600,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          errorCode: 'AI_SUMMARY_UNAVAILABLE',
          error: `Provider HTTP error ${response.status}: ${response.statusText}`,
        };
      }

      const responseData = await response.json();
      const rawSummaryText = responseData.choices?.[0]?.message?.content?.trim();

      if (!rawSummaryText) {
        return {
          success: false,
          errorCode: 'AI_SUMMARY_UNAVAILABLE',
          error: 'Provider returned empty completion content',
        };
      }

      // Ensure mandatory disclaimer is present
      let summaryText = rawSummaryText;
      if (!summaryText.includes('AI-Generated Draft — Physician Review Required')) {
        summaryText = `${summaryText}\n\nAI-Generated Draft — Physician Review Required`;
      }

      const validation = validateClinicalSummary(summaryText, input);
      if (!validation.passed) {
        return {
          success: false,
          errorCode: 'AI_SUMMARY_SAFETY_VALIDATION_FAILED',
          error: validation.rejectionReason || 'Safety validation failed',
          warnings: validation.warnings,
        };
      }

      const summary: AiClinicalSummary = {
        summaryText,
        status: 'draft',
        generatedAt: new Date().toISOString(),
        modelProvider: this.providerName,
        modelName: this.modelName,
        promptVersion: AI_SUMMARY_PROMPT_VERSION,
        sourceSynthesisVersion: '1.0',
        sourceFingerprint: 'generated-fingerprint',
        safetyCheckStatus: validation.safetyCheckStatus,
        physicianReviewRequired: true,
        generationWarnings: validation.warnings,
      };

      return {
        success: true,
        data: summary,
      };
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'AI_SUMMARY_UNAVAILABLE',
        error: err.message || 'Failed to communicate with AI summary provider',
      };
    }
  }
}

/**
 * Resolve configured Clinical Summary Provider
 */
export function getClinicalSummaryProvider(overrideProvider?: ClinicalSummaryProvider): ClinicalSummaryProvider {
  if (overrideProvider) return overrideProvider;

  const providerType = (process.env.AI_SUMMARY_PROVIDER || 'mock').toLowerCase();

  if (providerType === 'mock' || providerType === 'local-mock' || process.env.NODE_ENV === 'test') {
    return new MockClinicalSummaryProvider();
  }

  return new OpenAICompatibleSummaryProvider();
}
