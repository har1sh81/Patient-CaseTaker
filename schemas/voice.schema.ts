import { z } from 'zod';
import { SupportedLanguageSchema, ProcessingStatusSchema } from './common.schema';

export const SpeechToTextRequestSchema = z.object({
  audio: z.any(), // Accepts Blob/File in runtime
  language: SupportedLanguageSchema,
  sessionId: z.string(),
});

export const SpeechToTextResponseSchema = z.object({
  transcript: z.string(),
  confidence: z.number().optional(),
  language: SupportedLanguageSchema,
  status: ProcessingStatusSchema,
  error: z.string().optional(),
});

export const TextToSpeechRequestSchema = z.object({
  text: z.string(),
  language: SupportedLanguageSchema,
  rate: z.number().optional(),
});

export const TextToSpeechResponseSchema = z.object({
  status: ProcessingStatusSchema,
  error: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Phase 5 — Provider state schemas
// ---------------------------------------------------------------------------

/**
 * State machine for the SpeechRecognitionProvider.
 * 'idle'        — not started
 * 'requesting'  — awaiting microphone permission
 * 'listening'   — microphone is active, collecting audio
 * 'processing'  — audio received, converting to text
 * 'done'        — final transcript available
 * 'error'       — recognition failed
 * 'denied'      — microphone permission denied by user/OS
 * 'unavailable' — browser does not support Web Speech API
 */
export const SpeechRecognitionStateSchema = z.enum([
  'idle',
  'requesting',
  'listening',
  'processing',
  'done',
  'error',
  'denied',
  'unavailable',
]);

export const SpeechRecognitionErrorTypeSchema = z.enum([
  'no-speech',
  'audio-capture',
  'not-allowed',
  'network',
  'service-not-available',
  'aborted',
  'unknown',
]);

/**
 * State machine for the TTSProvider.
 */
export const TTSStateSchema = z.enum([
  'idle',
  'speaking',
  'paused',
  'done',
  'error',
  'unavailable',
]);

