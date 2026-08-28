'use client';

import * as React from 'react';
import { ConversationEngineStatus, ConversationAnswer, Question } from '../../types';
import { getNextQuestion, getPreviousQuestion, invalidateBranch, getValidRoute } from './routing';
import { validateAnswer, ValidationResult } from './validation';
import { calculateProgress, ProgressResult } from './progress';

export interface ConversationEngineConfig {
  sessionId: string;
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
  submitAnswer: (value: unknown, inputMethod: 'voice' | 'touch' | 'keyboard' | 'demo', transcript?: string, editedByPatient?: boolean) => Promise<void>;
  goBack: () => void;
  resume: () => void;
}

export function useConversationEngine(config: ConversationEngineConfig): ConversationEngineAPI {
  const { sessionId, questions, initialAnswers = [], onComplete, onError } = config;

  // State
  const [status, setStatus] = React.useState<ConversationEngineStatus>({
    sessionId,
    status: 'starting',
  });
  
  const [answers, setAnswers] = React.useState<Record<string, ConversationAnswer>>(() => {
    const map: Record<string, ConversationAnswer> = {};
    initialAnswers.forEach(a => { map[a.questionId] = a; });
    return map;
  });
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [extractedFacts, setExtractedFacts] = React.useState<Record<string, unknown>[]>([]); // To hold ExtractedClinicalFact[]

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
      // All questions in route answered
      React.startTransition(() => {
        setStatus({ sessionId, status: 'completed' });
      });
      onComplete?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, questions]); // Only run on mount or when core config changes

  const currentQuestion = React.useMemo(() => {
    if (!status.currentQuestionId) return null;
    return questions.find(q => q.id === status.currentQuestionId) || null;
  }, [status.currentQuestionId, questions]);

  const progress = React.useMemo(() => {
    return calculateProgress(status.currentQuestionId, answers, questions);
  }, [status.currentQuestionId, answers, questions]);

  // Submit Answer
  const submitAnswer = React.useCallback(async (
    value: unknown, 
    inputMethod: 'voice' | 'touch' | 'keyboard' | 'demo', 
    transcript?: string, 
    editedByPatient: boolean = false
  ) => {
    if (!currentQuestion) return;

    setStatus(s => ({ ...s, status: 'validating' }));
    
    try {
      // Note: validation checks are local logic
      // Bypass strict option validation for voice/keyboard inputs so the AI can analyze them
      const validation: ValidationResult = (inputMethod === 'voice' || inputMethod === 'keyboard')
        ? { isValid: true }
        : validateAnswer(currentQuestion, value);
      if (!validation.isValid) {
        setValidationError(validation.errorMessage || 'Invalid answer');
        setStatus({ sessionId, currentQuestionId: currentQuestion.id, status: 'asking' });
        return;
      }
      
      const newAnswer: ConversationAnswer = {
        id: answers[currentQuestion.id]?.id || crypto.randomUUID(),
        sessionId,
        questionId: currentQuestion.id,
        section: currentQuestion.section,
        rawValue: value,
        normalizedValue: value, // Mapping logic goes here for real implementation
        inputMethod,
        transcript,
        provenance: {
          source: inputMethod === 'demo' ? 'demo_data' : (inputMethod === 'voice' ? 'patient_voice' : (inputMethod === 'keyboard' ? 'patient_text' : 'patient_touch')),
          confidence: 'high'
        },
        answeredAt: new Date().toISOString(),
        editedByPatient: editedByPatient || false
      };

      if (sessionId === 'demo-session-123') {
        const nextAnswers = { ...answers, [currentQuestion.id]: newAnswer };
        const invalidKeys = invalidateBranch(currentQuestion.id, nextAnswers, questions);
        invalidKeys.forEach(k => delete nextAnswers[k]);
        setAnswers(nextAnswers);
        setStatus({ sessionId, status: 'transitioning' });
        return;
      }

      let savedAnswer = newAnswer;
      try {
        const res = await fetch('/api/kiosk/interview/answers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer: newAnswer })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        savedAnswer = data.answer;
      } catch {
        setValidationError('Failed to save answer. Please try again.');
        setStatus({ sessionId, currentQuestionId: currentQuestion.id, status: 'asking' });
        return;
      }
      
      const nextAnswers = { ...answers, [currentQuestion.id]: savedAnswer };
      
      // Invalidate branch logic
      const invalidKeys = invalidateBranch(currentQuestion.id, nextAnswers, questions);
      
      if (invalidKeys.length > 0) {
        const invalidDbIds = invalidKeys.map(k => nextAnswers[k].id);
        
        // Optimistic update
        invalidKeys.forEach(k => delete nextAnswers[k]);
        setAnswers(nextAnswers);
        
        // Option B: Recovery
        try {
          const delRes = await fetch('/api/kiosk/interview/answers', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answerIds: invalidDbIds })
          });
          const delData = await delRes.json();
          if (!delData.success) throw new Error(delData.error);
        } catch {
          // Revert optimistic update
          invalidKeys.forEach(k => {
            nextAnswers[k] = answers[k];
          });
          setAnswers({ ...answers, [currentQuestion.id]: savedAnswer });
          setValidationError('Network error: Failed to recalculate question flow. Please try again.');
          setStatus({ sessionId, currentQuestionId: currentQuestion.id, status: 'asking' });
          return;
        }
      } else {
        setAnswers(nextAnswers);
      }

      // Determine next question using Adaptive AI API
      setStatus(s => ({ ...s, status: 'transitioning' }));
      
      let nextQ: Question | null = null;
      let aiFallback = false;

      try {
        const allowedQuestionIds = questions.filter(q => !nextAnswers[q.id]).map(q => q.id);

        const aiReqBody = {
          sessionId,
          language: 'en', // Should come from session config in a real app
          currentSection: currentQuestion.section,
          currentQuestion: currentQuestion,
          latestAnswer: savedAnswer,
          previousAnswers: Object.values(nextAnswers),
          extractedFacts,
          structuredHistory: {}, // In full Phase 8, this would be the actual structured history
          allowedQuestionIds,
          questionBankContext: questions.filter(q => allowedQuestionIds.includes(q.id))
        };

        const aiRes = await fetch('/api/kiosk/interview/adaptive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(aiReqBody)
        });

        const aiData = await aiRes.json();
        
        if (aiData.success && aiData.response) {
          const aiLogic = aiData.response;
          // Apply AI logic
          if (aiLogic.extractedFacts && aiLogic.extractedFacts.length > 0) {
            setExtractedFacts(prev => {
              const newFacts = [...prev];
              for (const fact of aiLogic.extractedFacts) {
                // simple merge, overwriting if field exists, though we might want to append
                const existingIdx = newFacts.findIndex(f => f.field === fact.field);
                if (existingIdx >= 0) newFacts[existingIdx] = fact;
                else newFacts.push(fact);
              }
              return newFacts;
            });
          }

          if (aiLogic.nextAction === 'ask_follow_up' && aiLogic.nextQuestionId) {
            nextQ = questions.find(q => q.id === aiLogic.nextQuestionId) || null;
          } else if (aiLogic.nextAction === 'continue_deterministic') {
            aiFallback = true;
          }
        } else {
          aiFallback = true;
        }
      } catch (err) {
        console.warn('AI Request Failed, falling back to deterministic routing', err);
        aiFallback = true;
      }

      // Deterministic fallback
      if (aiFallback || !nextQ) {
        nextQ = getNextQuestion(currentQuestion.id, nextAnswers, questions);
      }

      if (nextQ) {
        setStatus({ sessionId, currentQuestionId: nextQ.id, status: 'asking' });
      } else {
        setStatus({ sessionId, status: 'completed' });
        onComplete?.();
      }
    } catch (err) {
      console.error('Failed to save answer', err);
      const errObj = err instanceof Error ? err : new Error(String(err));
      onError?.(errObj);
      setValidationError('Failed to save answer. Please try again.');
      setStatus(s => ({ ...s, status: 'error', error: errObj.message }));
    }
  }, [sessionId, currentQuestion, answers, questions, onComplete, onError, extractedFacts]);

  const goBack = React.useCallback(() => {
    if (!currentQuestion) return;
    setValidationError(null);
    const prevQ = getPreviousQuestion(currentQuestion.id, answers, questions);
    if (prevQ) {
      setStatus({ sessionId, currentQuestionId: prevQ.id, status: 'asking' });
    }
  }, [answers, currentQuestion, questions, sessionId]);

  const resume = React.useCallback(() => {
    // If we're in error state, reset to asking for current question
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
