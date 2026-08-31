import { AIProvider } from '../provider-interface';
import { AdaptiveQuestionRequest, AdaptiveQuestionResponse, ReportGenerationRequest, ReportGenerationResponse, ConversationAnswer } from '../../../types';
import { LocalClinicalNLP } from '../local-nlp';
import { composeClinicalConsultationSummary } from '../../reports/report-composer';
import { buildAdaptiveContext, evaluateDomainCompleteness, selectNextQuestion } from '@/lib/conversation/adaptive-logic';

export class LocalProvider implements AIProvider {
  async analyzeAnswer(request: AdaptiveQuestionRequest): Promise<AdaptiveQuestionResponse> {
    const lang = request.language === 'hi' ? 'hi' : request.language === 'ta' ? 'ta' : 'en';

    // Build adaptive context using shared logic
    const ctx = buildAdaptiveContext(
      (request as any).previousAnswers || [],
      request.latestAnswer || null,
      request.allowedQuestionIds || [],
      lang
    );

    // Map facts from NLP
    const extractedFacts = ctx.nlpResult.facts.map(f => ({
      field: f.entityType,
      value: `${f.normalizedValue}${f.negated ? ' (NEGATED)' : ''}`,
      confidence: f.confidence > 0.8 ? ('high' as const) : ('medium' as const),
    }));

    // Evaluate domain completeness
    const domains = evaluateDomainCompleteness(ctx);

    // Select next question using shared logic
    const nextQuestionId = selectNextQuestion(ctx, domains);
    const isComplete = !nextQuestionId;

    return {
      extractedFacts,
      missingInformation: [],
      nextAction: isComplete ? 'complete_section' : 'ask_follow_up',
      nextQuestionId,
      confidence: 'high',
    };
  }

  async generateClinicalHistoryDraft(request: ReportGenerationRequest): Promise<ReportGenerationResponse> {
    const summary = composeClinicalConsultationSummary({
      session: request.session,
      patient: request.patient,
      answers: request.answers,
    });

    return {
      report: summary as any,
      validation: { passed: true, missingRequiredSections: [], warnings: [] },
      generationMetadata: {
        model: 'local-nlp-v1',
        provider: 'local',
        latencyMs: 1,
        tokensUsed: 0,
      },
    } as any;
  }
}
