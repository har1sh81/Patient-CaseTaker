import { z } from 'zod';
import { DataProvenanceSchema, ConfidenceLevelSchema } from './common.schema';

export const FusedRecordCategorySchema = z.enum([
  'condition',
  'medication',
  'allergy',
  'procedure',
  'laboratory',
  'encounter',
  'symptom',
  'other',
]);

export const FusedRecordConflictSchema = z.object({
  conflictGroupId: z.string(),
  conflictingValue: z.string(),
  provenance: DataProvenanceSchema,
});

export const FusedClinicalRecordSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  patientId: z.string(),
  category: FusedRecordCategorySchema,
  clinicalFact: z.string(),
  originalValues: z.array(z.string()),
  
  date: z.string().optional(),
  datePrecision: z.enum(['exact', 'month', 'year', 'unknown']),
  
  provenances: z.array(DataProvenanceSchema),
  
  status: z.enum(['active', 'historical', 'conflict', 'resolved']),
  conflicts: z.array(FusedRecordConflictSchema).optional(),
  
  confidence: ConfidenceLevelSchema,
  createdAt: z.string(),
});

export const MedicalTimelineSchema = z.object({
  sessionId: z.string(),
  patientId: z.string(),
  records: z.array(FusedClinicalRecordSchema),
  lastUpdated: z.string(),
});

export const RelevanceLevelSchema = z.enum([
  'direct',
  'related',
  'contextual',
  'not_relevant'
]);

export const RelevantFusedRecordSchema = FusedClinicalRecordSchema.extend({
  relevance: RelevanceLevelSchema,
  relevanceReason: z.string().optional()
});

export const ReconstructedHistorySchema = z.object({
  sessionId: z.string(),
  patientId: z.string(),
  currentComplaintContext: z.object({
    complaint: z.string(),
    duration: z.string().optional(),
    severity: z.string().optional(),
    extractedFacts: z.array(z.any()).optional()
  }),
  records: z.array(RelevantFusedRecordSchema),
  conflicts: z.array(FusedRecordConflictSchema).optional(),
  lastUpdated: z.string()
});
