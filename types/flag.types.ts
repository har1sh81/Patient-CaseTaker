import { z } from 'zod';
import * as schemas from '../schemas/flag.schema';

export type AttentionRuleCategory = z.infer<typeof schemas.AttentionRuleCategorySchema>;
export type RuleCondition = z.infer<typeof schemas.RuleConditionSchema>;
export type AttentionRule = z.infer<typeof schemas.AttentionRuleSchema>;
export type FlagSeverity = z.infer<typeof schemas.FlagSeveritySchema>;
export type AttentionFlag = z.infer<typeof schemas.AttentionFlagSchema>;
export type MedicationAttentionFinding = z.infer<typeof schemas.MedicationAttentionFindingSchema>;
