'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KioskLayout } from '../../../../components/kiosk/kiosk-layout';
import { useConversationEngine } from '../../../../lib/conversation/conversation-engine';
import { PHASE6_DEMO_QUESTIONS, PHASE13_AYUSH_QUESTIONS } from '../../../../lib/conversation/question-library';
import {
  QuestionCard,
  QuestionRenderer,
  ConversationControls,
  ConversationProgress,
} from '../../../../components/kiosk';
import { Spinner } from '../../../../components/ui/spinner';
import { Alert } from '../../../../components/ui/alert';
import { ConversationAnswer, IntakeSession } from '../../../../types';

function InterviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [session, setSession] = React.useState<IntakeSession | null>(null);
  const [initialAnswers, setInitialAnswers] = React.useState<ConversationAnswer[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!sessionId) {
      router.push('/kiosk');
      return;
    }

    if (sessionId === 'demo-session-123') {
      // Demo mode bypass
      React.startTransition(() => {
        setSession({
          id: 'demo-session-123',
          patientId: 'demo-patient',
          departmentMode: 'standard',
          language: 'en',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date().toISOString()
        } as unknown as IntakeSession);
        setInitialAnswers([]);
      });
      return;
    }

    let isMounted = true;

    async function loadData() {
      try {
        const res = await fetch(`/api/kiosk/interview/session?sessionId=${sessionId}`);
        const data = await res.json();

        if (!isMounted) return;

        if (!data.success) {
          if (data.status === 403 || data.status === 404 || data.error === 'Session is expired or inactive') {
            router.push('/kiosk');
          } else {
            setLoadError(data.error || 'Failed to load session');
          }
          return;
        }

        setSession(data.session);
        setInitialAnswers(data.answers);
      } catch (err) {
        if (isMounted) {
          React.startTransition(() => {
            setLoadError(err instanceof Error ? err.message : 'Failed to load session');
          });
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [sessionId, router]);

  if (loadError) {
    return (
      <KioskLayout activeStepIndex={1}>
        <div className="max-w-2xl mx-auto pt-12">
          <Alert variant="error" title="Session Error" className="mb-6">
            <p>{loadError}</p>
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

  if (!session || initialAnswers === null) {
    return (
      <KioskLayout activeStepIndex={1}>
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <Spinner size="lg" />
          <p className="text-text-secondary font-medium">Loading session...</p>
        </div>
      </KioskLayout>
    );
  }

  return <InterviewEngineWrapper session={session} initialAnswers={initialAnswers} />;
}

function InterviewEngineWrapper({ session, initialAnswers }: { session: IntakeSession, initialAnswers: ConversationAnswer[] }) {
  const router = useRouter();

  // Initialize engine
  const engine = useConversationEngine({
    sessionId: session.id,
    questions: session.departmentMode === 'ayush' ? PHASE13_AYUSH_QUESTIONS : PHASE6_DEMO_QUESTIONS,
    initialAnswers,
    onComplete: () => {
      // Transition to Document Capture phase
      router.push(`/kiosk/documents?sessionId=${session.id}`);
    },
  });

  const handleCancel = () => {
    // In a real app, hit an API to cancel the session and delete data
    router.push('/kiosk');
  };

  const { status, currentQuestion, progress, validationError } = engine;

  if (status.status === 'starting' || status.status === 'idle') {
    return (
      <KioskLayout activeStepIndex={1}>
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <Spinner size="lg" />
          <p className="text-text-secondary font-medium">Preparing your interview...</p>
        </div>
      </KioskLayout>
    );
  }

  if (status.status === 'error') {
    return (
      <KioskLayout activeStepIndex={1}>
        <div className="max-w-2xl mx-auto pt-12">
          <Alert variant="error" title="Something went wrong" className="mb-6">
            <p>{status.error || 'Failed to load conversation.'}</p>
          </Alert>
          <button
            type="button"
            onClick={engine.resume}
            className="w-full py-4 bg-primary text-white font-bold rounded-xl"
          >
            Try Again
          </button>
        </div>
      </KioskLayout>
    );
  }

  if (status.status === 'completed') {
    return (
      <KioskLayout activeStepIndex={1}>
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

  return (
    <KioskLayout activeStepIndex={1}>
      <div className="w-full max-w-4xl mx-auto flex flex-col pt-8 pb-24 px-4 min-h-[calc(100vh-100px)]">
        
        {/* Progress Bar */}
        <ConversationProgress progress={progress} />

        {/* Validation Error Banner */}
        {validationError && (
          <div className="mb-6 animate-in slide-in-from-top-2">
            <Alert variant="error" title="Validation Error">
              {validationError}
            </Alert>
          </div>
        )}

        {/* Main Question Card */}
        {currentQuestion && (
          <div className="flex-1 flex flex-col justify-center">
            <QuestionCard
              question={currentQuestion}
              language="en" // Hardcoded to 'en' for now, could be pulled from session
              disabled={status.status === 'saving_answer' || status.status === 'validating'}
            >
              <QuestionRenderer
                question={currentQuestion}
                language="en"
                onSubmit={engine.submitAnswer}
                disabled={status.status === 'saving_answer' || status.status === 'validating'}
              />
            </QuestionCard>
          </div>
        )}

        {/* Controls */}
        <div className="mt-auto pt-8">
          <ConversationControls
            onBack={engine.goBack}
            onCancel={handleCancel}
            canGoBack={progress.completedQuestions > 0}
            disabled={status.status === 'saving_answer' || status.status === 'validating'}
          />
        </div>
      </div>
    </KioskLayout>
  );
}

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

