import { z } from 'zod';
import { SupportedLanguageSchema, DataProvenanceSchema } from './common.schema';

export const ClinicalSectionSchema = z.enum([
  'chief_complaint',
  'hpi',
  'past_medical_history',
  'past_surgical_history',
  'medications',
  'allergies',
  'family_history',
  'personal_history',
  'social_history',
  'review_of_systems',
  'documents',
  'ayush',
]);

export const QuestionInputTypeSchema = z.enum([
  'voice',
  'text',
  'yes_no',
  'single_choice',
  'multiple_choice',
  'number',
  'date',
  'scale',
]);

export const QuestionOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
});

export const FollowUpRuleSchema = z.object({
  condition: z.object({
    fieldId: z.string(),
    operator: z.enum(['equals', 'not_equals', 'contains', 'exists', 'greater_than', 'less_than']),
    value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  }),
  nextQuestionId: z.string(),
});

export const QuestionSchema = z.object({
  id: z.string(),
  section: ClinicalSectionSchema,
  question: z.object({
    en: z.string(),
    hi: z.string().optional(),
    ta: z.string().optional(),
  }),
  inputType: QuestionInputTypeSchema,
  options: z.array(QuestionOptionSchema).optional(),
  required: z.boolean(),
  allowVoice: z.boolean(),
  allowTouch: z.boolean(),
  informationFields: z.array(z.string()).optional(),
  followUpRules: z.array(FollowUpRuleSchema).optional(),
  helpText: z.object({
    en: z.string().optional(),
    hi: z.string().optional(),
    ta: z.string().optional(),
  }).optional(),
  displayOrder: z.number(),
});

export const ConversationAnswerSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  questionId: z.string(),
  section: ClinicalSectionSchema,
  rawValue: z.unknown(),
  normalizedValue: z.unknown().optional(),
  inputMethod: z.enum(['voice', 'touch', 'keyboard', 'demo']),
  transcript: z.string().optional(),
  provenance: DataProvenanceSchema,
  answeredAt: z.string(),
  editedByPatient: z.boolean(),
});

export const ConversationSpeakerSchema = z.enum(['system', 'patient', 'ai']);

export const ConversationMessageSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  speaker: ConversationSpeakerSchema,
  content: z.string(),
  language: SupportedLanguageSchema,
  timestamp: z.string(),
  linkedQuestionId: z.string().optional(),
  speechMetadata: z.object({
    durationMs: z.number().optional(),
    confidence: z.number().optional(),
  }).optional(),
});

export const ConversationStateSchema = z.enum([
  'idle',
  'starting',
  'asking',
  'awaiting_answer',
  'validating',
  'saving_answer',
  'transitioning',
  'completed',
  'paused',
  'error',
]);

export const ConversationEngineStatusSchema = z.object({
  sessionId: z.string(),
  currentQuestionId: z.string().optional(),
  status: ConversationStateSchema,
  error: z.string().optional(),
});
