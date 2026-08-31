import { ConversationAnswer, Question } from '@/types';
import { LocalClinicalNLP } from '@/lib/ai/local-nlp';

export interface DomainStatus {
  domain: string;
  status: 'COMPLETE' | 'PARTIAL' | 'MISSING';
  value?: string;
}

export interface AdaptiveContext {
  combinedText: string;
  answersMap: Record<string, ConversationAnswer>;
  askedIds: Set<string>;
  allowedQuestionIds: string[];
  nlpResult: ReturnType<typeof LocalClinicalNLP.extractFacts>;
  mentionsChest: boolean;
  mentionsGI: boolean;
  mentionsHeadache: boolean;
}

export function buildAdaptiveContext(
  answers: Record<string, ConversationAnswer>,
  latestAnswer: ConversationAnswer | null,
  allowedQuestionIds: string[],
  language: 'en' | 'hi' | 'ta' = 'en'
): AdaptiveContext {
  const prevAnswers = Object.values(answers);
  const latestText = latestAnswer
    ? String(latestAnswer.transcript || latestAnswer.rawValue || latestAnswer.normalizedValue || '')
    : '';

  const combinedText = [...prevAnswers.map(a => String(a.transcript || a.rawValue || a.normalizedValue || '')), latestText]
    .filter(Boolean)
    .join(' ');

  const answersMap: Record<string, ConversationAnswer> = {};
  prevAnswers.forEach(a => { answersMap[a.questionId] = a; });
  if (latestAnswer?.questionId) {
    answersMap[latestAnswer.questionId] = latestAnswer;
  }

  const askedIds = new Set(Object.keys(answersMap));
  const nlpResult = LocalClinicalNLP.extractFacts(combinedText, language);

  const mentionsChest = /chest|heart|cardiac|angina|stern/i.test(combinedText);
  const mentionsGI = /stomach|abdomen|abdominal|epigastri|belly|digest|gastric|acid|reflux|burn/i.test(combinedText);
  const mentionsHeadache = /headache|migraine|head pain/i.test(combinedText);

  return {
    combinedText,
    answersMap,
    askedIds,
    allowedQuestionIds,
    nlpResult,
    mentionsChest,
    mentionsGI,
    mentionsHeadache,
  };
}

export function evaluateDomainCompleteness(ctx: AdaptiveContext): Record<string, DomainStatus> {
  const { answersMap, nlpResult } = ctx;
  
  return {
    chief_complaint: {
      domain: 'chief_complaint',
      status: (answersMap['reason_for_visit'] || nlpResult.primarySymptom) ? 'COMPLETE' : 'MISSING',
      value: nlpResult.primarySymptom || (answersMap['reason_for_visit']?.rawValue as string),
    },
    onset_duration: {
      domain: 'onset_duration',
      status: (answersMap['symptom_duration'] || nlpResult.duration) ? 'COMPLETE' : 'MISSING',
      value: nlpResult.duration || (answersMap['symptom_duration']?.rawValue as string),
    },
    location: {
      domain: 'location',
      status: (answersMap['pain_location'] || nlpResult.location) ? 'COMPLETE' : 'MISSING',
      value: nlpResult.location || (answersMap['pain_location']?.rawValue as string),
    },
    character_quality: {
      domain: 'character_quality',
      status: (answersMap['symptom_character'] || nlpResult.character) ? 'COMPLETE' : 'MISSING',
      value: nlpResult.character || (answersMap['symptom_character']?.rawValue as string),
    },
    severity: {
      domain: 'severity',
      status: (answersMap['pain_scale'] || nlpResult.painScore || nlpResult.severity) ? 'COMPLETE' : 'MISSING',
      value: nlpResult.painScore ? `${nlpResult.painScore}/10` : (nlpResult.severity || (answersMap['pain_scale']?.rawValue as string)),
    },
    progression: {
      domain: 'progression',
      status: (answersMap['symptom_progression'] || nlpResult.progression) ? 'COMPLETE' : 'MISSING',
      value: nlpResult.progression || (answersMap['symptom_progression']?.rawValue as string),
    },
    aggravating_relieving: {
      domain: 'aggravating_relieving',
      status: (answersMap['aggravating_relieving'] || answersMap['stomach_pain_triggers'] || nlpResult.aggravatingFactors || nlpResult.relievingFactors) ? 'COMPLETE' : 'MISSING',
      value: nlpResult.aggravatingFactors || nlpResult.relievingFactors || (answersMap['aggravating_relieving']?.rawValue as string) || (answersMap['stomach_pain_triggers']?.rawValue as string),
    },
    associated_symptoms: {
      domain: 'associated_symptoms',
      status: (answersMap['associated_symptoms'] || answersMap['gi_red_flags'] || answersMap['cardiac_radiation_check'] || nlpResult.associatedSymptoms || nlpResult.negatedSymptoms.length > 0) ? 'COMPLETE' : 'MISSING',
      value: (answersMap['associated_symptoms']?.rawValue as string) || (answersMap['gi_red_flags']?.rawValue as string) || (nlpResult.negatedSymptoms.length ? `No ${nlpResult.negatedSymptoms.join(', ')}` : undefined),
    },
    previous_treatments: {
      domain: 'previous_treatments',
      status: (answersMap['previous_treatments'] || nlpResult.previousTreatments) ? 'COMPLETE' : 'MISSING',
      value: nlpResult.previousTreatments || (answersMap['previous_treatments']?.rawValue as string),
    },
  };
}

