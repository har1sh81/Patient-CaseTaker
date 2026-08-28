import { z } from 'zod';

export const ApiMetaSchema = z.object({
  requestId: z.string().optional(),
  timestamp: z.string(),
});

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
  meta: ApiMetaSchema.optional(),
});

export function createApiSuccessSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: ApiMetaSchema.optional(),
  });
}

export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.discriminatedUnion('success', [
    createApiSuccessSchema(dataSchema),
    ApiErrorSchema,
  ]);
}
