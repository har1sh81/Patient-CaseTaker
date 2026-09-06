'use client';

import * as React from 'react';
import { ConversationEngineStatus, ConversationAnswer, Question } from '../../types';
import { getNextQuestion, getPreviousQuestion, invalidateBranch, getValidRoute } from './routing';
import { validateAnswer, ValidationResult } from './validation';
import { calculateProgress, ProgressResult } from './progress';
import { translatePatientText } from '../translation/indictrans-client';
import { LocalClinicalNLP } from '../ai/local-nlp';

export interface ConversationEngineConfig {
  sessionId: string;
  language?: string;
  questions: Question[];
  initialAnswers?: ConversationAnswer[];
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export interface ConversationEngineAPI {
  status: ConversationEngineStatus;
  currentQuestion: Question | null;
  answers: Record<string, ConversationAnswer>;
  progress: ProgressResult;
  validationError: string | null;

  // Actions
  submitAnswer: (
    value: unknown,
    inputMethod: 'voice' | 'touch' | 'keyboard' | 'demo',
    transcript?: string,
    editedByPatient?: boolean
  ) => Promise<void>;
  goBack: () => void;
  resume: () => void;
}

export function useConversationEngine(config: ConversationEngineConfig): ConversationEngineAPI {
  const { sessionId, language = 'en', questions, initialAnswers = [], onComplete, onError } = config;

  // State
  const [status, setStatus] = React.useState<ConversationEngineStatus>({
    sessionId,
    status: 'starting',
  });

  const [answers, setAnswers] = React.useState<Record<string, ConversationAnswer>>(() => {
    const map: Record<string, ConversationAnswer> = {};
    initialAnswers.forEach((a) => {
      map[a.questionId] = a;
    });
    return map;
  });
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [extractedFacts, setExtractedFacts] = React.useState<Record<string, unknown>[]>([]);

  // Initialize engine based on existing answers
  React.useEffect(() => {
    if (questions.length === 0) {
      React.startTransition(() => {
        setStatus({ sessionId, status: 'error', error: 'No questions provided.' });
      });
      return;
    }

    const validRoute = getValidRoute(answers, questions);

    // Find the first unanswered question in the valid route
    let startQuestionId: string | undefined;
    for (const qId of validRoute) {
      if (!answers[qId]) {
        startQuestionId = qId;
        break;
      }
    }

    if (startQuestionId) {
      React.startTransition(() => {
        setStatus({ sessionId, currentQuestionId: startQuestionId, status: 'asking' });
      });
    } else {
      React.startTransition(() => {
        setStatus({ sessionId, status: 'completed' });
      });
      onComplete?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, questions]); // Only run on mount or when core config changes

  const currentQuestion = React.useMemo(() => {
    if (!status.currentQuestionId) return null;
    return questions.find((q) => q.id === status.currentQuestionId) || null;
  }, [status.currentQuestionId, questions]);

  const progress = React.useMemo(() => {
    return calculateProgress(status.currentQuestionId, answers, questions);
  }, [status.currentQuestionId, answers, questions]);

  // ──────────────────────────────────────────────────────────────────────────
  // submitAnswer — unified path with IndicTrans2 multilingual translation
  // ──────────────────────────────────────────────────────────────────────────
  const submitAnswer = React.useCallback(
    async (
      value: unknown,
      inputMethod: 'voice' | 'touch' | 'keyboard' | 'demo',
      transcript?: string,
      editedByPatient: boolean = false
    ) => {
      if (!currentQuestion) return;

      setValidationError(null);
      setStatus((s) => ({ ...s, status: 'validating' }));

      try {
        // ── Step 0: Validate ─────────────────────────────────────────────────
        const validation: ValidationResult =
          inputMethod === 'voice' || inputMethod === 'keyboard'
            ? { isValid: true }
            : validateAnswer(currentQuestion, value);

        if (!validation.isValid) {
          setValidationError(validation.errorMessage || 'Invalid answer');
          setStatus({ sessionId, currentQuestionId: currentQuestion.id, status: 'asking' });
          return;
        }

        // ── Step 0.5: Multilingual IndicTrans2 Translation ──────────────────
        let normalizedVal: unknown = value;
        const textToTranslate =
          typeof value === 'string' && value.trim()
            ? value
            : typeof transcript === 'string' && transcript.trim()
            ? transcript
            : '';

        if (language !== 'en' && textToTranslate.trim()) {
          try {
            const transResult = await translatePatientText({
              patientText: textToTranslate,
              sourceLanguage: language,
              targetLanguage: 'eng_Latn',
            });
            if (transResult.success && transResult.translatedText) {
              normalizedVal = transResult.translatedText;
            }
          } catch (transErr) {
            console.warn('[engine] IndicTrans2 translation failed, using raw value:', transErr);
          }
        }

        // ── Step 1: Build answer object ──────────────────────────────────────
        const newAnswer: ConversationAnswer = {
          id: answers[currentQuestion.id]?.id || crypto.randomUUID(),
          sessionId,
          questionId: currentQuestion.id,
          section: currentQuestion.section,
          rawValue: value,
          normalizedValue: normalizedVal,
          inputMethod,
          transcript: transcript || (typeof value === 'string' ? value : undefined),
          provenance: {
            source:
              inputMethod === 'demo'
                ? 'demo_data'
                : inputMethod === 'voice'
                ? 'patient_voice'
                : inputMethod === 'keyboard'
                ? 'patient_text'
                : 'patient_touch',
            confidence: 'high',
          },
          answeredAt: new Date().toISOString(),
          editedByPatient: editedByPatient || false,
        };

        // ── Step 2: Persist answer (skipped for demo sessions) ───────────────
        let savedAnswer: ConversationAnswer = newAnswer;

        if (sessionId !== 'demo-session-123') {
          try {
            const res = await fetch('/api/kiosk/interview/answers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ answer: newAnswer }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            savedAnswer = data.answer;

            // Also trigger real-time attention / red flag scanning
            fetch('/api/kiosk/interview/attention', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId }),
            }).catch((err) => console.warn('[engine] Attention evaluation trigger failed:', err));
          } catch {
            setValidationError('Failed to save answer. Please try again.');
            setStatus({ sessionId, currentQuestionId: currentQuestion.id, status: 'asking' });
            return;
          }
        }

        // ── Step 3: Merge saved answer into local state ──────────────────────
        const nextAnswers: Record<string, ConversationAnswer> = {
          ...answers,
          [currentQuestion.id]: savedAnswer,
        };

        const isEdit = !!answers[currentQuestion.id] || editedByPatient;
        if (isEdit && sessionId !== 'demo-session-123') {
          const invalidKeys = invalidateBranch(currentQuestion.id, nextAnswers, questions);
          if (invalidKeys.length > 0) {
            const invalidDbIds = invalidKeys.map((k) => nextAnswers[k].id);
            invalidKeys.forEach((k) => delete nextAnswers[k]);
            // Fire-and-forget deletion
            fetch('/api/kiosk/interview/answers', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ answerIds: invalidDbIds }),
            }).catch((err) => console.warn('[engine] Failed to delete invalidated answers:', err));
          }
        }

