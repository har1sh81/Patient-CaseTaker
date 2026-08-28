import { z } from 'zod';
import * as schemas from '../schemas/print.schema';

export type PrintJob = z.infer<typeof schemas.PrintJobSchema>;
export type PrintConfiguration = z.infer<typeof schemas.PrintConfigurationSchema>;
export type QRCodeData = z.infer<typeof schemas.QRCodeDataSchema>;
