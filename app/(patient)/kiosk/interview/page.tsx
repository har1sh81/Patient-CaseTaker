'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KioskLayout } from '../../../../components/kiosk/kiosk-layout';
import {
  QuestionCard,
  QuestionRenderer,
  ConversationControls,
  ConversationProgress,
} from '../../../../components/kiosk';
import { Spinner } from '../../../../components/ui/spinner';
import { Alert } from '../../../../components/ui/alert';
import type { Question } from '../../../../types';
import type { SupportedLanguage } from '../../../../lib/language/config';
import type { ProgressResult } from '../../../../lib/conversation/progress';

// --- Helpers ----------------------------------------------------------------

/**
 * Build a synthetic Question compatible with QuestionCard / QuestionRenderer
 * from the dynamic backend's plain { id, text } shape.
 */
function buildSyntheticQuestion(id: string, text: string): Question {
  return {
    id,
    section: 'hpi',
    question: { en: text, ta: text, hi: text },
    inputType: 'text',
    allowVoice: true,
    required: true,
  } as Question;
}

/**
 * Build a ProgressResult from a raw percentage number for ConversationProgress.
 */
function buildProgressResult(pct: number, questionIndex: number): ProgressResult {
  const total = Math.max(10, questionIndex + 4);
  const completed = Math.round((pct / 100) * total);
  return {
    percentage: Math.min(100, Math.max(0, pct)),
    completedQuestions: completed,
    totalQuestions: total,
    currentSection: 'hpi',
    isComplete: pct >= 100,
  } as ProgressResult;
}

// --- Inner Content (needs Suspense) -----------------------------------------

function InterviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

<<<<<<< HEAD
  const [session, setSession] = React.useState<IntakeSession | null>(null);
  const [patient, setPatient] = React.useState<any>(null);
  const [initialAnswers, setInitialAnswers] = React.useState<ConversationAnswer[] | null>(null);
=======
  // Session metadata
  const [language, setLanguage] = React.useState<SupportedLanguage>('en');
