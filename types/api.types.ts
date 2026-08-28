import { z } from 'zod';
import { ApiMetaSchema, ApiErrorSchema } from '../schemas/api.schema';

export type ApiMeta = z.infer<typeof ApiMetaSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
