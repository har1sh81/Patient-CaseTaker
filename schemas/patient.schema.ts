import { z } from 'zod';
import { ISODateStringSchema } from './common.schema';

export const PatientSchema = z.object({
  id: z.string(),

  identification: z.object({
    hospitalNumber: z.string().optional(),
    abhaReference: z.string().optional(),
    mobileNumber: z.string().optional(),
    externalReference: z.string().optional(),
  }),

  demographics: z.object({
    firstName: z.string().min(1),
    lastName: z.string().optional(),
    fullName: z.string().min(1),
    dateOfBirth: z.string().optional(),
    age: z.number().optional(),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  }),

  contact: z.object({
    mobileNumber: z.string().optional(),
  }).optional(),

  createdAt: ISODateStringSchema,
  updatedAt: ISODateStringSchema.optional(),
});
