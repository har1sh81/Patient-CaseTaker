import { z } from 'zod';
import * as schemas from '../schemas/voice.schema';

export type SpeechToTextRequest = z.infer<typeof schemas.SpeechToTextRequestSchema>;
export type SpeechToTextResponse = z.infer<typeof schemas.SpeechToTextResponseSchema>;
export type TextToSpeechRequest = z.infer<typeof schemas.TextToSpeechRequestSchema>;
export type TextToSpeechResponse = z.infer<typeof schemas.TextToSpeechResponseSchema>;

// Phase 5 provider state types
export type SpeechRecognitionState = z.infer<typeof schemas.SpeechRecognitionStateSchema>;
export type SpeechRecognitionErrorType = z.infer<typeof schemas.SpeechRecognitionErrorTypeSchema>;
export type TTSState = z.infer<typeof schemas.TTSStateSchema>;
