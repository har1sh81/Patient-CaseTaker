import { z } from 'zod';
import * as schemas from '../schemas/ayush.schema';

export type AyushAssessmentItem = z.infer<typeof schemas.AyushAssessmentItemSchema>;
export type DashavidhaPariksha = z.infer<typeof schemas.DashavidhaParikshaSchema>;
export type AyushIntake = z.infer<typeof schemas.AyushIntakeSchema>;
