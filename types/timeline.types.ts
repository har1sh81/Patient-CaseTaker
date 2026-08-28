import { z } from 'zod';
import { 
  FusedRecordCategorySchema, 
  FusedRecordConflictSchema, 
  FusedClinicalRecordSchema,
  MedicalTimelineSchema,
  RelevanceLevelSchema,
  RelevantFusedRecordSchema,
  ReconstructedHistorySchema
} from '../schemas/timeline.schema';

export type FusedRecordCategory = z.infer<typeof FusedRecordCategorySchema>;
export type FusedRecordConflict = z.infer<typeof FusedRecordConflictSchema>;
export type FusedClinicalRecord = z.infer<typeof FusedClinicalRecordSchema>;
export type MedicalTimeline = z.infer<typeof MedicalTimelineSchema>;
export type RelevanceLevel = z.infer<typeof RelevanceLevelSchema>;
export type RelevantFusedRecord = z.infer<typeof RelevantFusedRecordSchema>;
export type ReconstructedHistory = z.infer<typeof ReconstructedHistorySchema>;
