import { z } from 'zod';
import * as schemas from '../schemas/export.schema';

export type ExportType = z.infer<typeof schemas.ExportTypeSchema>;
export type ExportStatus = z.infer<typeof schemas.ExportStatusSchema>;
export type ExportRecord = z.infer<typeof schemas.ExportRecordSchema>;
