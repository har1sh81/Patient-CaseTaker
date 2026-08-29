import { z } from 'zod';
import { DataProvenanceSchema } from './common.schema';

export const AttentionRuleCategorySchema = z.enum([
  'red_flag',
  'lab_attention',
  'missing_information',
  'medication_attention',
  'document_attention',
]);

export const RuleConditionSchema = z.object({
  field: z.string(),
  operator: z.enum([
    'equals',
    'not_equals',
    'exists',
    'greater_than',
    'less_than',
    'outside_range',
    'contains',
  ]),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

export const AttentionRuleSchema = z.object({
  id: z.string(),
  category: AttentionRuleCategorySchema,
  enabled: z.boolean(),
  appliesTo: z.string(),
  conditions: z.array(RuleConditionSchema),
  result: z.object({
    severity: z.enum(['information', 'review', 'priority']),
    label: z.string(),
    message: z.string(),
    requiresClinicalReview: z.boolean(),
  }),
});

export const FlagSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const AttentionFlagSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  patientId: z.string(),
  ruleId: z.string().optional(),
  category: AttentionRuleCategorySchema,
  severity: FlagSeveritySchema,
  label: z.string(),
  message: z.string(),
  evidence: z.array(z.string()),
  provenances: z.array(DataProvenanceSchema),
  requiresClinicalReview: z.boolean(),
  status: z.enum(['active', 'acknowledged', 'resolved', 'dismissed']).default('active'),
  resolutionDecision: z.string().optional(),
  resolvedBy: z.string().optional(),
  resolvedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const MedicationAttentionFindingSchema = z.object({
  id: z.string(),
  medicationsInvolved: z.array(z.string()),
  label: z.string(),
  message: z.string(),
  source: z.enum(['demo_rule', 'configured_dataset']),
  requiresPhysicianReview: z.literal(true),
});
