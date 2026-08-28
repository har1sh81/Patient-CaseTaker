import { z } from 'zod';
import { SupportedLanguageSchema } from './common.schema';

export const ConsentSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  sessionId: z.string(),

  consentVersion: z.string(),

  permissions: z.object({
    intakeCollection: z.boolean(),
    voiceProcessing: z.boolean(),
    documentProcessing: z.boolean(),
    aiAssistedStructuring: z.boolean(),
    reportGeneration: z.boolean(),
  }),

  accepted: z.boolean(),
  acceptedAt: z.string().optional(),

  language: SupportedLanguageSchema,
  source: z.enum(['touchscreen', 'demo']),

  withdrawnAt: z.string().optional(),
});
