import { SpeechRecognizer, TranscriptionInput, TranscriptionResult } from './types';
import { MockSpeechRecognizer } from './mock-recognizer';

export class LocalWhisperSpeechRecognizer implements SpeechRecognizer {
  readonly providerName = 'local_whisper';
  readonly isReal = true;
  private mockFallback = new MockSpeechRecognizer();

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    // If explicit override text is provided or if audio buffer is missing, use mock fallback
    if (input.overrideText || (!input.audioBuffer && !input.audioBase64 && !input.audioPath)) {
      const fallbackResult = await this.mockFallback.transcribe(input);
      return {
        ...fallbackResult,
        providerName: this.providerName,
        isReal: false, // Explicitly label when mock fallback was used
      };
    }

    try {
      // Real Whisper inference check (e.g. via local python service or HF inference)
      // If service environment variable is provided, call local ASR endpoint
      const asrUrl = process.env.WHISPER_ASR_URL || 'http://127.0.0.1:8001/asr';
      const res = await fetch(asrUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: input.audioBase64 || input.audioBuffer?.toString('base64'),
          languageHint: input.languageHint,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          text: data.text || '',
          language: data.language || input.languageHint || 'en',
          confidence: data.confidence || 0.88,
          duration: data.duration || 5.0,
          providerName: this.providerName,
          isReal: true,
        };
      }
    } catch {
      // Gracefully fall back to deterministic mock provider if local ASR engine server is not active
    }

    const fallbackResult = await this.mockFallback.transcribe(input);
    return {
      ...fallbackResult,
      providerName: `${this.providerName}_fallback`,
      isReal: false,
    };
  }
}
