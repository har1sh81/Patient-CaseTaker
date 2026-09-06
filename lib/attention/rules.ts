import { FlagSeverity, ConversationAnswer, DocumentExtractionResult, MedicalTimeline, DataProvenance } from '../../types';

export interface EvaluationContext {
  answers: ConversationAnswer[];
  extractions: DocumentExtractionResult[];
  timeline: MedicalTimeline | null;
}

export interface EvaluationResult {
  message: string;
  evidence: string[]; // Human-readable explanations
  provenance: DataProvenance[]; // DataProvenance[]
}

export interface AttentionRule {
  ruleId: string;
  name: string;
  description: string;
  severity: FlagSeverity;
  evaluate: (context: EvaluationContext) => EvaluationResult | null;
}

function matchesAnswerKeywords(a: ConversationAnswer | undefined, validKeywords: string[]): boolean {
  if (!a) return false;
  const valuesToTest = [a.rawValue, a.normalizedValue, a.transcript]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.toLowerCase());

  return validKeywords.some((kw) => valuesToTest.some((v) => v === kw || v.includes(kw)));
}

export const ATTENTION_RULES: AttentionRule[] = [
  {
    ruleId: 'chest_pain_with_breathlessness',
    name: 'Chest Discomfort + Breathing Difficulty',
    description: 'Patient reports chest discomfort combined with breathing difficulty.',
    severity: 'high',
    evaluate: (context) => {
      // Find chest pain answer
      const chestPainAnswer = context.answers.find(
        (a) =>
          a.questionId.includes('chest_pain') &&
          matchesAnswerKeywords(a, ['yes', 'true', 'severe', 'chest pain', 'discomfort'])
      );

      const breathlessnessAnswer = context.answers.find(
        (a) =>
          a.questionId.includes('breathing') &&
          matchesAnswerKeywords(a, ['yes', 'true', 'severe', 'shortness of breath', 'breathlessness'])
      );

      if (chestPainAnswer && breathlessnessAnswer) {
        return {
          message:
            'Potentially urgent symptoms (chest discomfort and breathing difficulty) reported. Prompt clinical assessment recommended.',
          evidence: [
            `Question: ${chestPainAnswer.questionId} - Answer: ${String(chestPainAnswer.normalizedValue || chestPainAnswer.rawValue)}`,
            `Question: ${breathlessnessAnswer.questionId} - Answer: ${String(breathlessnessAnswer.normalizedValue || breathlessnessAnswer.rawValue)}`,
          ],
          provenance: [
            { source: 'patient_text', sourceId: chestPainAnswer.questionId },
            { source: 'patient_text', sourceId: breathlessnessAnswer.questionId },
          ],
        };
      }

      return null;
    },
  },
  {
    ruleId: 'sudden_weakness_speech',
    name: 'Sudden Weakness + Speech Difficulty',
    description: 'Patient reports sudden weakness combined with speech difficulty.',
    severity: 'critical',
    evaluate: (context) => {
      const weaknessAnswer = context.answers.find(
        (a) =>
          a.questionId.includes('weakness') &&
          matchesAnswerKeywords(a, ['yes', 'true', 'sudden', 'severe', 'weakness'])
      );

      const speechAnswer = context.answers.find(
        (a) =>
          a.questionId.includes('speech') &&
          matchesAnswerKeywords(a, ['yes', 'true', 'slurred', 'speech difficulty'])
      );

      if (weaknessAnswer && speechAnswer) {
        return {
          message:
            'Potential emergency symptoms (sudden weakness and speech difficulty) detected. Immediate clinical assessment required.',
          evidence: [
            `Question: ${weaknessAnswer.questionId} - Answer: ${String(weaknessAnswer.normalizedValue || weaknessAnswer.rawValue)}`,
            `Question: ${speechAnswer.questionId} - Answer: ${String(speechAnswer.normalizedValue || speechAnswer.rawValue)}`,
          ],
          provenance: [
            { source: 'patient_text', sourceId: weaknessAnswer.questionId },
            { source: 'patient_text', sourceId: speechAnswer.questionId },
          ],
        };
      }

      return null;
    },
  },
  {
    ruleId: 'data_conflict_detected',
    name: 'Data Conflict in Timeline',
    description: 'Timeline contains records with conflicting information requiring review.',
    severity: 'medium',
    evaluate: (context) => {
      if (!context.timeline || !context.timeline.records) return null;

      const conflictingRecords = context.timeline.records.filter((r) => r.status === 'conflict');

      if (conflictingRecords.length > 0) {
        const evidence: string[] = [];
        const provenance: DataProvenance[] = [];

        conflictingRecords.forEach((record) => {
          evidence.push(
            `Conflicting record found for category: ${record.category}. Original values: ${record.originalValues.join(', ')}`
          );
          if (record.provenances) {
            provenance.push(...record.provenances);
          }
        });

        return {
          message: 'Conflicting information was detected across data sources. Clinical review required.',
          evidence,
          provenance,
        };
      }

      return null;
    },
  },
];