export function isQuestionRelevant(
  questionId: string,
  ctx: AdaptiveContext
): boolean {
  switch (questionId) {
    case 'cardiac_radiation_check':
      return ctx.mentionsChest;
    case 'stomach_pain_triggers':
    case 'gi_red_flags':
      return ctx.mentionsGI;
    case 'associated_symptoms':
      return true; // Always relevant as general review of systems
    default:
      return true;
  }
}

export function selectNextQuestion(
  ctx: AdaptiveContext,
  domains: Record<string, DomainStatus>
): string | undefined {
  const { askedIds, allowedQuestionIds, mentionsChest, mentionsGI, nlpResult } = ctx;

  if (!askedIds.has('reason_for_visit') && allowedQuestionIds.includes('reason_for_visit')) {
    return 'reason_for_visit';
  }

  const hasDuration = Boolean(nlpResult.duration) || askedIds.has('symptom_duration');
  const hasLocation = Boolean(nlpResult.location) || askedIds.has('pain_location');
  const hasCharacter = Boolean(nlpResult.character) || askedIds.has('symptom_character');
  const hasSeverity = Boolean(nlpResult.painScore) || Boolean(nlpResult.severity) || askedIds.has('pain_scale');
  const hasProgression = Boolean(nlpResult.progression) || askedIds.has('symptom_progression');
  const hasAggRel = Boolean(nlpResult.aggravatingFactors) || Boolean(nlpResult.relievingFactors) || askedIds.has('aggravating_relieving') || askedIds.has('stomach_pain_triggers');
  const hasAssoc = Boolean(nlpResult.associatedSymptoms) || askedIds.has('associated_symptoms') || askedIds.has('gi_red_flags') || askedIds.has('cardiac_radiation_check');
  const hasPrevTreat = Boolean(nlpResult.previousTreatments) || askedIds.has('previous_treatments');

  if (!hasDuration && !askedIds.has('symptom_duration') && allowedQuestionIds.includes('symptom_duration')) {
    return 'symptom_duration';
  }
  if (!hasLocation && !askedIds.has('pain_location') && allowedQuestionIds.includes('pain_location')) {
    return 'pain_location';
  }
  if (!hasCharacter && !askedIds.has('symptom_character') && allowedQuestionIds.includes('symptom_character')) {
    return 'symptom_character';
  }
  if (!hasSeverity && !askedIds.has('pain_scale') && allowedQuestionIds.includes('pain_scale')) {
    return 'pain_scale';
  }
  if (!hasProgression && !askedIds.has('symptom_progression') && allowedQuestionIds.includes('symptom_progression')) {
    return 'symptom_progression';
  }
  if (!hasAggRel && !askedIds.has('aggravating_relieving') && allowedQuestionIds.includes('aggravating_relieving')) {
    return 'aggravating_relieving';
  }
  if (mentionsGI && !askedIds.has('stomach_pain_triggers') && allowedQuestionIds.includes('stomach_pain_triggers')) {
    return 'stomach_pain_triggers';
  }
  if (mentionsGI && !askedIds.has('gi_red_flags') && allowedQuestionIds.includes('gi_red_flags')) {
    return 'gi_red_flags';
  }
  if (mentionsChest && !askedIds.has('cardiac_radiation_check') && allowedQuestionIds.includes('cardiac_radiation_check')) {
    return 'cardiac_radiation_check';
  }
  if (!hasAssoc && !askedIds.has('associated_symptoms') && allowedQuestionIds.includes('associated_symptoms')) {
    return 'associated_symptoms';
  }
  if (!hasPrevTreat && !askedIds.has('previous_treatments') && allowedQuestionIds.includes('previous_treatments')) {
    return 'previous_treatments';
  }
  if (!askedIds.has('past_medical_history') && allowedQuestionIds.includes('past_medical_history')) {
    return 'past_medical_history';
  }
  if (!askedIds.has('current_medications') && allowedQuestionIds.includes('current_medications')) {
    return 'current_medications';
  }

  return allowedQuestionIds.find(id => {
    if (askedIds.has(id)) return false;
    if (id === 'cardiac_radiation_check' && !mentionsChest) return false;
    if ((id === 'stomach_pain_triggers' || id === 'gi_red_flags') && !mentionsGI) return false;
    return true;
  });
}

