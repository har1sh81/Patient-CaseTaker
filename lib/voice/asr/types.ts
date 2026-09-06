export interface TranscriptionInput {
  audioBuffer?: Buffer;
  audioBase64?: string;
  audioMimeType?: string;
  audioPath?: string;
  languageHint?: string; // 'ta', 'hi', 'en'

  overrideText?: string;
}

export interface TranscriptionResult {
  text: string;
  language: string; // 'ta', 'hi', 'en'
  confidence?: number;
  duration?: number;
  providerName: string;
  isReal: boolean;
}

export interface SpeechRecognizer {
  readonly providerName: string;
  readonly isReal: boolean;
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}