>>>>>>> 9b15b55e6bfc5248cad871ac756bf1cd79d85166
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [sessionReady, setSessionReady] = React.useState(false);

  // Dynamic interview state
  const [currentQuestion, setCurrentQuestion] = React.useState<{ id: string; text: string } | null>(null);
  const [progress, setProgress] = React.useState(10);
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [engineStatus, setEngineStatus] = React.useState<
    'loading' | 'asking' | 'saving' | 'urgent' | 'completed' | 'error'
  >('loading');
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // -- 1. Load Session + Start/Restore Interview ---------------------------
  React.useEffect(() => {
    if (!sessionId) {
      router.push('/kiosk');
      return;
    }

    let isMounted = true;

    async function init() {
      try {
        // Fetch session metadata
        const sessRes = await fetch(`/api/kiosk/interview/session?sessionId=${sessionId}`);
        const sessJson = await sessRes.json();

        if (!isMounted) return;

        if (!sessJson.success || !sessJson.session) {
          router.push('/kiosk');
          return;
        }

<<<<<<< HEAD
        setSession(data.session);
        setPatient(data.patient);
        setInitialAnswers(data.answers);
      } catch (err) {
        if (isMounted) {
          React.startTransition(() => {
            setLoadError(err instanceof Error ? err.message : 'Failed to load session');
=======
        const sess = sessJson.session;
        const lang = (sess.language as SupportedLanguage) || 'en';
        setLanguage(lang);

        // Persist sessionId for browser refresh
        try { localStorage.setItem('medikiosk_active_sessionId', sessionId!); } catch { /* ignore */ }

        // Fetch existing dynamic interview state
        const stateRes = await fetch(`/api/interview/${sessionId}`);
        const stateJson = await stateRes.json();

        if (!isMounted) return;

        if (stateJson.success && stateJson.data) {
          const state = stateJson.data;

          if (state.status === 'terminated_for_safety' || state.redFlagStatus === 'urgent') {
            setEngineStatus('urgent');
            setSessionReady(true);
            return;
          }
          if (state.status === 'completed') {
            setEngineStatus('completed');
            setProgress(100);
            setSessionReady(true);
            return;
          }
          if (state.currentQuestion) {
            setCurrentQuestion({ id: state.currentQuestion.id, text: state.currentQuestion.text });
            setProgress(state.progress || 10);
          }
          setEngineStatus('asking');
          setSessionReady(true);
          return;
        }

        // Start a new interview session
        const startRes = await fetch('/api/interview/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId: sess.patientId,
            encounterId: sess.encounterId,
            department: sess.departmentMode === 'ayush' ? 'AYUSH' : 'General Medicine',
            consultationMode: sess.departmentMode === 'ayush' ? 'ayush' : 'general_medicine',
            language: lang,
            chiefComplaint: sess.chiefComplaint || undefined,
            sessionId: sessionId || undefined,
          }),
        });
        const startJson = await startRes.json();

        if (!isMounted) return;

        if (startJson.success && startJson.data?.currentQuestion) {
          setCurrentQuestion({
            id: startJson.data.currentQuestion.id,
            text: startJson.data.currentQuestion.text,
          });
          setProgress(startJson.data.progress || 10);
          setEngineStatus('asking');
        } else {
          setLoadError('Could not start the interview. Please try again.');
          setEngineStatus('error');
        }
        setSessionReady(true);
      } catch (err) {
        console.error('[Interview] init error:', err);
        if (isMounted) {
          setLoadError('Something went wrong loading the interview.');
          setEngineStatus('error');
          setSessionReady(true);
        }
      }
    }

    init();
    return () => { isMounted = false; };
  }, [sessionId, router]);

  // -- 2. Submit Answer ----------------------------------------------------
  const handleSubmitAnswer = React.useCallback(
    async (
      value: unknown,
      method: 'voice' | 'touch' | 'keyboard',
      transcript?: string,
      _edited?: boolean
    ) => {
      if (!currentQuestion || engineStatus === 'saving') return;

      setSaveError(null);
      setEngineStatus('saving');

      const answerText =
        typeof value === 'string' ? value.trim() :
        typeof transcript === 'string' ? transcript.trim() :
        String(value);

      try {
        const res = await fetch(`/api/interview/${sessionId}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId: currentQuestion.id,
            answer: answerText,
            inputMethod: method,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setSaveError('Could not save your answer. Please try again.');
          setEngineStatus('asking');
          return;
        }

        const result = data.data;
        if (!result) {
          setEngineStatus('asking');
          return;
        }

        const { status, nextQuestion, progress: newProgress, redFlagStatus } = result;

        if (newProgress !== undefined) setProgress(newProgress);

        if (status === 'terminated_for_safety' || redFlagStatus === 'urgent') {
          setEngineStatus('urgent');
          return;
        }
        if (status === 'completed') {
          setProgress(100);
          setEngineStatus('completed');
          return;
        }
        if (nextQuestion?.text) {
          setCurrentQuestion({ id: nextQuestion.id || `q_${Date.now()}`, text: nextQuestion.text });
          setQuestionIndex((prev) => prev + 1);
          setEngineStatus('asking');
        } else {
          setEngineStatus('asking');
        }
      } catch (err) {
        console.error('[Interview] submit error:', err);
        setSaveError('Something went wrong. Please try again.');
        setEngineStatus('asking');
      }
    },
    [currentQuestion, engineStatus, sessionId]
  );

  const handleCancel = () => router.push('/kiosk');

  const handleSkip = async () => {
    if (!sessionId) return;
    setEngineStatus('saving');
    try {
      await fetch(`/api/interview/${sessionId}/complete`, { method: 'POST' });
      setEngineStatus('completed');
    } catch (err) {
      console.error('Skip failed:', err);
      setEngineStatus('completed'); // Still go forward even if it fails
    }
  };

  React.useEffect(() => {
    if (engineStatus === 'completed' && sessionId) {
      const t = setTimeout(() => {
        router.push(`/kiosk/documents?sessionId=${sessionId}`);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [engineStatus, sessionId, router]);

  // -- 3. Loading ----------------------------------------------------------
  if (!sessionReady || engineStatus === 'loading') {
    return (
      <KioskLayout activeStepIndex={1}>
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <Spinner size="lg" />
          <p className="text-text-secondary font-medium">Preparing your interview...</p>
        </div>
      </KioskLayout>
    );
  }

  // -- 4. Load Error -------------------------------------------------------
  if (engineStatus === 'error' || loadError) {
    return (
      <KioskLayout activeStepIndex={1}>
        <div className="max-w-2xl mx-auto pt-12">
          <Alert variant="error" title="Session Error" className="mb-6">
            <p>{loadError || 'An unexpected error occurred.'}</p>
          </Alert>
          <button
            type="button"
            onClick={() => router.push('/kiosk')}
            className="w-full py-4 bg-primary text-white font-bold rounded-xl"
          >
            Return to Start
          </button>
        </div>
      </KioskLayout>
    );
  }

  // -- 5. Urgent Safety State ---------------------------------------------
  if (engineStatus === 'urgent') {
    return (
      <KioskLayout activeStepIndex={1}>
<<<<<<< HEAD
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <Spinner size="lg" />
          <p className="text-text-secondary font-medium">Loading session...</p>
        </div>
      </KioskLayout>
    );
  }

  return <InterviewEngineWrapper session={session} patient={patient} initialAnswers={initialAnswers} />;
}

function InterviewEngineWrapper({ session, patient, initialAnswers }: { session: IntakeSession; patient: any; initialAnswers: ConversationAnswer[] }) {
  const router = useRouter();

  // Initialize engine
  const engine = useConversationEngine({
    sessionId: session.id,
    language: session.language,
    questions: session.departmentMode === 'ayush' ? PHASE13_AYUSH_QUESTIONS : PHASE6_DEMO_QUESTIONS,
    initialAnswers,
    onComplete: () => {
      // Transition to Document Capture phase
      router.push(`/kiosk/documents?sessionId=${session.id}`);
    },
  });

  const handleCancel = () => {
    router.push('/kiosk');
  };

  const { status, currentQuestion, progress, validationError } = engine;

  if (status.status === 'starting' || status.status === 'idle') {
    return (
      <KioskLayout 
        activeStepIndex={1} 
        departmentMode={session.departmentMode} 
        language={session.language}
        patientName={patient?.demographics?.fullName}
        sessionId={session.id}
      >
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <Spinner size="lg" />
          <p className="text-text-secondary font-medium">Preparing your interview...</p>
        </div>
      </KioskLayout>
    );
  }

  if (status.status === 'error') {
    return (
      <KioskLayout 
        activeStepIndex={1} 
        departmentMode={session.departmentMode} 
        language={session.language}
        patientName={patient?.demographics?.fullName}
        sessionId={session.id}
      >
        <div className="max-w-2xl mx-auto pt-12">
          <Alert variant="error" title="Something went wrong" className="mb-6">
            <p>{status.error || 'Failed to load conversation.'}</p>
          </Alert>
=======
        <div className="flex flex-col items-center justify-center h-[60vh] gap-6 animate-in fade-in zoom-in-95">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-red-700 text-center">Immediate Attention Required</h2>
          <p className="text-text-secondary text-lg text-center max-w-md">
            Your responses indicate a need for immediate medical attention. Please inform the kiosk attendant or go to the emergency desk.
          </p>
>>>>>>> 9b15b55e6bfc5248cad871ac756bf1cd79d85166
          <button
            type="button"
            onClick={() => router.push('/kiosk')}
            className="mt-4 px-10 py-4 bg-red-600 text-white font-bold rounded-2xl text-lg hover:bg-red-700 transition-all"
          >
            Return to Kiosk
          </button>
        </div>
      </KioskLayout>
    );
  }

  // -- 6. Completed -------------------------------------------------------
  if (engineStatus === 'completed') {
    return (
      <KioskLayout 
        activeStepIndex={1} 
        departmentMode={session.departmentMode} 
        language={session.language}
        patientName={patient?.demographics?.fullName}
        sessionId={session.id}
      >
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4 animate-in fade-in zoom-in-95">
          <div className="w-20 h-20 bg-success/20 text-success rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-text-main">Interview Complete</h2>
          <p className="text-text-secondary text-lg">Thank you. Preparing your summary...</p>
        </div>
      </KioskLayout>
    );
  }

  // -- 7. Active Interview ------------------------------------------------
  const syntheticQuestion: Question | null = currentQuestion
    ? buildSyntheticQuestion(currentQuestion.id, currentQuestion.text)
    : null;

  const progressResult = buildProgressResult(progress, questionIndex);
  const isDisabled = engineStatus === 'saving';

  return (
    <KioskLayout 
      activeStepIndex={1} 
      departmentMode={session.departmentMode} 
      language={session.language}
      patientName={patient?.demographics?.fullName}
      sessionId={session.id}
    >
      <div className="w-full max-w-4xl mx-auto flex flex-col pt-8 pb-24 px-4 min-h-[calc(100vh-100px)]">

        {/* Progress Bar */}
        <ConversationProgress progress={progressResult} />

        {/* Save Error Banner */}
        {saveError && (
          <div className="mb-6 animate-in slide-in-from-top-2">
            <Alert variant="error" title="Notice">
              <div className="flex items-center justify-between">
                <span>{saveError}</span>
                <button
                  type="button"
                  onClick={() => setSaveError(null)}
                  className="text-xs underline font-bold ml-4"
                >
                  Dismiss
                </button>
              </div>
            </Alert>
          </div>
        )}

        {/* Main Question Card */}
        {syntheticQuestion && (
          <div className="flex-1 flex flex-col justify-center">
            <QuestionCard
              question={syntheticQuestion}
              language={language}
              disabled={isDisabled}
            >
              <QuestionRenderer
                question={syntheticQuestion}
                language={language}
                onSubmit={handleSubmitAnswer}
                disabled={isDisabled}
              />
            </QuestionCard>
          </div>
        )}

        {/* Saving Indicator */}
        {isDisabled && (
          <div className="flex items-center justify-center gap-3 py-4">
            <Spinner size="sm" />
            <span className="text-text-secondary font-medium">Processing your response...</span>
          </div>
        )}

        {/* Controls */}
        <div className="mt-auto pt-8 flex items-center gap-4">
          <ConversationControls
            onCancel={handleCancel}
            canGoBack={false}
            disabled={isDisabled}
          />
          <button
            type="button"
            onClick={handleSkip}
            disabled={isDisabled}
            className="px-6 py-3 font-medium text-text-secondary bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Skip to next step
          </button>
        </div>
      </div>
    </KioskLayout>
  );
}

// --- Page (with Suspense for useSearchParams) --------------------------------

export default function InterviewPage() {
  return (
    <React.Suspense fallback={
      <KioskLayout activeStepIndex={1}>
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <Spinner size="lg" />
          <p className="text-text-secondary font-medium">Loading...</p>
        </div>
      </KioskLayout>
    }>
      <InterviewContent />
    </React.Suspense>
  );
}