export function getCandidateQuestionIds(
  ctx: AdaptiveContext,
  domains: Record<string, DomainStatus>
): string[] {
  const { askedIds, allowedQuestionIds, mentionsChest, mentionsGI } = ctx;

  const candidateMap: Record<string, string> = {
    chief_complaint: 'reason_for_visit',
    onset_duration: 'symptom_duration',
    location: 'pain_location',
    character_quality: 'symptom_character',
    severity: 'pain_scale',
    progression: 'symptom_progression',
    aggravating_relieving: 'aggravating_relieving',
    associated_symptoms: 'associated_symptoms',
    previous_treatments: 'previous_treatments',
  };

  const candidates: string[] = [];

  for (const [domainKey, domainObj] of Object.entries(domains)) {
    if (domainObj.status !== 'COMPLETE') {
      const qId = candidateMap[domainKey];
      if (qId && allowedQuestionIds.includes(qId) && !askedIds.has(qId) && isQuestionRelevant(qId, ctx)) {
        if (!candidates.includes(qId)) candidates.push(qId);
      }
    }
  }

  // Add symptom-specific differential questions if relevant
  if (mentionsGI) {
    if (allowedQuestionIds.includes('stomach_pain_triggers') && !askedIds.has('stomach_pain_triggers')) {
      if (!candidates.includes('stomach_pain_triggers')) candidates.push('stomach_pain_triggers');
    }
    if (allowedQuestionIds.includes('gi_red_flags') && !askedIds.has('gi_red_flags')) {
      if (!candidates.includes('gi_red_flags')) candidates.push('gi_red_flags');
    }
  }
  if (mentionsChest) {
    if (allowedQuestionIds.includes('cardiac_radiation_check') && !askedIds.has('cardiac_radiation_check')) {
      if (!candidates.includes('cardiac_radiation_check')) candidates.push('cardiac_radiation_check');
    }
  }

  // Include general medical & medication history if unasked
  if (allowedQuestionIds.includes('past_medical_history') && !askedIds.has('past_medical_history')) {
    if (!candidates.includes('past_medical_history')) candidates.push('past_medical_history');
  }
  if (allowedQuestionIds.includes('current_medications') && !askedIds.has('current_medications')) {
    if (!candidates.includes('current_medications')) candidates.push('current_medications');
  }

  return candidates;
}