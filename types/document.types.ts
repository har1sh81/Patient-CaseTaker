import { z } from 'zod';
import * as schemas from '../schemas/document.schema';

export type MedicalDocumentType = z.infer<typeof schemas.MedicalDocumentTypeSchema>;
export type MedicalDocument = z.infer<typeof schemas.MedicalDocumentSchema>;
export type OCRRequest = z.infer<typeof schemas.OCRRequestSchema>;
export type OCRPage = z.infer<typeof schemas.OCRPageSchema>;
export type OCRResponse = z.infer<typeof schemas.OCRResponseSchema>;
export type ExtractedCondition = z.infer<typeof schemas.ExtractedConditionSchema>;
export type ExtractedProcedure = z.infer<typeof schemas.ExtractedProcedureSchema>;
export type HospitalAdmission = z.infer<typeof schemas.HospitalAdmissionSchema>;
export type LabResult = z.infer<typeof schemas.LabResultSchema>;
export type MedicalTimelineEventType = z.infer<typeof schemas.MedicalTimelineEventTypeSchema>;
export type MedicalTimelineEvent = z.infer<typeof schemas.MedicalTimelineEventSchema>;
export type DocumentExtractionResult = z.infer<typeof schemas.DocumentExtractionResultSchema>;
