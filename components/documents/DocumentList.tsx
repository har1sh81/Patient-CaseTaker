'use client';

import * as React from 'react';
import { FileText, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '../ui/card';
import { Spinner } from '../ui/spinner';
import { Button } from '../ui/button';
import { MedicalDocument, OCRResponse, DocumentExtractionResult } from '../../types';

interface DocumentListProps {
  documents: MedicalDocument[];
  sessionId?: string;
  token?: string;
  onDocumentRemoved: (documentId: string) => void;
}

function OcrBadge({ documentId, sessionId }: { documentId: string; sessionId?: string }) {
  const [ocr, setOcr] = React.useState<OCRResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [showText, setShowText] = React.useState(false);

  React.useEffect(() => {
    if (!sessionId) return;
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/kiosk/documents/${documentId}/ocr?sessionId=${sessionId}`);
        const data = await res.json();
        if (data.success && data.ocr) {
          setOcr(data.ocr);
        }
      } catch {
        // ignore
      }
    };
    checkStatus();
  }, [documentId, sessionId]);

  const triggerOcr = async (retry = false) => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/kiosk/documents/${documentId}/ocr${retry ? '?retry=true' : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data.ocr) {
        setOcr(data.ocr);
      }
    } catch {
      setError('Failed to process document');
    } finally {
      setLoading(false);
    }
  };

  if (loading || ocr?.status === 'processing') {
    return (
      <div className="flex items-center gap-2 mt-2">
        <Spinner className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-primary">Extracting text...</span>
      </div>
    );
  }

  if (ocr?.status === 'completed') {
    return (
      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <span className="text-xs font-bold text-success">OCR Complete</span>
          <Button variant="outline" size="sm" onClick={() => setShowText(!showText)}>
            {showText ? 'Hide Text' : 'View Text'}
          </Button>
        </div>
        {showText && (
          <div className="bg-surface-secondary p-3 rounded-lg text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
            {ocr.rawText}
          </div>
        )}
      </div>
    );
  }

  if (ocr?.status === 'failed' || ocr?.status === 'requires_review') {
    return (
      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-error" />
          <span className="text-xs font-bold text-error">
            {ocr.status === 'requires_review' ? 'Low Confidence OCR' : 'OCR Failed'}
          </span>
          <Button variant="outline" size="sm" onClick={() => triggerOcr(true)}>
            Retry
          </Button>
        </div>
        {ocr.status === 'requires_review' && showText && (
          <div className="bg-error/10 p-3 rounded-lg text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto text-error-dark">
            {ocr.rawText}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2">
      <Button variant="primary" size="sm" onClick={() => triggerOcr(false)}>
        Extract Text (OCR)
      </Button>
    </div>
  );
}

function ExtractionBadge({ documentId, sessionId }: { documentId: string; sessionId: string }) {
  const [ext, setExt] = React.useState<DocumentExtractionResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [showReview, setShowReview] = React.useState(false);

  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/kiosk/documents/${documentId}/extract?sessionId=${sessionId}`);
        const data = await res.json();
        if (data.success && data.extraction) {
          setExt(data.extraction);
        }
      } catch {
      // ignore
      }
    };
    checkStatus();
  }, [documentId, sessionId]);

  const triggerExtraction = async (retry = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kiosk/documents/${documentId}/extract${retry ? '?retry=true' : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data.extraction) {
        setExt(data.extraction);
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      alert('Extraction Request failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading || ext?.extractionStatus === 'processing') {
    return (
      <div className="flex items-center gap-2 mt-2">
        <Spinner className="w-4 h-4 text-secondary" />
        <span className="text-xs font-medium text-secondary">Extracting clinical info...</span>
      </div>
    );
  }

  if (ext?.extractionStatus === 'completed' || ext?.extractionStatus === 'requires_review') {
    const findingsCount = 
      ext.diagnosesMentioned.length + 
      ext.medications.length + 
      (ext.allergies?.length || 0) + 
      ext.procedures.length + 
      ext.laboratoryResults.length;

    return (
      <div className="mt-2 space-y-2 border-t border-border-light pt-2">
        <div className="flex items-center gap-2">
          {ext.extractionStatus === 'requires_review' ? (
            <AlertCircle className="w-4 h-4 text-warning" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-success" />
          )}
          <span className={`text-xs font-bold ${ext.extractionStatus === 'requires_review' ? 'text-warning' : 'text-success'}`}>
            {findingsCount} Clinical Entities Extracted
          </span>
          <Button variant="outline" size="sm" onClick={() => setShowReview(!showReview)}>
            {showReview ? 'Hide' : 'Review Info'}
          </Button>
        </div>
        
        {showReview && (
          <div className="bg-surface-secondary p-3 rounded-lg text-xs space-y-2 max-h-48 overflow-y-auto">
            <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-2">
              Extracted from your document — requires healthcare professional verification.
            </p>
            {ext.medications.length > 0 && (
              <div>
                <span className="font-bold text-text-main">Medications:</span>
                <ul className="list-disc pl-4 text-text-secondary mt-1">
                  {ext.medications.map((m, i) => <li key={i}>{m.name} {m.dosage} {m.frequency}</li>)}
                </ul>
              </div>
            )}
            {ext.diagnosesMentioned.length > 0 && (
              <div>
                <span className="font-bold text-text-main">Conditions:</span>
                <ul className="list-disc pl-4 text-text-secondary mt-1">
                  {ext.diagnosesMentioned.map((c, i) => <li key={i}>{c.name} ({c.status})</li>)}
                </ul>
              </div>
            )}
            {ext.laboratoryResults.length > 0 && (
              <div>
                <span className="font-bold text-text-main">Labs:</span>
                <ul className="list-disc pl-4 text-text-secondary mt-1">
                  {ext.laboratoryResults.map((l, i) => <li key={i}>{l.testName} - {l.valueRaw} {l.unit}</li>)}
                </ul>
              </div>
            )}
            {ext.allergies?.length > 0 && (
              <div>
                <span className="font-bold text-text-main">Allergies:</span>
                <ul className="list-disc pl-4 text-text-secondary mt-1">
                  {ext.allergies.map((a, i) => <li key={i}>{a.allergen}</li>)}
                </ul>
              </div>
            )}
            {ext.procedures?.length > 0 && (
              <div>
                <span className="font-bold text-text-main">Procedures:</span>
                <ul className="list-disc pl-4 text-text-secondary mt-1">
                  {ext.procedures.map((p, i) => <li key={i}>{p.name} {p.date}</li>)}
                </ul>
              </div>
            )}
            {findingsCount === 0 && (
              <p className="text-text-muted italic">No structured clinical information found.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (ext?.extractionStatus === 'failed') {
    return (
      <div className="mt-2 space-y-2 border-t border-border-light pt-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-error" />
          <span className="text-xs font-bold text-error">Extraction Failed</span>
          <Button variant="outline" size="sm" onClick={() => triggerExtraction(true)}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 border-t border-border-light pt-2">
      <Button variant="secondary" size="sm" onClick={() => triggerExtraction(false)}>
        Extract Clinical Info
      </Button>
    </div>
  );
}


export function DocumentList({ documents, sessionId, token, onDocumentRemoved }: DocumentListProps) {
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const handleRemove = async (documentId: string) => {
    setRemovingId(documentId);
    try {
      const queryParam = token ? `token=${token}` : `sessionId=${sessionId}`;
      const res = await fetch(`/api/kiosk/documents/${documentId}?${queryParam}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onDocumentRemoved(documentId);
      } else {
        alert(data.error || 'Failed to remove document');
      }
    } catch {
      alert('Network error occurred during removal');
    } finally {
      setRemovingId(null);
    }
  };

  if (!documents || documents.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xl font-bold text-secondary">Uploaded Documents</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map((doc) => (
          <Card key={doc.id} className="p-4 border border-border-light rounded-xl flex items-center gap-4 bg-surface-main">
            <div className="bg-primary-light/10 p-3 rounded-xl shrink-0">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            
            <div className="flex-1 overflow-hidden">
              <p className="font-bold text-text-main truncate" title={doc.fileName}>
                {doc.fileName}
              </p>
              <div className="flex items-center gap-2 text-xs text-text-muted mt-1">
                <span className="capitalize">{doc.documentType.replace('_', ' ')}</span>
                <span>•</span>
                {doc.uploadStatus === 'completed' ? (
                  <span className="flex items-center gap-1 text-success font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Uploaded
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-warning font-medium">
                    <AlertCircle className="w-3 h-3" /> {doc.uploadStatus}
                  </span>
                )}
              </div>
              {/* Only show OCR capabilities on Kiosk, where sessionId is present, not on phone upload view */}
              {sessionId && (
                <>
                  <OcrBadge documentId={doc.id} sessionId={sessionId} />
                  {/* We conditionally render ExtractionBadge from within DocumentList so it displays below OCR badge. We will pass a flag or just let it fetch state. Actually, it's better to show it if OCR is complete, but we don't know OCR state here. So we'll pass sessionId and DocumentList will render it. The ExtractionBadge can fetch its own state, but it only shows the "Extract Clinical Info" button if we let it. Let's just render it always and it handles its internal state. However, to prevent user from clicking it before OCR, maybe it should just check OCR status too. For now, we'll render it and the backend prevents extraction if OCR is not complete. */}
                  <ExtractionBadge documentId={doc.id} sessionId={sessionId} />
                </>
              )}
            </div>

            <button
              onClick={() => handleRemove(doc.id)}
              disabled={removingId === doc.id}
              className="p-3 text-text-muted hover:text-error hover:bg-error/10 rounded-xl transition-colors disabled:opacity-50"
              aria-label="Remove document"
            >
              {removingId === doc.id ? (
                <Spinner className="w-5 h-5 text-error" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
