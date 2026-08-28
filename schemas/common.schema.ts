import { z } from 'zod';

export const ISODateStringSchema = z.string(); //datetime validation is omitted or basic checks for flexibility
export const UUIDSchema = z.string().uuid();
export const EntityIdSchema = z.string();

export const BaseEntitySchema = z.object({
  id: EntityIdSchema,
  createdAt: ISODateStringSchema,
  updatedAt: ISODateStringSchema.optional(),
});

export const ProcessingStatusSchema = z.enum([
  'idle',
  'pending',
  'uploading',
  'processing',
  'completed',
  'failed',
  'requires_review',
]);

export const ConfidenceLevelSchema = z.enum([
  'high',
  'medium',
  'low',
  'unknown',
]);

export const DataSourceTypeSchema = z.enum([
  'patient_voice',
  'patient_touch',
  'patient_text',
  'uploaded_document',
  'ocr',
  'ai_extraction',
  'system_rule',
  'demo_data',
  'physician',
  'abdm',
]);

export const DataProvenanceSchema = z.object({
  source: DataSourceTypeSchema,
  sourceId: z.string().optional(),
  documentId: z.string().optional(),
  conversationMessageId: z.string().optional(),
  extractedAt: ISODateStringSchema.optional(),
  confidence: ConfidenceLevelSchema.optional(),
});

export const SupportedLanguageSchema = z.enum(['en', 'hi', 'ta']);
