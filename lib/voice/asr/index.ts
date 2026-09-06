import { SpeechRecognizer } from './types';
import { MockSpeechRecognizer } from './mock-recognizer';
import { LocalWhisperSpeechRecognizer } from './local-whisper-recognizer';

export * from './types';
export * from './mock-recognizer';
export * from './local-whisper-recognizer';

export function getSpeechRecognizer(providerName?: string): SpeechRecognizer {
  const name = (providerName || process.env.DEFAULT_ASR_PROVIDER || 'mock').toLowerCase();

  if (name.includes('whisper') || name.includes('local')) {
    return new LocalWhisperSpeechRecognizer();
  }

  return new MockSpeechRecognizer();
}
