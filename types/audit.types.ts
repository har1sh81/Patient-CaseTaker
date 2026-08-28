import { z } from 'zod';
import * as schemas from '../schemas/audit.schema';

export type AuditAction = z.infer<typeof schemas.AuditActionSchema>;
export type AuditLog = z.infer<typeof schemas.AuditLogSchema>;
