import { z } from 'zod';
import { ConsentSchema } from '../schemas/consent.schema';

export type Consent = z.infer<typeof ConsentSchema>;
