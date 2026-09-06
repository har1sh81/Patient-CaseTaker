import { SpeechRecognizer, TranscriptionInput, TranscriptionResult } from './types';

export class MockSpeechRecognizer implements SpeechRecognizer {
  readonly providerName = 'mock_asr';
  readonly isReal = false;

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    if (input.overrideText !== undefined) {
      return {
        text: input.overrideText.trim(),
        language: input.languageHint || 'en',
        confidence: input.overrideText.trim() ? 0.95 : 0.0,
        duration: 0.0,
        providerName: this.providerName,
        isReal: this.isReal,
      };
    }

    const lang = (input.languageHint || 'en').toLowerCase();
    let text = 'I have had a headache for three days.';

    if (lang === 'ta' || lang.startsWith('ta')) {
      text = 'எனக்கு இரண்டு நாளாக மார்பில் வலி இருக்கிறது.';
    } else if (lang === 'hi' || lang.startsWith('hi')) {
      text = 'मुझे पिछले कुछ हफ्तों से बहुत ज्यादा प्यास लग रही है।';
    } else if (lang === 'en' || lang.startsWith('en')) {
      text = 'I am experiencing severe bilateral knee pain and stiffness in the mornings for 8 months.';
    }

    return {
      text,
      language: lang,
      confidence: 0.92,
      duration: 4.2,
      providerName: this.providerName,
      isReal: this.isReal,
    };
  }
}
