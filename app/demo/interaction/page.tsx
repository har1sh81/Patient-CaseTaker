'use client';

/**
 * Phase 5 Interaction Infrastructure Sandbox
 *
 * Demonstrates all 15 Phase 5 verification scenarios.
 * This is NOT a clinical interview — no medical logic is present.
 */

import * as React from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { VoiceInput } from '../../../components/interaction/voice-input';
import { VoiceCorrection } from '../../../components/interaction/voice-correction';
import { MultipleChoice, type ChoiceOption } from '../../../components/interaction/multiple-choice';
import { NumericInput } from '../../../components/interaction/numeric-input';
import { TextInputKiosk } from '../../../components/interaction/text-input-kiosk';
import { YesNoSelector } from '../../../components/ui/yes-no';
import { useSpeechRecognition } from '../../../hooks/use-speech-recognition';
import { useTTS } from '../../../hooks/use-tts';
import type { SupportedLanguage } from '../../../lib/kiosk/translation';
import { LANGUAGE_DISPLAY_NAME } from '../../../lib/voice/language-map';

const DEMO_TRANSCRIPTS: Record<SupportedLanguage, string> = {
  en: 'I have had a headache and fever for three days.',
  hi: 'मुझे तीन दिनों से सिरदर्द और बुखार है।',
  ta: 'எனக்கு மூன்று நாட்களாக தலைவலி மற்றும் காய்ச்சல் இருக்கிறது.',
};

const TTS_TEXTS: Record<SupportedLanguage, string> = {
  en: 'How long have you had this symptom?',
  hi: 'यह लक्षण कब से है?',
  ta: 'இந்த அறிகுறி எத்தனை நாட்களாக இருக்கிறது?',
};

const MOCK_OPTIONS: ChoiceOption[] = [
  { id: 'opt1', label: 'Less than 1 day', value: 'lt1' },
  { id: 'opt2', label: '1–3 days', value: '1to3' },
  { id: 'opt3', label: '4–7 days', value: '4to7' },
  { id: 'opt4', label: 'More than 1 week', value: 'gt7' },
];

type Section =
  | 'voice'
  | 'correction'
  | 'tts'
  | 'yes-no'
  | 'multi-choice'
  | 'numeric'
  | 'text'
  | 'keyboard';

