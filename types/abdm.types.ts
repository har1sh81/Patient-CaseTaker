import { z } from 'zod';
import { RawHealthRecordPayloadSchema } from '../schemas/abdm.schema';

export type RawHealthRecordPayload = z.infer<typeof RawHealthRecordPayloadSchema>;
