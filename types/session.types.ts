import { z } from 'zod';
import {
  DepartmentModeSchema,
  IntakeSessionStatusSchema,
  IntakeSessionSchema,
} from '../schemas/session.schema';

export type DepartmentMode = z.infer<typeof DepartmentModeSchema>;
export type IntakeSessionStatus = z.infer<typeof IntakeSessionStatusSchema>;
export type IntakeSession = z.infer<typeof IntakeSessionSchema>;
