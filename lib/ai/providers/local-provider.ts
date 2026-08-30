import { AIProvider } from '../provider-interface';
import { AdaptiveQuestionRequest, AdaptiveQuestionResponse, ReportGenerationRequest, ReportGenerationResponse } from '../../../types';
import { LocalClinicalNLP } from '../local-nlp';
import { composeClinicalConsultationSummary } from '../../reports/report-composer';

export class LocalProvider implements AIProvider {
  async analyzeAnswer(request: AdaptiveQuestionRequest): Promise<AdaptiveQuestionResponse> {
    const prevAnswers = ((request as any).answersHistory || (request as any).previousAnswers || []);
    const latestText = typeof request.latestAnswer?.rawValue === 'string'
      ? request.latestAnswer.rawValue
      : String(request.latestAnswer?.transcript || '');

    const combinedText = [
      ...prevAnswers.map((a: any) => String(a.transcript || a.rawValue || a.normalizedValue || '')),
      latestText
    ].filter(Boolean).join(' ');

    const lang = request.language === 'hi' ? 'hi' : request.language === 'ta' ? 'ta' : 'en';

    // 1. Run Local Clinical NLP over all combined text
    const nlpResult = LocalClinicalNLP.extractFacts(combinedText, lang);

    // 2. Map facts
    const extractedFacts = nlpResult.facts.map(f => ({
      field: f.entityType,
      value: `${f.normalizedValue}${f.negated ? ' (NEGATED)' : ''}`,
      confidence: f.confidence > 0.8 ? ('high' as const) : ('medium' as const),
    }));

    // 3. Determine Next Question ID dynamically across 9 current-problem domains
    const answersMap: Record<string, any> = {};
    prevAnswers.forEach((a: any) => {
      answersMap[a.questionId] = a;
    });
    if (request.latestAnswer?.questionId) {
      answersMap[request.latestAnswer.questionId] = request.latestAnswer;
    }

    const askedIds = new Set(Object.keys(answersMap));
    const allowed = request.allowedQuestionIds || [];
    const isSafetyNo = askedIds.has('safety_check') && (answersMap['safety_check']?.rawValue === 'no' || answersMap['safety_check']?.rawValue === false);
    let nextQuestionId: string | undefined;

    const hasLocation = Boolean(nlpResult.location) || askedIds.has('pain_location') || isSafetyNo;
    const hasCharacter = Boolean(nlpResult.character) || askedIds.has('symptom_character');
    const hasDuration = Boolean(nlpResult.duration) || askedIds.has('symptom_duration');
    const hasSeverity = Boolean(nlpResult.painScore) || Boolean(nlpResult.severity) || askedIds.has('pain_scale');
    const hasProgression = Boolean(nlpResult.progression) || askedIds.has('symptom_progression');
    const hasAggRel = Boolean(nlpResult.aggravatingFactors) || Boolean(nlpResult.relievingFactors) || askedIds.has('aggravating_relieving');
    const hasAssoc = Boolean(nlpResult.associatedSymptoms) || askedIds.has('associated_symptoms');
    const hasPrevTreat = Boolean(nlpResult.previousTreatments) || askedIds.has('previous_treatments');

    if (!hasDuration && allowed.includes('symptom_duration')) {
      nextQuestionId = 'symptom_duration';
    } else if (!hasLocation && allowed.includes('pain_location')) {
      nextQuestionId = 'pain_location';
    } else if (!hasCharacter && allowed.includes('symptom_character')) {
      nextQuestionId = 'symptom_character';
    } else if (!hasSeverity && allowed.includes('pain_scale')) {
      nextQuestionId = 'pain_scale';
    } else if (!hasProgression && allowed.includes('symptom_progression')) {
      nextQuestionId = 'symptom_progression';
    } else if (!hasAggRel && allowed.includes('aggravating_relieving')) {
      nextQuestionId = 'aggravating_relieving';
    } else if (!hasAssoc && allowed.includes('associated_symptoms')) {
      nextQuestionId = 'associated_symptoms';
    } else if (!hasPrevTreat && allowed.includes('previous_treatments')) {
      nextQuestionId = 'previous_treatments';
    } else if (!askedIds.has('past_medical_history') && allowed.includes('past_medical_history')) {
      nextQuestionId = 'past_medical_history';
    } else if (!askedIds.has('current_medications') && allowed.includes('current_medications')) {
      nextQuestionId = 'current_medications';
    } else {
      // Pick the first allowed question if available
      nextQuestionId = allowed[0];
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
