'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KioskLayout } from '../../../../components/kiosk/kiosk-layout';
import { QRCodeDisplay, DocumentList } from '../../../../components/documents';
import { Button } from '../../../../components/ui/button';
import { Spinner } from '../../../../components/ui/spinner';
import { Alert } from '../../../../components/ui/alert';
import { MedicalDocument } from '../../../../types';

function DocumentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [documents, setDocuments] = React.useState<MedicalDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const fetchDocuments = React.useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/kiosk/documents?sessionId=${sessionId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setDocuments(data.documents || []);
      } else {
        if (data.status === 403 || data.status === 404) {
          router.push('/kiosk');
        } else {
          setErrorMsg(data.error || 'Failed to load documents');
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load documents due to a network error');
    } finally {
      setLoading(false);
    }
  }, [sessionId, router]);

  React.useEffect(() => {
    if (!sessionId) {
      router.push('/kiosk');
      return;
    }
    // Wait a tick to avoid synchronous setState warning
    const timer = setTimeout(() => {
      void fetchDocuments();
    }, 0);
    
    // Poll for new documents every 3 seconds
    const pollInterval = setInterval(() => {
      void fetchDocuments();
    }, 3000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(pollInterval);
    };
  }, [sessionId, fetchDocuments, router]);

  const handleDocumentRemoved = (documentId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
  };

  const handleContinue = () => {
    // Route to timeline construction phase
    router.push(`/kiosk/timeline?sessionId=${sessionId}`);
  };

  if (!sessionId) return null;

  if (loading) {
    return (
      <KioskLayout activeStepIndex={2}>
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <Spinner size="lg" />
          <p className="text-text-secondary font-medium">Loading documents...</p>
        </div>
      </KioskLayout>
    );
  }

  return (
    <KioskLayout activeStepIndex={2}>
      <div className="w-full max-w-4xl mx-auto flex flex-col pt-8 pb-24 px-4 gap-8 min-h-[calc(100vh-100px)] animate-in fade-in zoom-in-95">
        
        <div className="text-center">
          <h1 className="text-3xl font-black text-secondary mb-3">Previous Medical Records</h1>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            If you have any old prescriptions, lab reports, or scans, you can add them here to help the doctor better understand your medical history.
          </p>
        </div>

        {errorMsg && (
          <Alert variant="error" title="Error Loading Documents">
            {errorMsg}
          </Alert>
        )}

        <DocumentList 
          documents={documents} 
          sessionId={sessionId} 
          onDocumentRemoved={handleDocumentRemoved} 
        />

        <QRCodeDisplay sessionId={sessionId} />

        <div className="mt-auto pt-8 border-t border-border-light flex justify-end">
          <Button
            variant="primary"
            size="lg"
            className="w-full md:w-auto min-w-[200px]"
            onClick={handleContinue}
          >
            {documents.length > 0 ? 'Continue' : 'Skip & Continue'}
          </Button>
        </div>
      </div>
    </KioskLayout>
  );
}

export default function DocumentsPage() {
  return (
    <React.Suspense fallback={
      <KioskLayout activeStepIndex={2}>
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <Spinner size="lg" />
          <p className="text-text-secondary font-medium">Loading...</p>
        </div>
      </KioskLayout>
    }>
      <DocumentsContent />
    </React.Suspense>
  );
}
