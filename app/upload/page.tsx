'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { DocumentCapture, DocumentList } from '../../components/documents';
import { MedicalDocument } from '../../types';
import { Spinner } from '../../components/ui/spinner';
import { Alert } from '../../components/ui/alert';

function UploadContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [documents, setDocuments] = React.useState<MedicalDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const fetchDocuments = React.useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/kiosk/documents?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setDocuments(data.documents || []);
      } else {
        setErrorMsg(data.error || 'Failed to load documents');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    if (!token) {
      setTimeout(() => {
        setErrorMsg('No upload token provided. Please scan the QR code from the kiosk again.');
        setLoading(false);
      }, 0);
      return;
    }
    const timer = setTimeout(() => {
      void fetchDocuments();
    }, 0);
    return () => clearTimeout(timer);
  }, [token, fetchDocuments]);

  const handleDocumentRemoved = (documentId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background-main">
        <Spinner size="lg" />
        <p className="mt-4 text-text-secondary font-medium">Connecting to secure session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-main text-text-main p-4 md:p-8 flex flex-col gap-6 max-w-lg mx-auto">
      <div className="text-center pt-4">
        <h1 className="text-2xl font-black text-primary mb-2">MediKiosk</h1>
        <h2 className="text-xl font-bold text-secondary">Add Medical Documents</h2>
        <p className="text-sm text-text-secondary mt-2">
          Take a photo of your prescription or select a document from your phone.
        </p>
      </div>

      {errorMsg ? (
        <Alert variant="error" title="Session Error">
          {errorMsg}
        </Alert>
      ) : token ? (
        <>
          <DocumentCapture token={token} onUploadComplete={fetchDocuments} />
          
          <DocumentList 
            documents={documents} 
            token={token} 
            onDocumentRemoved={handleDocumentRemoved} 
          />
        </>
      ) : null}
    </div>
  );
}

export default function MobileUploadPage() {
  return (
    <React.Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Spinner size="lg" />
      </div>
    }>
      <UploadContent />
    </React.Suspense>
  );
}
