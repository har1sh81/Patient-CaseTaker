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
  const [patient, setPatient] = React.useState<any>(null);
  const [initialAnswers, setInitialAnswers] = React.useState<ConversationAnswer[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!sessionId) {
      router.push('/kiosk');
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
        setPatient(data.patient);
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
              language={(session.language as any) || 'en'}
              disabled={status.status === 'saving_answer' || status.status === 'validating'}
            >
              <QuestionRenderer
                question={currentQuestion}
                language={(session.language as any) || 'en'}
                onSubmit={engine.submitAnswer}
                disabled={status.status === 'saving_answer' || status.status === 'validating'}
              />
            </QuestionCard>
          </div>
        )}

        {/* Controls */}
        <div className="mt-auto pt-8">
          <div className="flex justify-center mb-2">
            <button
              onClick={() => router.push(`/kiosk/documents?sessionId=${session.id}`)}
              className="text-sm font-bold text-primary underline hover:text-primary-dark transition-colors px-4 py-2 rounded-lg hover:bg-primary/5"
            >
              Skip rest of interview & Go to Documents
            </button>
          </div>
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

