import { AIProvider } from '../provider-interface';
import { AdaptiveQuestionRequest, AdaptiveQuestionResponse, ReportGenerationRequest, ReportGenerationResponse } from '../../../types';
import { LocalClinicalNLP } from '../local-nlp';
import { composeClinicalConsultationSummary } from '../../reports/report-composer';

export class LocalProvider implements AIProvider {
  async analyzeAnswer(request: AdaptiveQuestionRequest): Promise<AdaptiveQuestionResponse> {
    const text = typeof request.latestAnswer?.rawValue === 'string'
      ? request.latestAnswer.rawValue
      : String(request.latestAnswer?.transcript || '');

    const lang = request.language === 'hi' ? 'hi' : request.language === 'ta' ? 'ta' : 'en';

    // 1. Run Local Clinical NLP
    const nlpResult = LocalClinicalNLP.extractFacts(text, lang);

    // 2. Map facts
    const extractedFacts = nlpResult.facts.map(f => ({
      field: f.entityType,
      value: `${f.normalizedValue}${f.negated ? ' (NEGATED)' : ''}`,
      confidence: f.confidence > 0.8 ? ('high' as const) : ('medium' as const),
    }));

    // 3. Determine Next Question ID dynamically across 9 current-problem domains
    const answersMap: Record<string, any> = {};
    const prevAnswers = ((request as any).answersHistory || (request as any).previousAnswers || []);
    prevAnswers.forEach((a: any) => {
      answersMap[a.questionId] = a;
    });

    const askedIds = new Set(prevAnswers.map((a: any) => a.questionId));
    let nextQuestionId: string | undefined;

    const hasLocation = Boolean(nlpResult.location) || askedIds.has('pain_location');
    const hasCharacter = Boolean(nlpResult.character) || askedIds.has('symptom_character');
    const hasDuration = Boolean(nlpResult.duration) || askedIds.has('symptom_duration');
    const hasSeverity = Boolean(nlpResult.painScore) || Boolean(nlpResult.severity) || askedIds.has('pain_scale');
    const hasProgression = Boolean(nlpResult.progression) || askedIds.has('symptom_progression');
    const hasAggRel = Boolean(nlpResult.aggravatingFactors) || Boolean(nlpResult.relievingFactors) || askedIds.has('aggravating_relieving');
    const hasAssoc = Boolean(nlpResult.associatedSymptoms) || askedIds.has('associated_symptoms');
    const hasPrevTreat = Boolean(nlpResult.previousTreatments) || askedIds.has('previous_treatments');

    if (!hasDuration) {
      nextQuestionId = 'symptom_duration';
    } else if (!hasLocation) {
      nextQuestionId = 'pain_location';
    } else if (!hasCharacter) {
      nextQuestionId = 'symptom_character';
    } else if (!hasSeverity) {
      nextQuestionId = 'pain_scale';
    } else if (!hasProgression) {
      nextQuestionId = 'symptom_progression';
    } else if (!hasAggRel) {
      nextQuestionId = 'aggravating_relieving';
    } else if (!hasAssoc) {
      nextQuestionId = 'associated_symptoms';
    } else if (!hasPrevTreat) {
      nextQuestionId = 'previous_treatments';
    } else if (!askedIds.has('past_medical_history')) {
      nextQuestionId = 'past_medical_history';
    } else if (!askedIds.has('current_medications')) {
      nextQuestionId = 'current_medications';
    }

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
