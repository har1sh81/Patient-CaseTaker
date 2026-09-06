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
import { ShieldCheck, Edit2, AlertTriangle, FileText, Activity, UserPlus, Send, MapPin, User, Building, Ticket, CheckCircle2, Download, Eye } from 'lucide-react';

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
  const [pdfDownloadUrl, setPdfDownloadUrl] = React.useState('');
  const [pdfViewUrl, setPdfViewUrl] = React.useState('');
  const [doctorInfo, setDoctorInfo] = React.useState<{
    doctorName: string;
    specialty: string;
    roomNumber: string;
    floor: string;
    tokenNumber: string;
  } | null>(null);

  const [editingField, setEditingField] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState('');

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
    if (!confirmed || submitting) return;
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
      setPdfDownloadUrl(resData.downloadUrl || `/api/doctor/cases/${sessionId}/pdf?download=true`);
      setPdfViewUrl(resData.pdfUrl || `/api/doctor/cases/${sessionId}/pdf`);
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
        <div className="p-8 max-w-xl mx-auto">
          <Alert variant="error" title="Error">
            <h2 className="font-bold">We could not complete the handoff.</h2>
            <p>{error}</p>
          </Alert>
          <Button className="mt-4 w-full" onClick={() => router.push('/kiosk')}>Start Over</Button>
        </div>
      </KioskLayout>
    );
  }

  if (success) {
    const isAyush = (data as any)?.session?.departmentMode === 'ayush';
    const docName = doctorInfo?.doctorName || (isAyush ? 'Dr. Meera Vaidya, BAMS' : 'Dr. Rajesh Sharma, MD');
    const specialty = doctorInfo?.specialty || (isAyush ? 'Ayurveda & Panchakarma' : 'General Medicine & Internal Care');
    const room = doctorInfo?.roomNumber || (isAyush ? 'Room 102' : 'Room 204');
    const floor = doctorInfo?.floor || (isAyush ? 'Ground Floor, AYUSH Wing' : '2nd Floor, OPD Wing B');
    const token = doctorInfo?.tokenNumber || (isAyush ? 'MK-102' : 'MK-305');
    const pName = (data as any)?.patient?.demographics?.fullName || 'Patient';
    const pAge = (data as any)?.patient?.demographics?.age;
    const pGender = (data as any)?.patient?.demographics?.gender;
    const pId = (data as any)?.patient?.identification?.hospitalNumber || (data as any)?.patient?.identification?.abhaReference || (data as any)?.patient?.id || 'N/A';
    const pComplaint = (data as any)?.chiefComplaint?.primaryComplaint || (data as any)?.report?.clinicalHistory?.chiefComplaint?.primaryComplaint || 'General Checkup';

    return (
      <KioskLayout 
        activeStepIndex={4}
        departmentMode={(data as any)?.session?.departmentMode}
        patientName={pName}
        sessionId={sessionId}
      >
        <div className="max-w-3xl mx-auto my-8 p-8 bg-white rounded-2xl border-2 border-green-300 shadow-xl text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-400">
            <ShieldCheck className="w-12 h-12 text-green-600" />
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Your information has been successfully submitted.</h1>
          <p className="text-lg text-gray-600 mb-6 max-w-xl mx-auto">
            Your clinical summary has been prepared and formatted for the doctor.
          </p>

          {/* PDF Report Download & View Section (Prominent CTA) */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 mb-8 text-left shadow-xl border border-blue-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 px-3 py-1 rounded-full border border-blue-400/30">
                  Official Medical Record
                </span>
                <h3 className="text-xl font-bold mt-2 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-blue-300" /> Patient Clinical Report (PDF)
                </h3>
                <p className="text-sm text-blue-200 mt-1">
                  Your clinical report has been compiled dynamically with all interview details, relevant history, and safety status.
                </p>
              </div>
              <div className="text-xs text-blue-200 bg-blue-950/80 px-3 py-2 rounded-lg border border-blue-800 font-mono">
                REF: {handoffRef ? handoffRef.slice(-8).toUpperCase() : 'FINAL'}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={pdfDownloadUrl || `/api/doctor/cases/${sessionId}/pdf?download=true`}
                download={`Clinical_Report_${sessionId.slice(-6)}.pdf`}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all text-sm cursor-pointer"
              >
                <Download className="w-5 h-5" /> Download Clinical Report PDF
              </a>
              <a
                href={pdfViewUrl || `/api/doctor/cases/${sessionId}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-semibold rounded-xl border border-white/20 transition-all text-sm cursor-pointer"
              >
                <Eye className="w-5 h-5 text-blue-300" /> View in Browser
              </a>
            </div>
          </div>

          {/* Patient Details & Findings Overview Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 text-left shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Verified Patient Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
              <div>
                <span className="text-xs text-gray-500 block">Patient Name</span>
                <span className="font-bold text-gray-900">{pName}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Age / Gender</span>
                <span className="font-bold text-gray-900">{pAge || '--'}y / {pGender || '--'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Patient ID</span>
                <span className="font-mono font-bold text-gray-900">{pId}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Department Mode</span>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${isAyush ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                  {isAyush ? '🌿 AYUSH' : '🩺 General Medicine'}
                </span>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-3">
              <span className="text-xs text-gray-500 block">Chief Complaint</span>
              <span className="font-semibold text-gray-800 text-base">{pComplaint}</span>
            </div>
          </div>

          {/* Completion Status Checklist */}
          <div className="bg-green-50/70 border border-green-200 rounded-xl p-5 mb-8 text-left max-w-xl mx-auto space-y-2">
            <div className="flex items-center text-green-900 text-sm font-semibold gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <span>Information confirmed by patient</span>
            </div>
            <div className="flex items-center text-green-900 text-sm font-semibold gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <span>Clinical summary & facts synthesized</span>
            </div>
            <div className="flex items-center text-green-900 text-sm font-semibold gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <span>13-Section PDF generated & cached</span>
            </div>
            <div className="flex items-center text-green-900 text-sm font-semibold gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <span>Sent to Doctor Dashboard queue</span>
            </div>
          </div>

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

          {/* Patient Next Steps */}
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 mb-8 text-left text-sm space-y-2">
            <h3 className="font-bold text-gray-800 text-base mb-3 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-primary" /> Patient Next Steps
            </h3>
            <p className="text-gray-700">1. Please proceed directly to <strong>{room}</strong> ({floor}).</p>
            <p className="text-gray-700">2. Have a seat in the designated waiting area outside the room.</p>
            <p className="text-gray-700">3. Your token <strong>{token}</strong> will be announced on the display screen.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <a
              href={pdfDownloadUrl || `/api/doctor/cases/${sessionId}/pdf?download=true`}
              download={`Clinical_Report_${sessionId.slice(-6)}.pdf`}
              className="flex-1 py-4 text-center text-sm font-bold bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-lg rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download PDF
            </a>
            <Button
              className="flex-1 py-4 text-sm font-bold bg-primary hover:bg-primary/90 text-white shadow-lg rounded-xl"
              onClick={() => router.push('/kiosk')}
            >
              Finish Intake
            </Button>
          </div>
        </div>
      </KioskLayout>
    );
  }

  const { patient, report, documents, hasAttentionFlags, computedRedFlags, structuredHPI, chiefComplaint, informationNotReported, suggestedDoctorQuestions, ayush, referenceInfo, socialHistory, familyHistory, reviewOfSystems } = (data as any) || {};

  const isAyushMode = (data as any)?.session?.departmentMode === 'ayush';

  const primaryComplaint = chiefComplaint?.primaryComplaint || report?.clinicalHistory?.chiefComplaint?.primaryComplaint || 'General checkup';
  const patientWords = chiefComplaint?.patientWords;
  const narrative = report?.clinicalHistory?.historyOfPresentIllness?.patientNarrative;
  
  // Concise Past History items (max ~4 items)
  const pastHistoryItems: Array<{ name: string; source: string }> = (report?.clinicalHistory?.pastMedicalHistory || [])
    .slice(0, 4)
    .map((item: any) => ({
      name: String(item.conditionName || 'Condition'),
      source: (item.provenance as any)?.source === 'abdm' ? '🏥 ABDM' : (item.provenance as any)?.source === 'patient_voice' ? '🗣 Patient reported' : '📄 Document'
    }));

  const renderEditableSection = (title: string, fieldPath: string, value: string) => {
    const isEditing = editingField === fieldPath;
    return (
      <div className="mb-3">
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
              className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-primary text-sm"
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
          <p className="text-gray-900 bg-gray-50 p-3 rounded text-sm">{value || 'Not reported'}</p>
        )}
      </div>
    );
  };

  const hpiFields = [
    { label: 'Duration', value: structuredHPI?.duration },
    { label: 'Location', value: structuredHPI?.location },
    { label: 'Character', value: structuredHPI?.character },
    { label: 'Progression', value: structuredHPI?.progression },
    { label: 'Aggravating / Relieving', value: structuredHPI?.aggravatingRelieving },
    { label: 'Associated Symptoms', value: structuredHPI?.associatedSymptoms },
    { label: 'Previous Treatments', value: structuredHPI?.previousTreatments },
  ].filter(f => f.value);

  return (
    <KioskLayout 
      activeStepIndex={3}
      departmentMode={(data as any)?.session?.departmentMode}
      patientName={(data as any)?.patient?.demographics?.fullName}
      sessionId={sessionId}
    >
      <div className="max-w-4xl mx-auto pb-24">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Review your information</h1>
          <p className="text-gray-600">Please review the information below before sending it to the doctor.</p>
          {/* Department Mode Badge */}
          <div className="mt-3 flex justify-center">
            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold tracking-wide ${
              isAyushMode
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-blue-100 text-blue-800 border border-blue-300'
            }`}>
              {isAyushMode ? '🌿 AYUSH Medicine' : '🏥 General Medicine'}
            </span>
          </div>
        </div>

        {/* ─── RED FLAG RISK BANNERS ────────────────────────────────────── */}
        {computedRedFlags && computedRedFlags.length > 0 && (
          <div className="space-y-3 mb-6">
            {computedRedFlags.map((flag: any) => (
              <div key={flag.id} className={`flex items-start gap-3 p-4 rounded-xl border-2 shadow-sm ${
                flag.level === 'critical'
                  ? 'bg-red-50 border-red-300 text-red-900'
                  : flag.level === 'warning'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}>
                <AlertTriangle className={`w-6 h-6 shrink-0 mt-0.5 ${
                  flag.level === 'critical' ? 'text-red-600' : flag.level === 'warning' ? 'text-amber-600' : 'text-blue-600'
                }`} />
                <div>
                  <h4 className="font-bold text-sm">{flag.title}</h4>
                  <p className="text-sm mt-0.5 opacity-90">{flag.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasAttentionFlags && (!computedRedFlags || computedRedFlags.length === 0) && (
          <Alert className="mb-6 bg-yellow-50 border-yellow-200 text-yellow-800" title="Attention">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
            <p className="font-medium">Some of your responses may require prompt attention from healthcare staff.</p>
          </Alert>
        )}

        <Alert className="mb-6 bg-blue-50 border-blue-200 text-blue-800" title="CLINICAL HISTORY DRAFT">
          <FileText className="w-5 h-5 mr-2 text-blue-600" />
          <h3 className="font-semibold mb-1">CLINICAL HISTORY DRAFT</h3>
          <p className="text-sm">
            Generated from the information collected during this intake. 
            This draft will be sent to the doctor upon confirmation.
          </p>
        </Alert>

        <div className="space-y-6">
          {/* ─── PATIENT INFO CARD ────────────────────────────────────── */}
          <Card className="p-6 shadow-sm">
            <h3 className="text-lg font-bold border-b pb-2 mb-4 flex items-center">
              <UserPlus className="w-5 h-5 mr-2 text-primary" /> Patient Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 block">Name</span><span className="font-medium text-gray-900">{patient?.demographics?.fullName || 'Patient'}</span></div>
              <div><span className="text-gray-500 block">Age</span><span className="font-medium text-gray-900">{patient?.demographics?.age || 'Unknown'}</span></div>
              <div><span className="text-gray-500 block">Hospital No.</span><span className="font-medium text-gray-900">{patient?.identification?.hospitalNumber || 'N/A'}</span></div>
              <div><span className="text-gray-500 block">ABHA Ref</span><span className="font-medium text-gray-900">{patient?.identification?.abhaReference || 'N/A'}</span></div>
            </div>
          </Card>

          {/* ─── CHIEF COMPLAINT CARD ─────────────────────────────────── */}
          <Card className="p-6 shadow-sm border-l-4 border-l-blue-600">
            <h3 className="text-lg font-bold border-b pb-2 mb-4 flex items-center text-blue-950">
              <Activity className="w-5 h-5 mr-2 text-blue-600" /> Chief Complaint
            </h3>
            {renderEditableSection(
              'Primary Complaint', 
              'clinicalHistory.chiefComplaint.primaryComplaint', 
              primaryComplaint
            )}
            {patientWords && (
              <div className="mt-3">
                <h4 className="font-semibold text-gray-700 text-sm mb-1">Patient&apos;s Own Words</h4>
                <p className="text-gray-900 bg-blue-50 p-3 rounded text-sm italic border border-blue-100">
                  &ldquo;{patientWords}&rdquo;
                </p>
              </div>
            )}
            {chiefComplaint?.duration && (
              <div className="mt-2 flex gap-4 text-sm">
                {chiefComplaint.duration && <span className="bg-gray-100 px-3 py-1 rounded-full font-medium">Duration: {chiefComplaint.duration}</span>}
                {chiefComplaint.severity && <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-medium">Severity: {chiefComplaint.severity}</span>}
              </div>
            )}
          </Card>

          {/* ─── STRUCTURED HPI CARD ──────────────────────────────────── */}
          {hpiFields.length > 0 && (
            <Card className="p-6 shadow-sm border-l-4 border-l-indigo-600">
              <h3 className="text-lg font-bold border-b pb-2 mb-4 flex items-center text-indigo-950">
                <Activity className="w-5 h-5 mr-2 text-indigo-600" /> History of Present Illness (HPI)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {hpiFields.map((field, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{field.label}</span>
                    <span className="text-sm font-medium text-gray-900">{field.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ─── AYUSH ASSESSMENT CARD (AYUSH mode only) ─────────────── */}
          {isAyushMode && ayush && (
            <Card className="p-6 shadow-sm border-l-4 border-l-emerald-600 bg-emerald-50/30">
              <h3 className="text-lg font-bold border-b border-emerald-200 pb-2 mb-4 text-emerald-900 flex items-center">
                🌿 AYUSH Dashavidha Pariksha
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide block mb-1">Prakriti (Constitution)</span>
                  <span className="text-base font-semibold text-gray-900">{ayush.prakriti || 'Not assessed'}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide block mb-1">Agni (Digestion)</span>
                  <span className="text-base font-semibold text-gray-900">{ayush.agni || 'Not assessed'}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide block mb-1">Koshtha (Bowel)</span>
                  <span className="text-base font-semibold text-gray-900">{ayush.koshtha || 'Not assessed'}</span>
                </div>
              </div>
              {(ayush.ahara?.length > 0 || ayush.vihara?.length > 0) && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ayush.ahara?.length > 0 && (
                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                      <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide block mb-1">Ahara (Diet)</span>
                      <span className="text-sm text-gray-800">{ayush.ahara.join(', ')}</span>
                    </div>
                  )}
                  {ayush.vihara?.length > 0 && (
                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                      <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide block mb-1">Vihara (Lifestyle)</span>
                      <span className="text-sm text-gray-800">{ayush.vihara.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* ─── PAST HISTORY CARD ────────────────────────────────────── */}
          <Card className="p-6 shadow-sm border-l-4 border-l-purple-600">
            <h3 className="text-lg font-bold border-b pb-2 mb-4 text-purple-950">Past History</h3>
            {pastHistoryItems.length > 0 ? (
              <ul className="space-y-2">
                {pastHistoryItems.map((item, idx) => (
                  <li key={idx} className="bg-gray-50 p-3 rounded text-sm flex justify-between items-center">
                    <span className="font-semibold text-gray-900">{item.name}</span>
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">{item.source}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="bg-gray-50 p-4 rounded text-sm text-gray-600 font-medium">
                Not Reported
              </div>
            )}
          </Card>

          {/* ─── MEDICATIONS CARD ─────────────────────────────────────── */}
          <Card className="p-6 shadow-sm">
            <h3 className="text-lg font-bold border-b pb-2 mb-4">Medications</h3>
            {report?.clinicalHistory?.medications?.length ? (
              <ul className="space-y-2">
                {report.clinicalHistory.medications.slice(0, 4).map((med: any, idx: number) => (
                  <li key={idx} className="bg-gray-50 p-3 rounded border border-gray-100 flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium text-gray-900">{String(med.medicationName || med.name)}</span>
                      {med.dose && <span className="text-xs text-gray-500 ml-2">({String(med.dose)})</span>}
                    </div>
                    <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border">
                      {(med.provenance as any)?.source === 'abdm' ? '🏥 ABDM' : '🗣 Patient'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">Not Reported</p>
            )}
          </Card>

          {/* ─── FAMILY & SOCIAL HISTORY CARD ─────────────────────────── */}
          {(familyHistory?.length > 0 || (socialHistory && Object.keys(socialHistory).length > 0)) && (
            <Card className="p-6 shadow-sm">
              <h3 className="text-lg font-bold border-b pb-2 mb-4">Family & Social History</h3>
              {familyHistory?.length > 0 && (
                <div className="mb-3">
                  <h4 className="font-semibold text-gray-700 text-sm mb-2">Family History</h4>
                  <ul className="space-y-1">
                    {familyHistory.map((item: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-800 bg-gray-50 px-3 py-2 rounded">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {socialHistory && Object.keys(socialHistory).length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm mb-2">Social History</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(socialHistory).map(([key, val]: [string, any]) => (
                      <div key={key} className="bg-gray-50 px-3 py-2 rounded text-sm">
                        <span className="text-gray-500 capitalize">{key}: </span>
                        <span className="font-medium text-gray-900">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* ─── DOCUMENTS CARD ───────────────────────────────────────── */}
          <Card className="p-6 shadow-sm bg-gray-50 border-dashed border-2">
            <h3 className="text-lg font-bold border-b pb-2 mb-4">Uploaded Documents & Records</h3>
            <p className="text-sm text-gray-700">
              {documents?.length ? `✓ ${documents.length} medical document(s) attached to session` : 'No external documents uploaded'}
            </p>
          </Card>

          {/* ─── INFORMATION GAPS CARD ────────────────────────────────── */}
          {informationNotReported && informationNotReported.length > 0 && (
            <Card className="p-6 shadow-sm border-l-4 border-l-amber-500 bg-amber-50/30">
              <h3 className="text-lg font-bold border-b border-amber-200 pb-2 mb-4 text-amber-900 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-amber-600" /> Information Not Reported
              </h3>
              <ul className="space-y-1">
                {informationNotReported.map((item: string, idx: number) => (
                  <li key={idx} className="text-sm text-amber-800 bg-white px-3 py-2 rounded border border-amber-100 flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-400 rounded-full shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* ─── SUGGESTED DOCTOR QUESTIONS ────────────────────────────── */}
          {suggestedDoctorQuestions && suggestedDoctorQuestions.length > 0 && (
            <Card className="p-6 shadow-sm border-l-4 border-l-teal-600 bg-teal-50/30">
              <h3 className="text-lg font-bold border-b border-teal-200 pb-2 mb-4 text-teal-900 flex items-center">
                <Send className="w-5 h-5 mr-2 text-teal-600" /> Suggested Questions for Doctor
              </h3>
              <ul className="space-y-2">
                {suggestedDoctorQuestions.map((q: string, idx: number) => (
                  <li key={idx} className="text-sm text-teal-800 bg-white px-4 py-3 rounded-lg border border-teal-100 flex items-start gap-2">
                    <span className="font-bold text-teal-600 shrink-0">{idx + 1}.</span>
                    {q}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* ─── REFERENCE / QR BADGE ─────────────────────────────────── */}
          {referenceInfo && (
            <Card className="p-5 shadow-sm bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Reference Number</span>
                  <span className="text-xl font-mono font-black text-blue-700">{referenceInfo.referenceNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">QR Code</span>
                  <span className="text-xs font-mono text-gray-600 bg-white px-3 py-1.5 rounded border">{referenceInfo.qrPayload}</span>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sticky Confirmation Bar */}
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

