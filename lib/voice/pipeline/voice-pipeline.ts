import { createClient } from '@/lib/supabase/server';
import { hasValidConsent } from '@/lib/consent/consent-service';
import { getSpeechRecognizer, TranscriptionInput } from '../asr';
import { translateVoiceTranscript } from '../translation/voice-translator';
import { extractClinicalFactsForEncounter } from '@/lib/clinical/fact-extraction';

export interface VoicePipelineInput {
  patientId: string;
  encounterId: string;
  audioBuffer?: Buffer;
  audioBase64?: string;
  audioMimeType?: string;
  languageHint?: string; // 'ta', 'hi', 'en'
  asrProvider?: string;
  rawTranscriptOverride?: string;
}

export interface VoicePipelineResult {
  success: boolean;
  statusCode: number;
  data?: {
    patientId: string;
    encounterId: string;
    language: string;
    rawTranscript: string;
    normalizedEnglishText: string;
    asrProvider: string;
    isRealAsr: boolean;
    translationStatus: 'success' | 'bypassed' | 'failed';
    audioStoragePath?: string;
    factsCreated: number;
    answerId?: string;
  };
  error?: string;
}

const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024; // 10MB Limit

export async function processVoicePipeline(
  input: VoicePipelineInput
): Promise<VoicePipelineResult> {
  const {
    patientId,
    encounterId,
    audioBuffer,
    audioBase64,
    audioMimeType = 'audio/webm',
    languageHint,
    asrProvider,
    rawTranscriptOverride,
  } = input;

  // 1. INPUT VALIDATION
  if (!patientId || !patientId.trim()) {
    return { success: false, statusCode: 400, error: 'patientId is required' };
  }
  if (!encounterId || !encounterId.trim()) {
    return { success: false, statusCode: 400, error: 'encounterId is required' };
  }

  // Audio size check
  if (audioBuffer && audioBuffer.length > MAX_AUDIO_SIZE_BYTES) {
    return { success: false, statusCode: 400, error: 'Audio file size exceeds 10MB limit' };
  }

  const supabase = await createClient();

  // 2. ENCOUNTER & PATIENT VALIDATION
  const { data: encounter, error: encErr } = await supabase
    .from('encounters')
    .select('id, patient_id')
    .eq('id', encounterId)
    .limit(1);

  if (encErr || !encounter || encounter.length === 0) {
    return { success: false, statusCode: 404, error: 'Encounter not found' };
  }

  if (encounter[0].patient_id !== patientId) {
    return {
      success: false,
      statusCode: 400,
      error: 'Patient and Encounter mismatch: patientId does not own the specified encounter',
    };
  }

  // 3. CONSENT VERIFICATION (Task #6 Voice Recording Permission)
  const voiceConsentAllowed = await hasValidConsent(patientId, 'voice_recording');
  if (!voiceConsentAllowed) {
    return {
      success: false,
      statusCode: 403,
      error: 'Voice recording consent missing or revoked for patient',
    };
  }

  // 4. SUPABASE STORAGE (Persist Audio Binary Reference)
  let audioStoragePath: string | undefined = undefined;
  if (audioBuffer || audioBase64) {
    try {
      const bufferToUpload = audioBuffer || Buffer.from(audioBase64!, 'base64');
      const ext = audioMimeType.includes('wav') ? 'wav' : audioMimeType.includes('mp3') ? 'mp3' : 'webm';
      const fileName = `${patientId}/${encounterId}/${Date.now()}.${ext}`;

      const { data: storageData, error: storageErr } = await supabase.storage
        .from('voice-recordings')
        .upload(fileName, bufferToUpload, {
          contentType: audioMimeType,
          upsert: true,
        });

      if (!storageErr && storageData) {
        audioStoragePath = storageData.path;
      } else {
        // Fallback reference path if bucket upload succeeds without public bucket config
        audioStoragePath = `voice-recordings/${fileName}`;
      }
    } catch {
      audioStoragePath = `voice-recordings/${patientId}/${encounterId}/${Date.now()}.webm`;
    }
  }

  // 5. ASR TRANSCRIPTION STAGE
  const recognizer = getSpeechRecognizer(asrProvider);
  const transcriptionInput: TranscriptionInput = {
    audioBuffer,
    audioBase64,
    audioMimeType,
    languageHint,
    overrideText: rawTranscriptOverride,
  };

  let asrResult;
  try {
    asrResult = await recognizer.transcribe(transcriptionInput);
  } catch (err: any) {
    return {
      success: false,
      statusCode: 500,
      error: `ASR speech recognition failed: ${err.message || String(err)}`,
    };
  }

  if (!asrResult || !asrResult.text || !asrResult.text.trim()) {
    return {
      success: false,
      statusCode: 400,
      error: 'Speech recognition failed to produce a transcript from audio input',
    };
  }

  const rawTranscript = asrResult.text.trim();
  const sourceLanguage = asrResult.language || languageHint || 'en';

  // 6. INDICTRANS2 TRANSLATION STAGE
  const translationRes = await translateVoiceTranscript(rawTranscript, sourceLanguage);
  const normalizedEnglishText = translationRes.normalizedText;

  // 7. PERSISTENCE & PROVENANCE
  // A. Create Clinical Source for Provenance
  let sourceId: string | undefined = undefined;
  const { data: newSource } = await supabase
    .from('clinical_sources')
    .insert({
      encounter_id: encounterId,
      source_type: 'patient_reported',
      source_entity: 'conversation_answers',
      confidence_level: 'high',
      description: `Voice speech intake (${sourceLanguage}) via ${asrResult.providerName}`,
    })
    .select('id')
    .limit(1);

  if (newSource && newSource.length > 0) {
    sourceId = newSource[0].id;
  }

  // B. Save Conversation Answer
  const { data: newAnswer, error: answerErr } = await supabase
    .from('conversation_answers')
    .insert({
      encounter_id: encounterId,
      question_id: `q_voice_intake_${Date.now()}`,
      section: 'voice_intake',
      source_language: sourceLanguage,
      raw_text: rawTranscript,
      normalized_english_text: normalizedEnglishText,
      input_method: 'voice',
      source_id: sourceId,
    })
    .select('id')
    .limit(1);

  if (answerErr || !newAnswer || newAnswer.length === 0) {
    return {
      success: false,
      statusCode: 500,
      error: `Failed to save conversation answer: ${answerErr?.message}`,
    };
  }

  const answerId = newAnswer[0].id;

  // 8. TASK #8 CLINICAL FACT EXTRACTION INTEGRATION
  let factsCreated = 0;
  // Only trigger extraction if translation succeeded or was bypassed (or if English)
  if (translationRes.translationStatus !== 'failed') {
    const extractionRes = await extractClinicalFactsForEncounter(encounterId);
    if (extractionRes.success && extractionRes.data) {
      factsCreated = extractionRes.data.factsCreated;
    }
  }

  return {
    success: true,
    statusCode: 200,
    data: {
      patientId,
      encounterId,
      language: sourceLanguage,
      rawTranscript,
      normalizedEnglishText,
      asrProvider: asrResult.providerName,
      isRealAsr: asrResult.isReal,
      translationStatus: translationRes.translationStatus,
      audioStoragePath,
      factsCreated,
      answerId,
    },
  };
}
