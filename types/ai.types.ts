import { z } from 'zod';
import * as schemas from '../schemas/ai.schema';

export type AdaptiveQuestionRequest = z.infer<typeof schemas.AdaptiveQuestionRequestSchema>;
export type ExtractedClinicalFact = z.infer<typeof schemas.ExtractedClinicalFactSchema>;
export type MissingInformationItem = z.infer<typeof schemas.MissingInformationItemSchema>;
export type AdaptiveQuestion = z.infer<typeof schemas.AdaptiveQuestionSchema>;
export type AdaptiveQuestionResponse = z.infer<typeof schemas.AdaptiveQuestionResponseSchema>;
export type AIResponseMetadata = z.infer<typeof schemas.AIResponseMetadataSchema>;
export type DocumentIntelligenceRequest = z.infer<typeof schemas.DocumentIntelligenceRequestSchema>;
