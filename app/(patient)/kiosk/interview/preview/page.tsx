'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KioskLayout } from '../../../../../components/kiosk/kiosk-layout';
import { Spinner } from '../../../../../components/ui/spinner';
import { Alert } from '../../../../../components/ui/alert';
import { ClinicalHistoryReport } from '../../../../../types';

function PreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const patientId = searchParams.get('patientId'); // passed in from timeline or previous step

  const [report, setReport] = React.useState<ClinicalHistoryReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!sessionId || !patientId) {
      router.push('/kiosk');
      return;
    }

    let isMounted = true;

    async function generateReport() {
      try {
        const res = await fetch('/api/kiosk/interview/report/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, patientId })
        });
        const data = await res.json();

        if (!isMounted) return;

        if (!data.success) {
          setError(data.error || 'Failed to generate report');
        } else {
          setReport(data.report);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to generate report');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    generateReport();

    return () => {
      isMounted = false;
    };
  }, [sessionId, patientId, router]);

  if (loading) {
    return (
      <KioskLayout activeStepIndex={4}>
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
          <Spinner size="lg" />
          <h2 className="text-2xl font-semibold">Compiling Final Clinical History Draft...</h2>
          <p className="text-secondary-text">Fusing interview answers, uploaded documents, ABDM records, and timelines.</p>
        </div>
      </KioskLayout>
    );
  }

  if (error) {
    return (
      <KioskLayout activeStepIndex={4}>
        <div className="max-w-2xl mx-auto pt-12">
          <Alert variant="error" title="Generation Error" className="mb-6">
            <p>{error}</p>
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

  if (!report) return null;

  return (
    <KioskLayout activeStepIndex={4}>
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-6 rounded shadow-sm" role="alert">
          <p className="font-bold uppercase tracking-wider">DRAFT — REQUIRES PHYSICIAN REVIEW</p>
          <p className="text-sm mt-1">
            This clinical history is generated from information provided by the patient and available records. 
            It requires review and verification by a healthcare professional. Do NOT use this for autonomous clinical decisions.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-8 space-y-8">
          {/* Header */}
          <div className="border-b pb-6">
            <h1 className="text-3xl font-bold mb-2">Clinical History Draft</h1>
            <div className="text-sm text-secondary-text flex items-center space-x-4">
              <span>Patient: {report.patient.fullName}</span>
              <span>Generated: {new Date(report.generatedAt).toLocaleString()}</span>
              <span>Ref: {report.reference.referenceNumber}</span>
            </div>
          </div>

          {/* Chief Complaint */}
          {report.clinicalHistory.chiefComplaint && (
            <section>
              <h2 className="text-xl font-semibold mb-3">Chief Complaint</h2>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-lg">{report.clinicalHistory.chiefComplaint.primaryComplaint}</p>
                {report.clinicalHistory.chiefComplaint.provenance && (
                  <p className="text-xs text-gray-500 mt-2">Source: {report.clinicalHistory.chiefComplaint.provenance.source}</p>
                )}
              </div>
            </section>
          )}

          {/* HPI */}
          {report.clinicalHistory.historyOfPresentIllness && (
            <section>
              <h2 className="text-xl font-semibold mb-3">History of Present Illness</h2>
              <div className="bg-gray-50 rounded-xl p-4">
                <p>{report.clinicalHistory.historyOfPresentIllness.patientNarrative || 'Not reported'}</p>
              </div>
            </section>
          )}

          {/* Timeline & Flags Preview (Just raw lists for preview) */}
          <section className="grid grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-3">Attention Flags</h2>
              {report.attentionFlags.length === 0 ? (
                <p className="text-gray-500 italic">No attention flags raised.</p>
              ) : (
                <ul className="space-y-2">
                  {report.attentionFlags.map((flag, idx) => (
                    <li key={idx} className="p-3 bg-red-50 text-red-900 border border-red-200 rounded-lg text-sm">
                      <span className="font-semibold">{flag.label}: </span> {flag.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">Documents / Sources</h2>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>Uploaded Documents: {report.documentSummary.uploadedDocumentCount}</li>
                <li>Extracted Conditions: {report.documentSummary.extractedConditions.length}</li>
                <li>Timeline Events: {report.medicalTimeline.length}</li>
              </ul>
            </div>
          </section>

          {/* Next Steps (Phase 15 Teaser) */}
          <div className="pt-8 flex justify-end">
            <button
              type="button"
              onClick={() => router.push(`/kiosk/review?sessionId=${sessionId}`)}
              className="px-8 py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Proceed to Review & Confirm
            </button>
          </div>
        </div>
      </div>
    </KioskLayout>
  );
}

export default function PreviewPage() {
  return (
    <React.Suspense fallback={<KioskLayout activeStepIndex={4}><div className="flex h-[50vh] items-center justify-center"><Spinner /></div></KioskLayout>}>
      <PreviewContent />
    </React.Suspense>
  );
}