export default function InteractionSandboxPage() {
  const [lang, setLang] = React.useState<SupportedLanguage>('en');
  const [useMock, setUseMock] = React.useState(true);
  const [simulateError, setSimulateError] = React.useState(false);
  const [section, setSection] = React.useState<Section>('voice');
  const [acceptedTranscript, setAcceptedTranscript] = React.useState<string | null>(null);
  const [showCorrection, setShowCorrection] = React.useState(false);
  const [yesNo, setYesNo] = React.useState<boolean | undefined>();
  const [multiVal, setMultiVal] = React.useState<string[]>([]);
  const [numVal, setNumVal] = React.useState<number | null>(null);
  const [textVal, setTextVal] = React.useState('');

  const sr = useSpeechRecognition({
    mock: useMock,
    mockConfig: {
      transcript: DEMO_TRANSCRIPTS[lang],
      interimDelayMs: 700,
      finalDelayMs: 2000,
      simulateError: simulateError ? 'no-speech' : undefined,
    },
  });

  const tts = useTTS({ mock: useMock });


  const handleAccept = (text: string) => {
    setAcceptedTranscript(text);
    setShowCorrection(false);
    sr.reset();
  };

  const handleRetry = () => {
    setShowCorrection(false);
    sr.reset();
  };

  const navBtn = (s: Section, label: string) => (
    <button
      key={s}
      type="button"
      onClick={() => setSection(s)}
      className={[
        'px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer',
        section === s
          ? 'bg-primary text-white'
          : 'bg-surface-muted text-text-secondary hover:text-text-main hover:bg-border-light',
      ].join(' ')}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-background-main p-6 font-sans">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-black text-secondary tracking-tight">
            Phase 5 — Interaction Sandbox
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Voice & Touch Infrastructure Demo — no clinical logic
          </p>
        </div>

        {/* Global controls */}
        <Card className="p-5 border border-border-light rounded-2xl flex flex-col gap-4">
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider">
            Global Configuration
          </h2>
          <div className="flex flex-wrap gap-3 items-center">
            {/* Language */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-text-secondary">Language</span>
              <div className="flex gap-2">
                {(['en', 'hi', 'ta'] as SupportedLanguage[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => { setLang(l); sr.reset(); tts.reset(); }}
                    className={[
                      'px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-all cursor-pointer',
                      lang === l
                        ? 'bg-primary text-white border-primary'
                        : 'border-border-light text-text-secondary hover:border-primary/40',
                    ].join(' ')}
                  >
                    {LANGUAGE_DISPLAY_NAME[l]}
                  </button>
                ))}
              </div>
            </div>

            {/* Provider toggle */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-text-secondary">Provider</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setUseMock(true); sr.reset(); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 cursor-pointer transition-all ${useMock ? 'bg-primary text-white border-primary' : 'border-border-light text-text-secondary'}`}
                >
                  Mock
                </button>
                <button
                  type="button"
                  onClick={() => { setUseMock(false); sr.reset(); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 cursor-pointer transition-all ${!useMock ? 'bg-primary text-white border-primary' : 'border-border-light text-text-secondary'}`}
                >
                  Browser
                </button>
              </div>
            </div>

            {/* Error simulation */}
            {useMock && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-text-secondary">Simulate</span>
                <button
                  type="button"
                  onClick={() => { setSimulateError((e) => !e); sr.reset(); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 cursor-pointer transition-all ${simulateError ? 'bg-error text-white border-error' : 'border-border-light text-text-secondary'}`}
                >
                  {simulateError ? 'Error ON' : 'Error OFF'}
                </button>
              </div>
            )}
          </div>
        </Card>

        {/* Section navigation */}
        <div className="flex flex-wrap gap-2">
          {navBtn('voice', '🎙 Voice')}
          {navBtn('correction', '✏️ Correction')}
          {navBtn('tts', '🔊 TTS')}
          {navBtn('yes-no', 'Yes/No')}
          {navBtn('multi-choice', 'Multi-Choice')}
          {navBtn('numeric', 'Numeric')}
          {navBtn('text', 'Text Input')}
          {navBtn('keyboard', 'Keyboard')}
        </div>

        {/* ── VOICE SECTION ── */}
        {section === 'voice' && (
          <Card className="p-6 border border-border-light rounded-2xl flex flex-col gap-6">
            <h2 className="font-bold text-secondary text-lg">Voice Input</h2>

            <VoiceInput
              state={sr.state}
              result={sr.result}
              errorMessage={sr.errorMessage}
              isSupported={sr.isSupported}
              onStart={() => sr.startListening(lang)}
              onStop={sr.stopListening}
              onCancel={sr.cancelListening}
              onRetry={sr.reset}
              onSwitchToTouch={() => setSection('text')}
              placeholder={`Speak in ${LANGUAGE_DISPLAY_NAME[lang]}...`}
            />

            {sr.isDone && !showCorrection && (
              <div className="text-center">
                <Button variant="primary" onClick={() => setShowCorrection(true)}>
                  Review transcript →
                </Button>
              </div>
            )}

            {showCorrection && sr.result.finalTranscript && (
              <VoiceCorrection
                transcript={sr.result.finalTranscript}
                onAccept={handleAccept}
                onRetryVoice={handleRetry}
                onSwitchToTouch={() => setSection('text')}
              />
            )}

            {acceptedTranscript && (
              <div className="rounded-xl border border-success/30 bg-success-light p-4">
                <p className="text-xs font-bold text-success uppercase tracking-wider mb-1">Accepted answer</p>
                <p className="text-text-main font-medium">{acceptedTranscript}</p>
                <button
                  type="button"
                  onClick={() => { setAcceptedTranscript(null); sr.reset(); setShowCorrection(false); }}
                  className="text-xs text-text-secondary underline cursor-pointer mt-2"
                >
                  Reset
                </button>
              </div>
            )}

            {/* State badge */}
            <div className="flex items-center gap-2 justify-center">
              <span className="text-xs text-text-muted">State:</span>
              <code className="text-xs bg-surface-muted px-2 py-1 rounded font-mono text-primary">
                {sr.state}
              </code>
              {!sr.isSupported && (
                <span className="text-xs text-error font-bold">Speech recognition not supported in this browser</span>
              )}
            </div>
          </Card>
        )}

        {/* ── CORRECTION SECTION ── */}
        {section === 'correction' && (
          <Card className="p-6 border border-border-light rounded-2xl flex flex-col gap-4">
            <h2 className="font-bold text-secondary text-lg">Voice Correction Flow</h2>
            <p className="text-sm text-text-secondary">
              Simulates what happens after a transcript is finalized.
            </p>
            <VoiceCorrection
              transcript={DEMO_TRANSCRIPTS[lang]}
              onAccept={(t) => alert(`Accepted: "${t}"`)}
              onRetryVoice={() => alert('Retry voice triggered')}
              onSwitchToTouch={() => setSection('text')}
            />
          </Card>
        )}

        {/* ── TTS SECTION ── */}
        {section === 'tts' && (
          <Card className="p-6 border border-border-light rounded-2xl flex flex-col gap-4">
            <h2 className="font-bold text-secondary text-lg">Text-to-Speech</h2>
            <p className="text-sm text-text-secondary italic border-l-4 border-primary pl-3">
              {TTS_TEXTS[lang]}
            </p>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                onClick={() => tts.speak(TTS_TEXTS[lang], lang)}
                disabled={tts.isSpeaking}
              >
                {tts.isSpeaking ? 'Speaking...' : '▶ Speak'}
              </Button>
              <Button variant="outline" onClick={tts.stop} disabled={!tts.isSpeaking && !tts.isPaused}>
                ■ Stop
              </Button>
              <Button variant="secondary" onClick={tts.pause} disabled={!tts.isSpeaking}>
                ⏸ Pause
              </Button>
              <Button variant="secondary" onClick={tts.resume} disabled={!tts.isPaused}>
                ▶ Resume
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">TTS State:</span>
              <code className="text-xs bg-surface-muted px-2 py-1 rounded font-mono text-primary">
                {tts.state}
              </code>
              {!tts.isSupported && (
                <span className="text-xs text-error font-bold">TTS not supported</span>
              )}
            </div>

            {tts.isUnavailable && (
              <div className="rounded-xl bg-warning-light border border-warning-border p-4 text-sm text-text-main">
                <strong>TTS Unavailable:</strong> {tts.errorMessage ?? `No voice found for ${LANGUAGE_DISPLAY_NAME[lang]}.`}
                <p className="mt-1 text-text-secondary">The question text is shown above — touch input is available.</p>
              </div>
            )}
          </Card>
        )}

        {/* ── YES/NO SECTION ── */}
        {section === 'yes-no' && (
          <Card className="p-6 border border-border-light rounded-2xl flex flex-col gap-4">
            <h2 className="font-bold text-secondary text-lg">Yes / No Selector</h2>
            <YesNoSelector
              value={yesNo}
              onChange={setYesNo}
              label="Do you have a current fever?"
              yesLabel="Yes"
              noLabel="No"
            />
            {yesNo !== undefined && (
              <p className="text-sm text-text-secondary text-center">
                Selected: <strong>{yesNo ? 'Yes' : 'No'}</strong>
              </p>
            )}
          </Card>
        )}

        {/* ── MULTIPLE CHOICE SECTION ── */}
        {section === 'multi-choice' && (
          <Card className="p-6 border border-border-light rounded-2xl flex flex-col gap-4">
            <h2 className="font-bold text-secondary text-lg">Multiple Choice</h2>
            <p className="text-sm text-text-secondary">How long have you had this symptom?</p>
            <MultipleChoice
              options={MOCK_OPTIONS}
              multi={false}
              value={multiVal[0]}
              onChange={(v) => setMultiVal(Array.isArray(v) ? v : [v])}
              label="Duration"
            />
            {multiVal.length > 0 && (
              <p className="text-sm text-text-secondary">
                Selected: <strong>{multiVal.join(', ')}</strong>
              </p>
            )}
          </Card>
        )}

        {/* ── NUMERIC SECTION ── */}
        {section === 'numeric' && (
          <Card className="p-6 border border-border-light rounded-2xl flex flex-col gap-4">
            <h2 className="font-bold text-secondary text-lg">Numeric Input</h2>
            <NumericInput
              value={numVal}
              onChange={setNumVal}
              onConfirm={(v) => alert(`Confirmed: ${v}`)}
              min={1}
              max={999}
              unit="days"
              label="For how many days?"
              placeholder="—"
            />
          </Card>
        )}

        {/* ── TEXT INPUT SECTION ── */}
        {section === 'text' && (
          <Card className="p-6 border border-border-light rounded-2xl flex flex-col gap-4">
            <h2 className="font-bold text-secondary text-lg">Text Input</h2>
            <TextInputKiosk
              value={textVal}
              onChange={setTextVal}
              onConfirm={(v) => alert(`Confirmed: "${v}"`)}
              placeholder="Type your answer here..."
              label="Describe your main symptom"
              maxLength={200}
            />
          </Card>
        )}

        {/* ── ON-SCREEN KEYBOARD SECTION ── */}
        {section === 'keyboard' && (
          <Card className="p-6 border border-border-light rounded-2xl flex flex-col gap-4">
            <h2 className="font-bold text-secondary text-lg">On-Screen Keyboard</h2>
            <TextInputKiosk
              value={textVal}
              onChange={setTextVal}
              onConfirm={(v) => alert(`Confirmed: "${v}"`)}
              placeholder="Tap keys below..."
              label="Keyboard demo"
              showKeyboard
            />
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-text-muted pb-4">
          Phase 5 — Interaction Infrastructure Only — No clinical logic
        </p>
      </div>
    </div>
  );
}
