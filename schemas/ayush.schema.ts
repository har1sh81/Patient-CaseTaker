import { z } from 'zod';

export const AyushAssessmentItemSchema = z.object({
  value: z.string(),
  method: z.enum(['patient_questionnaire', 'patient_reported']),
  notes: z.string().optional(),
});

export const DashavidhaParikshaSchema = z.object({
  prakriti: z.string().optional(),
  vikriti: z.string().optional(),
  sara: z.string().optional(),
  samhanana: z.string().optional(),
  pramana: z.string().optional(),
  satmya: z.string().optional(),
  satva: z.string().optional(),
  aharaShakti: z.string().optional(),
  vyayamaShakti: z.string().optional(),
  vaya: z.string().optional(),
});

export const AyushIntakeSchema = z.object({
  enabled: z.boolean(),
  prakriti: AyushAssessmentItemSchema.optional(),
  vikriti: AyushAssessmentItemSchema.optional(),
  agni: AyushAssessmentItemSchema.optional(),
  koshtha: AyushAssessmentItemSchema.optional(),
  ahara: z.array(z.string()).optional(),
  vihara: z.array(z.string()).optional(),
  dashavidhaPariksha: DashavidhaParikshaSchema.optional(),
  patientNotes: z.array(z.string()).optional(),
});
