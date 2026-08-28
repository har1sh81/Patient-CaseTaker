import { z } from 'zod';
import * as schemas from '../schemas/common.schema';

export type ISODateString = z.infer<typeof schemas.ISODateStringSchema>;
export type UUID = z.infer<typeof schemas.UUIDSchema>;
export type EntityId = z.infer<typeof schemas.EntityIdSchema>;
export type BaseEntity = z.infer<typeof schemas.BaseEntitySchema>;
export type ProcessingStatus = z.infer<typeof schemas.ProcessingStatusSchema>;
export type ConfidenceLevel = z.infer<typeof schemas.ConfidenceLevelSchema>;
export type DataSourceType = z.infer<typeof schemas.DataSourceTypeSchema>;
export type DataProvenance = z.infer<typeof schemas.DataProvenanceSchema>;
export type SupportedLanguage = z.infer<typeof schemas.SupportedLanguageSchema>;