        setAnswers(nextAnswers);

        // ── Step 3.5: Local NLP Fact Extraction ──────────────────────────────
        try {
          const combinedText = Object.values(nextAnswers)
            .map(a => String(a.normalizedValue || a.transcript || a.rawValue || ''))
            .filter(Boolean)
            .join(' ');
          const langCode = (language === 'hi' ? 'hi' : language === 'ta' ? 'ta' : 'en') as 'en' | 'hi' | 'ta';
          const nlpResult = LocalClinicalNLP.extractFacts(combinedText, langCode);
          
          // Merge NLP facts into extractedFacts state
          const nlpFacts: Record<string, unknown>[] = nlpResult.facts.map(f => ({
            field: f.entityType,
            value: f.normalizedValue,
            status: f.status,
            confidence: f.confidence,
            negated: f.negated,
          }));
          if (nlpResult.primarySymptom) nlpFacts.push({ field: 'primarySymptom', value: nlpResult.primarySymptom });
          if (nlpResult.duration) nlpFacts.push({ field: 'duration', value: nlpResult.duration });
          if (nlpResult.severity) nlpFacts.push({ field: 'severity', value: nlpResult.severity });
          if (nlpResult.location) nlpFacts.push({ field: 'location', value: nlpResult.location });
          if (nlpResult.character) nlpFacts.push({ field: 'character', value: nlpResult.character });

          setExtractedFacts(prev => {
            const merged = [...prev];
            for (const newFact of nlpFacts) {
              const idx = merged.findIndex(f => f.field === newFact.field && f.value === newFact.value);
              if (idx >= 0) merged[idx] = newFact;
              else merged.push(newFact);
            }
            return merged;
          });

          console.debug('[engine] Local NLP extracted', nlpFacts.length, 'facts from combined text');
        } catch (nlpErr) {
          console.warn('[engine] Local NLP extraction failed (non-fatal):', nlpErr);
        }

