import { z } from 'zod';
import { PatientSchema } from '../schemas/patient.schema';

export type Patient = z.infer<typeof PatientSchema>;
