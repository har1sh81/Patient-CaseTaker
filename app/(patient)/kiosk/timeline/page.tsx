'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KioskLayout } from '../../../../components/kiosk/kiosk-layout';
import { MedicalTimelineView } from '../../../../components/timeline';
import { Button } from '../../../../components/ui/button';
import { Spinner } from '../../../../components/ui/spinner';
import { Alert } from '../../../../components/ui/alert';
import { MedicalTimeline, AttentionFlag } from '../../../../types';

function TimelineContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [timeline, setTimeline] = React.useState<MedicalTimeline | null>(null);
  const [flags, setFlags] = React.useState<AttentionFlag[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const organizeRecords = React.useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      // Fetch timeline
      const res = await fetch('/api/kiosk/interview/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTimeline(data.data);
      } else {
        setErrorMsg(data.error || 'Failed to organize records');
      }

      // Evaluate attention flags
      const attentionRes = await fetch('/api/kiosk/interview/attention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const attentionData = await attentionRes.json();
      if (attentionRes.ok && attentionData.success) {
        setFlags(attentionData.data);
      }

    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  React.useEffect(() => {
    if (!sessionId) {
      router.push('/kiosk');
      return;
    }
    // Auto trigger timeline generation when arriving, but in next tick
    const timer = setTimeout(() => {
      void organizeRecords();
    }, 0);
    return () => clearTimeout(timer);
  }, [sessionId, organizeRecords, router]);

  const handleContinue = () => {
    // Route to final clinical history generator preview
    router.push(`/kiosk/interview/preview?sessionId=${sessionId}`);
  };

  if (!sessionId) return null;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col pt-8 pb-24 px-4 gap-8 min-h-[calc(100vh-100px)] animate-in fade-in zoom-in-95">
      
      <div className="text-center">
        <h1 className="text-3xl font-black text-secondary mb-3">Your Medical Timeline</h1>
        <p className="text-text-secondary text-lg max-w-2xl mx-auto">
          We have gathered information from your interview, uploaded documents, and digital health records to build a chronological timeline.
        </p>
      </div>

      {flags.some(f => f.severity === 'high' || f.severity === 'critical') && (
        <Alert variant="warning" title="Clinical Review Recommended">
          Your responses contain information that may require prompt attention from healthcare staff.
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="error" title="Error Generating Timeline">
          {errorMsg}
        </Alert>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 gap-4 border border-border rounded-xl bg-surface/50">
          <Spinner size="lg" />
          <p className="text-text-secondary font-medium">Organizing and fusing records...</p>
        </div>
      ) : timeline ? (
        <MedicalTimelineView timeline={timeline} />
      ) : null}

      {!loading && (
        <div className="flex justify-between items-center mt-8 pt-8 border-t border-border">
          <Button variant="outline" size="lg" onClick={() => router.back()}>
            Back
          </Button>
          <div className="flex gap-4">
            {process.env.NODE_ENV === 'development' && flags.length > 0 && (
              <Button variant="outline" size="lg" onClick={() => console.dir(flags, { depth: null })}>
                Log Dev Flags
              </Button>
            )}
            <Button variant="outline" size="lg" onClick={organizeRecords}>
              Re-organize Records
            </Button>
            <Button variant="primary" size="lg" onClick={handleContinue} disabled={!timeline}>
              Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TimelinePage() {
  return (
    <KioskLayout activeStepIndex={3}>
      <React.Suspense fallback={<div className="flex items-center justify-center h-[50vh]"><Spinner size="lg" /></div>}>
        <TimelineContent />
      </React.Suspense>
    </KioskLayout>
  );
}