        // ── Step 4: Determine next question ─────────────────────────────────
        setStatus((s) => ({ ...s, status: 'transitioning' }));

        let nextQ: Question | null = null;
        let aiFallback = false;

        console.debug('[engine] submitAnswer', {
          sessionId,
          currentQuestionId: currentQuestion.id,
          savedAnswerId: savedAnswer.id,
          answeredIds: Object.keys(nextAnswers),
          language,
        });

        // Skip adaptive API for demo sessions
        if (sessionId !== 'demo-session-123') {
          try {
            const allowedQuestionIds = questions
              .filter((q) => !nextAnswers[q.id])
              .map((q) => q.id);

            const aiReqBody = {
              sessionId,
              language,
              currentSection: currentQuestion.section,
              currentQuestion,
              latestAnswer: savedAnswer,
              previousAnswers: Object.values(nextAnswers),
              extractedFacts,
              structuredHistory: {},
              allowedQuestionIds,
              questionBankContext: questions.filter((q) => allowedQuestionIds.includes(q.id)),
            };

            const aiRes = await fetch('/api/kiosk/interview/adaptive', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(aiReqBody),
            });

            const aiData = await aiRes.json();

            if (aiData.success && aiData.response) {
              const aiLogic = aiData.response;

              // Merge extracted facts
              if (aiLogic.extractedFacts && aiLogic.extractedFacts.length > 0) {
                setExtractedFacts((prev) => {
                  const newFacts = [...prev];
                  for (const fact of aiLogic.extractedFacts) {
                    const idx = newFacts.findIndex(
                      (f: Record<string, unknown>) => f.field === fact.field
                    );
                    if (idx >= 0) newFacts[idx] = fact;
                    else newFacts.push(fact);
                  }
                  return newFacts;
                });
              }

              if (aiLogic.nextAction === 'ask_follow_up' && aiLogic.nextQuestionId) {
                nextQ = questions.find((q) => q.id === aiLogic.nextQuestionId) || null;
              } else {
                aiFallback = true;
              }
            } else {
              aiFallback = true;
            }
          } catch (err) {
            console.warn('[engine] Adaptive API failed, falling back to deterministic routing', err);
            aiFallback = true;
          }
        } else {
          aiFallback = true;
        }

        // ── Step 5: Deterministic fallback ───────────────────────────────────
        if (aiFallback || !nextQ) {
          nextQ = getNextQuestion(currentQuestion.id, nextAnswers, questions);
        }

        // ── Step 6: Advance to next question (or complete) ───────────────────
        if (nextQ) {
          setStatus({ sessionId, currentQuestionId: nextQ.id, status: 'asking' });
        } else {
          setStatus({ sessionId, status: 'completed' });
          onComplete?.();
        }
      } catch (err) {
        console.error('[engine] Fatal error in submitAnswer', err);
        const errObj = err instanceof Error ? err : new Error(String(err));
        onError?.(errObj);
        setValidationError('Failed to save answer. Please try again.');
        setStatus((s) => ({ ...s, status: 'error', error: errObj.message }));
      }
    },
    [sessionId, language, currentQuestion, answers, questions, onComplete, onError, extractedFacts]
  );

  const goBack = React.useCallback(() => {
    if (!currentQuestion) return;
    setValidationError(null);
    const prevQ = getPreviousQuestion(currentQuestion.id, answers, questions);
    if (prevQ) {
      setStatus({ sessionId, currentQuestionId: prevQ.id, status: 'asking' });
    }
  }, [answers, currentQuestion, questions, sessionId]);

  const resume = React.useCallback(() => {
    if (status.status === 'error' && status.currentQuestionId) {
      setValidationError(null);
      setStatus({ sessionId, currentQuestionId: status.currentQuestionId, status: 'asking' });
    }
  }, [status, sessionId]);

  return {
    status,
    currentQuestion,
    answers,
    progress,
    validationError,
    submitAnswer,
    goBack,
    resume,
  };
}
