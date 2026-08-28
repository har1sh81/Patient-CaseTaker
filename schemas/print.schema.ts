import { z } from 'zod';

export const PrintJobSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  status: z.enum(['ready', 'printing', 'print_dialog_opened', 'completed', 'failed']),
  initiatedAt: z.string().optional(),
  completedAt: z.string().optional(),
  pageCount: z.number().optional(),
});

export const PrintConfigurationSchema = z.object({
  paperSize: z.literal('A4'),
  orientation: z.literal('portrait'),
  targetPageCount: z.object({
    min: z.literal(1),
    max: z.literal(2),
  }),
  includeQrCode: z.boolean(),
  includeColor: z.boolean(),
  grayscaleCompatible: z.boolean(),
  showPhysicianSignatureArea: z.boolean(),
});

export const QRCodeDataSchema = z.object({
  reportId: z.string(),
  referenceNumber: z.string(),
  generatedAt: z.string(),
  version: z.string(),
});
