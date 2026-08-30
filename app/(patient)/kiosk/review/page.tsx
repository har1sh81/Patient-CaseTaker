/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KioskLayout } from '../../../../components/kiosk/kiosk-layout';
import { Button } from '../../../../components/ui/button';
import { Card } from '../../../../components/ui/card';
import { Checkbox } from '../../../../components/ui/checkbox';
import { Alert } from '../../../../components/ui/alert';
import { Spinner } from '../../../../components/ui/spinner';
import { ShieldCheck, Edit2, AlertTriangle, FileText, Activity, UserPlus, Send, Info, MapPin, User, Clock, Building, Ticket } from 'lucide-react';

function PatientReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId') || '';

  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<Record<string, unknown> | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [confirmed, setConfirmed] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [handoffRef, setHandoffRef] = React.useState('');
  const [doctorInfo, setDoctorInfo] = React.useState<{
    doctorName: string;
    specialty: string;
    roomNumber: string;
    floor: string;
    tokenNumber: string;
  } | null>(null);
  const [countdown, setCountdown] = React.useState(20);

  const [editingField, setEditingField] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState('');

  React.useEffect(() => {
    if (!success) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          fetch('/api/kiosk/session/cleanup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, reason: 'user_cancelled' }),
          }).finally(() => {
            router.push('/kiosk');
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [success, sessionId, router]);

  React.useEffect(() => {
    if (!sessionId) {
      setTimeout(() => {
        setError('Session ID is missing');
        setLoading(false);
      }, 0);
      return;
    }

    fetch(`/api/kiosk/review/data?sessionId=${sessionId}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.error) throw new Error(resData.error);
        if (resData.session?.status === 'sent_to_doctor') {
          setSuccess(true);
          setHandoffRef(resData.session.handoffSnapshotId || 'MK-OK');
        }
        setData(resData);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleCorrection = async (fieldPath: string, previousValue: unknown) => {
    try {
      const res = await fetch('/api/kiosk/review/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          fieldPath,
          previousValue,
          correctedValue: editValue,
        }),
      });
      if (!res.ok) throw new Error('Failed to save correction');
      setEditingField(null);
      window.location.reload();
    } catch (err: unknown) {
      alert('Correction failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleConfirm = async () => {
    if (!confirmed) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/kiosk/review/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, patientConfirmed: true }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to confirm');

      if (resData.doctorAssignment) {
        setDoctorInfo(resData.doctorAssignment);
      }
      setSuccess(true);
      setHandoffRef(resData.snapshotId || 'MK-OK');
    } catch (err: unknown) {
      alert('Submission failed: ' + (err instanceof Error ? err.message : String(err)));
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <KioskLayout activeStepIndex={3}>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Spinner className="w-12 h-12 text-primary mb-4" />
          <h2 className="text-xl font-medium">Preparing your information...</h2>
        </div>
      </KioskLayout>
    );
  }

  if (error) {
    return (
      <KioskLayout activeStepIndex={3}>
        <div className="p-8">
          <Alert variant="error" title="Error">
            <h2 className="font-bold">We could not complete the handoff.</h2>
            <p>{error}</p>
          </Alert>
          <Button className="mt-4" onClick={() => router.push('/kiosk')}>Start Over</Button>
        </div>
      </KioskLayout>
    );
  }

  if (success) {
    const docName = doctorInfo?.doctorName || 'Dr. Rajesh Sharma, MD';
    const specialty = doctorInfo?.specialty || 'General Medicine & Internal Care';
    const room = doctorInfo?.roomNumber || 'Room 204';
    const floor = doctorInfo?.floor || '2nd Floor, OPD Wing B';
    const token = doctorInfo?.tokenNumber || 'MK-305';

    return (
      <KioskLayout activeStepIndex={4}>
        <div className="max-w-3xl mx-auto my-8 p-8 bg-white rounded-2xl border-2 border-green-300 shadow-xl text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-400">
            <ShieldCheck className="w-12 h-12 text-green-600" />
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Thank you for your cooperation!</h1>
          <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
            Your intake details and medical history have been sent directly to the Doctor&apos;s Dashboard.
          </p>

          {/* Doctor & Room Assignment Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 mb-8 text-left shadow-sm">
            <div className="flex justify-between items-start border-b border-blue-200 pb-4 mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-100 px-3 py-1 rounded-full">Assigned Practitioner</span>
                <h2 className="text-2xl font-bold text-gray-900 mt-2 flex items-center gap-2">
                  <User className="w-6 h-6 text-blue-600" /> {docName}
                </h2>
                <p className="text-sm font-medium text-blue-800">{specialty}</p>
              </div>
              <div className="text-right bg-white p-3 rounded-xl border border-blue-200 shadow-sm">
                <span className="text-xs font-semibold text-gray-500 block">Queue Token</span>
                <span className="text-2xl font-mono font-black text-blue-700">{token}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Consultation Room</span>
                  <span className="text-lg font-bold text-gray-900">{room}</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Floor / Wing</span>
                  <span className="text-base font-bold text-gray-900">{floor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions Box */}
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 mb-8 text-left text-sm space-y-2">
            <h3 className="font-bold text-gray-800 text-base mb-3 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-primary" /> Patient Next Steps
            </h3>
            <p className="text-gray-700">1. Please proceed directly to <strong>{room}</strong> ({floor}).</p>
            <p className="text-gray-700">2. Have a seat in the designated waiting area outside the room.</p>
            <p className="text-gray-700">3. Your token <strong>{token}</strong> will be announced on the display screen.</p>
          </div>

          {/* Auto Reset Timer Bar */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>This kiosk screen will automatically reset in <strong className="text-gray-900 font-bold">{countdown} seconds</strong></span>
            </div>

            <Button
              className="w-full max-w-sm py-4 text-base font-semibold bg-gray-900 hover:bg-black text-white"
              onClick={async () => {
                try {
                  await fetch('/api/kiosk/session/cleanup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, reason: 'user_cancelled' }),
                  });
                } catch {}
                router.push('/kiosk');
              }}
            >
              Finish Intake & Return to Kiosk Start
            </Button>
          </div>
        </div>
      </KioskLayout>
    );
  }

  const { patient, report, timeline, documents, hasAttentionFlags } = (data as any) || {};

  const renderEditableSection = (title: string, fieldPath: string, value: string) => {
    const isEditing = editingField === fieldPath;
    return (
      <div className="mb-4">
        <div className="flex justify-between items-start mb-1">
          <h4 className="font-semibold text-gray-700">{title}</h4>
          {!isEditing && (
            <button
              onClick={() => {
                setEditingField(fieldPath);
                setEditValue(value || '');
              }}
              className="text-primary text-sm flex items-center hover:underline"
            >
              <Edit2 className="w-3 h-3 mr-1" /> Edit
            </button>
          )}
        </div>
        {isEditing ? (
          <div className="flex flex-col gap-2 mt-2">
            <textarea
              className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleCorrection(fieldPath, value)}>Save Correction</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingField(null)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="text-gray-900 bg-gray-50 p-3 rounded">{value || 'Not reported'}</p>
        )}
      </div>
    );
  };

  return (
    <KioskLayout activeStepIndex={3}>
      <div className="max-w-4xl mx-auto pb-24">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Review your information</h1>
          <p className="text-gray-600">Please review the information below before sending it to the doctor.</p>
        </div>

        <Alert className="mb-6 bg-blue-50 border-blue-200 text-blue-800" title="CLINICAL HISTORY DRAFT">
          <FileText className="w-5 h-5 mr-2 text-blue-600" />
          <h3 className="font-semibold mb-1">CLINICAL HISTORY DRAFT</h3>
          <p className="text-sm">
            Generated from the information collected during this intake. 
            This draft has not yet been verified by a healthcare professional and does not constitute a diagnosis or treatment recommendation.
          </p>
        </Alert>

        {hasAttentionFlags && (
          <Alert className="mb-6 bg-yellow-50 border-yellow-200 text-yellow-800" title="Attention">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
            <p className="font-medium">Some of your responses may require prompt attention from healthcare staff.</p>
          </Alert>
        )}

        <div className="space-y-6">
          <Card className="p-6 shadow-sm">
            <h3 className="text-lg font-bold border-b pb-2 mb-4 flex items-center">
              <UserPlus className="w-5 h-5 mr-2" /> Patient Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 block">Name</span><span className="font-medium text-gray-900">{patient?.demographics?.fullName}</span></div>
              <div><span className="text-gray-500 block">Age</span><span className="font-medium text-gray-900">{patient?.demographics?.age || 'Unknown'}</span></div>
              <div><span className="text-gray-500 block">Hospital No.</span><span className="font-medium text-gray-900">{patient?.identification?.hospitalNumber || 'N/A'}</span></div>
              <div><span className="text-gray-500 block">ABHA Ref</span><span className="font-medium text-gray-900">{patient?.identification?.abhaReference || 'N/A'}</span></div>
            </div>
          </Card>

          <Card className="p-6 shadow-sm">
            <h3 className="text-lg font-bold border-b pb-2 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2" /> Current Complaint
            </h3>
            {renderEditableSection(
              'Reason for Visit', 
              'clinicalHistory.chiefComplaint.primaryComplaint', 
              report?.clinicalHistory?.chiefComplaint?.primaryComplaint || ''
            )}
            
            <div className="mt-4">
              <h4 className="font-semibold text-gray-700 mb-2">History of Present Illness</h4>
              <p className="text-gray-900 bg-gray-50 p-3 rounded text-sm">
                {report?.clinicalHistory?.historyOfPresentIllness?.patientNarrative || 'Not reported'}
              </p>
            </div>
          </Card>

          <Card className="p-6 shadow-sm">
            <h3 className="text-lg font-bold border-b pb-2 mb-4">Past Medical History</h3>
            {report?.clinicalHistory?.pastMedicalHistory?.length ? (
              <ul className="list-disc pl-5 space-y-2">
                {report.clinicalHistory.pastMedicalHistory.map((item: Record<string, unknown>, idx: number) => (
                  <li key={idx} className="text-gray-900">
                    <span className="font-medium">{String(item.conditionName)}</span>
                    <span className="text-xs text-gray-500 ml-2 bg-gray-100 px-2 py-0.5 rounded-full">
                      Source: {(item.provenance as any)?.source === 'abdm' ? '🏥 ABDM' : (item.provenance as any)?.source === 'patient_voice' ? '🗣 Patient reported' : '📄 Document'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-lg flex items-center gap-3 text-blue-900">
                <Info className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">No Prior Medical History Found</p>
                  <p className="text-xs text-blue-700">First Visit Intake — No prior chronic conditions or hospitalizations recorded for this patient.</p>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6 shadow-sm">
            <h3 className="text-lg font-bold border-b pb-2 mb-4">Medications</h3>
            {report?.clinicalHistory?.medications?.length ? (
              <ul className="space-y-3">
                {report?.clinicalHistory?.medications?.map((med: any, idx: number) => (
                  <li key={idx} className="bg-gray-50 p-3 rounded border border-gray-100">
                    <div className="font-medium text-gray-900">{String(med.medicationName)}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {String(med.dose)} {String(med.frequency)}
                    </div>
                    <div className="text-xs text-gray-500 mt-2 flex gap-2">
                      <span className="bg-white px-2 py-1 rounded border">
                        Source: {(med.provenance as any)?.source === 'abdm' ? '🏥 ABDM' : (med.provenance as any)?.source === 'patient_voice' ? '🗣 Patient reported' : '📄 Document'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No regular medications reported.</p>
            )}
          </Card>

          <Card className="p-6 shadow-sm">
            <h3 className="text-lg font-bold border-b pb-2 mb-4">Allergies</h3>
            {report?.clinicalHistory?.allergies?.length ? (
              <ul className="list-disc pl-5 space-y-2">
                {report?.clinicalHistory?.allergies?.map((alg: any, idx: number) => (
                  <li key={idx} className="text-gray-900">
                    <span className="font-medium">{String(alg.allergen)}</span> ({String(alg.reaction)})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No known allergies reported.</p>
            )}
          </Card>

          {report?.ayush && Object.keys(report.ayush).length > 0 && (
            <Card className="p-6 shadow-sm border-green-200">
              <h3 className="text-lg font-bold border-b pb-2 mb-4 text-green-800">AYUSH Information</h3>
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-4">Patient reported — Requires practitioner assessment</p>
              
              <div className="space-y-4">
                {report.ayush.prakriti && renderEditableSection('Prakriti', 'ayush.prakriti', report.ayush.prakriti)}
                {report.ayush.agni && renderEditableSection('Agni / Digestion', 'ayush.agni', report.ayush.agni)}
                {report.ayush.koshtha && renderEditableSection('Koshtha / Bowel', 'ayush.koshtha', report.ayush.koshtha)}
              </div>
            </Card>
          )}

          <Card className="p-6 shadow-sm bg-gray-50 border-dashed border-2">
            <h3 className="text-lg font-bold border-b pb-2 mb-4">External Sources Used</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">📄</span>
                {documents?.length ? `✓ ${documents.length} document(s) uploaded and processed` : 'No documents uploaded'}
              </li>
              <li className="flex items-center">
                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-3">🏥</span>
                {timeline?.events?.some((e: any) => (e.provenance as any)?.source === 'abdm') ? '✓ Relevant historical information found via ABDM' : 'No relevant ABDM history found for this complaint.'}
              </li>
            </ul>
          </Card>
        </div>

        <div className="mt-12 bg-white p-6 rounded-xl border-2 border-primary/20 shadow-md sticky bottom-4 z-10">
          <div className="flex items-start mb-4">
            <Checkbox 
              id="confirm-cb" 
              checked={confirmed} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmed(e.target.checked)} 
              className="mt-1 w-5 h-5"
            />
            <label htmlFor="confirm-cb" className="ml-3 text-sm font-medium text-gray-900 cursor-pointer">
              I have reviewed the information above and confirm that it accurately represents the information I provided for this visit.
            </label>
          </div>

          <Button 
            className="w-full text-xl py-6 bg-primary hover:bg-primary/90 text-white font-bold flex items-center justify-center gap-3 shadow-lg rounded-xl" 
            disabled={!confirmed || submitting} 
            onClick={handleConfirm}
          >
            {submitting ? (
              <>
                <Spinner className="w-6 h-6 text-white mr-2" />
                <span>Sending to Doctor&apos;s Dashboard...</span>
              </>
            ) : (
              <>
                <Send className="w-6 h-6" />
                <span>Send to Doctor</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </KioskLayout>
  );
}

export default function PatientReviewPage() {
  return (
    <React.Suspense 
      fallback={
        <KioskLayout activeStepIndex={3}>
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Spinner className="w-12 h-12 text-primary mb-4" />
            <h2 className="text-xl font-medium">Loading session...</h2>
          </div>
        </KioskLayout>
      }
    >
      <PatientReviewContent />
    </React.Suspense>
  );
}
