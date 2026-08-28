import { z } from 'zod';
import { SupportedLanguageSchema, ConfidenceLevelSchema } from './common.schema';
import {
  ClinicalSectionSchema,
  ConversationAnswerSchema,
  QuestionSchema,
  QuestionInputTypeSchema,
  QuestionOptionSchema,
} from './conversation.schema';
import { ClinicalHistorySchema } from './clinical-history.schema';
import { MedicalDocumentSchema } from './document.schema';
export const ExtractedClinicalFactSchema = z.object({
  field: z.string(),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  confidence: ConfidenceLevelSchema,
  sourceMessageId: z.string().optional(),
});

export const AdaptiveQuestionRequestSchema = z.object({
  sessionId: z.string(),
  language: SupportedLanguageSchema,
  currentSection: ClinicalSectionSchema,
  currentQuestion: QuestionSchema.optional(),
  latestAnswer: ConversationAnswerSchema,
  previousAnswers: z.array(ConversationAnswerSchema).optional(),
  extractedFacts: z.array(ExtractedClinicalFactSchema).optional(),
  structuredHistory: ClinicalHistorySchema.partial(),
  allowedQuestionIds: z.array(z.string()),
  questionBankContext: z.array(QuestionSchema),
  maxQuestionsForSection: z.number().optional(),
});

export const MissingInformationItemSchema = z.object({
  field: z.string(),
  importance: z.enum(['required', 'recommended', 'optional']),
});

export const AdaptiveQuestionSchema = z.object({
  id: z.string(),
  section: ClinicalSectionSchema,
  question: z.string(),
  purpose: z.string(),
  inputType: QuestionInputTypeSchema,
  options: z.array(QuestionOptionSchema).optional(),
});

export const AdaptiveQuestionResponseSchema = z.object({
  extractedFacts: z.array(ExtractedClinicalFactSchema),
  missingInformation: z.array(MissingInformationItemSchema),
  nextAction: z.enum(['ask_follow_up', 'ask_clarification', 'continue_deterministic', 'complete_section']),
  nextQuestionId: z.string().optional(),
  clarificationNeeded: z.boolean().optional(),
  clarificationReason: z.string().optional(),
  nextQuestion: AdaptiveQuestionSchema.optional(),
  confidence: ConfidenceLevelSchema,
  reasoningSummary: z.string().optional(),
});

export const AIResponseMetadataSchema = z.object({
  provider: z.string(),
  model: z.string(),
  timestamp: z.string(),
  validationPassed: z.boolean(),
  fallbackUsed: z.boolean(),
  safetyConstraintsApplied: z.array(z.string()),
});

export const DocumentIntelligenceRequestSchema = z.object({
  document: MedicalDocumentSchema,
  ocrText: z.string(),
  patientId: z.string(),
  outputSchemaVersion: z.string(),
});
