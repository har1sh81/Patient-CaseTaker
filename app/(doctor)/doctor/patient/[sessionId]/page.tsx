/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, FileText, CheckCircle, Search, Edit2, Save, Send, Activity, ShieldCheck, Check } from 'lucide-react';
import { Spinner } from '../../../../../components/ui/spinner';
import { Dialog } from '../../../../../components/ui/dialog';
import { SourceTruthPanel } from '../../../../../components/doctor/SourceTruthPanel';
import { Checkbox } from '../../../../../components/ui/checkbox';
import { Button } from '../../../../../components/ui/button';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default function DoctorPatientWorkspace({ params }: PageProps) {
  const router = useRouter();
  const { sessionId } = React.use(params);

  const [data, setData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [selectedRecord, setSelectedRecord] = React.useState<any>(null);
  const [isSourceTruthOpen, setIsSourceTruthOpen] = React.useState(false);

  // Edit State
  const [editMode, setEditMode] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState<string>('');
  
  // Verification State
  const [verifiedSections, setVerifiedSections] = React.useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [isFinalizing, setIsFinalizing] = React.useState(false);

  // Export State
  const [exportStatuses, setExportStatuses] = React.useState<any[]>([]);
  const [isExportingHospital, setIsExportingHospital] = React.useState(false);
  const [isExportingABDM, setIsExportingABDM] = React.useState(false);

  const fetchDetail = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/doctor/cases/${sessionId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch case detail');
      }
      const jsonData = await res.json();
      setData(jsonData);
      setError(null);
      
      // Fetch export statuses if finalized
      if (jsonData?.session?.status === 'finalized') {
        fetch(`/api/doctor/cases/${sessionId}/export/status`)
          .then(res => res.json())
          .then(data => {
            if (data.records) setExportStatuses(data.records);
          })
          .catch(console.error);
      }
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDetail();
    const interval = setInterval(fetchDetail, 30000);
    return () => clearInterval(interval);
  }, [fetchDetail]);

  const handleUpdateField = async (path: string, value: any) => {
    if (!data?.report) return;
    setIsSaving(true);
    
    // Construct nested update object based on path
    const parts = path.split('.');
    const updates = JSON.parse(JSON.stringify(data.report));
    let current = updates;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;

    try {
      const res = await fetch(`/api/doctor/cases/${sessionId}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Update failed');
      await fetchDetail();
      setEditMode(null);
    } catch (err) {
      alert('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!confirm('Are you sure you want to finalize this case? It will be removed from your queue.')) return;
    setIsFinalizing(true);
    try {
      const res = await fetch(`/api/doctor/cases/${sessionId}/finalize`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Finalize failed');
      router.push('/doctor');
    } catch (err) {
      alert('Failed to finalize session');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleExportHospital = async () => {
    setIsExportingHospital(true);
    try {
      const res = await fetch(`/api/doctor/cases/${sessionId}/export/hospital`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.failureReason || 'Hospital export failed');
      }
      alert('Hospital export successful (Mock)');
      fetchDetail();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsExportingHospital(false);
    }
  };

  const handleExportABDM = async () => {
    setIsExportingABDM(true);
    try {
      const res = await fetch(`/api/doctor/cases/${sessionId}/export/abdm`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.failureReason || 'ABDM export failed');
      }
      alert('ABDM export successful (Mock)');
      fetchDetail();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsExportingABDM(false);
    }
  };

  const toggleVerified = (section: string) => {
    setVerifiedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleResolveConflict = async (flagId: string, decision: string, updatePayload?: any) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/doctor/cases/${sessionId}/resolve-conflict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagId, decision, updatePayload })
      });
      if (!res.ok) throw new Error('Failed to resolve conflict');
      await fetchDetail(); // Refresh to hide resolved flag and show updated report
    } catch (err) {
      alert('Failed to resolve conflict');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50">
        <Spinner className="w-10 h-10 text-slate-400 mb-4" />
        <p className="text-slate-500">Loading patient workspace...</p>
      </div>
    );
  }

  if (error || data?.error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 text-red-600">
        <AlertTriangle className="w-12 h-12 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p>{error?.message || data?.error}</p>
        <button 
          onClick={() => router.push('/doctor')}
          className="mt-6 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800"
        >
          Return to Queue
        </button>
      </div>
    );
  }

  const { session, patient, report, flags, documents, timeline } = data;
  const activeFlags = flags?.filter((f: any) => f.status === 'active') || [];
  
  const openSourceTruth = (record: any) => {
    setSelectedRecord(record);
    setIsSourceTruthOpen(true);
  };

  const renderSourceTrigger = (record: any) => {
    if (!record || !record.provenance) return null;
    return (
      <button 
        onClick={() => openSourceTruth(record)}
        className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-slate-500 hover:text-blue-600 ml-2 bg-slate-100 hover:bg-blue-50 px-2 py-0.5 rounded transition-colors"
      >
        <Search className="w-3 h-3" /> View Source
      </button>
    );
  };

  const renderEditableText = (path: string, initialValue: string, label: string) => {
    const isEditing = editMode === path;
    const isVerified = verifiedSections[path];
    
    return (
      <div className={`p-4 rounded-lg border ${isVerified ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-slate-800">{label}</h3>
          <div className="flex items-center gap-3">
            {!isEditing && (
              <>
                <button onClick={() => { setEditMode(path); setEditValue(initialValue || ''); }} className="text-blue-600 text-sm flex items-center hover:underline">
                  <Edit2 className="w-3 h-3 mr-1" /> Edit
                </button>
                <label className="flex items-center text-sm text-slate-600 cursor-pointer">
                  <Checkbox checked={isVerified || false} onChange={() => toggleVerified(path)} className="mr-2" />
                  Verified
                </label>
              </>
            )}
          </div>
        </div>
        
        {isEditing ? (
          <div className="mt-2">
            <textarea 
              value={editValue} 
              onChange={e => setEditValue(e.target.value)} 
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500" 
              rows={3}
            />
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={() => handleUpdateField(path, editValue)} disabled={isSaving}>
                {isSaving ? 'Saving...' : <><Save className="w-4 h-4 mr-1" /> Save</>}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditMode(null)} disabled={isSaving}>Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="text-slate-900">{initialValue || 'Not reported'}</p>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden h-screen">
      {/* Top Header */}
      <div className="bg-slate-900 text-white p-4 shrink-0 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/doctor')} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{patient?.demographics?.fullName || 'Unknown Patient'}</h1>
          <span className="text-slate-300 bg-slate-800 px-3 py-1 rounded-full text-xs border border-slate-700">
            {patient?.demographics?.age || '--'}y • {patient?.demographics?.gender || '--'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => window.open(`/api/doctor/cases/${sessionId}/pdf`, '_blank')}
            className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700 flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Open PDF</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => window.open(`/api/doctor/cases/${sessionId}/pdf?download=true`, '_self')}
            className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700 flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-green-400" />
            <span>Download PDF</span>
          </Button>

          <Button onClick={handleFinalize} disabled={isFinalizing} className="bg-green-600 hover:bg-green-700 text-white">
            <CheckCircle className="w-4 h-4 mr-2" /> {isFinalizing ? 'Finalizing...' : 'Finalize Consultation'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Main Content */}
        <div className="flex-1 overflow-y-auto border-r border-slate-200 bg-slate-50 p-6 space-y-6">
          
          {/* Active Flags / Conflicts */}
          {activeFlags.length > 0 && (
            <div className="space-y-4">
              {activeFlags.map((f: any, idx: number) => {
                const isConflict = f.category === 'medication_attention' || f.category === 'document_attention';
                return (
                  <div key={idx} className={`p-4 border rounded-lg ${isConflict ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
                    <h3 className={`text-xs uppercase font-bold tracking-wider mb-2 flex items-center ${isConflict ? 'text-orange-800' : 'text-red-700'}`}>
                      <AlertTriangle className="w-4 h-4 mr-1" /> {isConflict ? 'Conflict Detected' : 'Attention Required'}
                    </h3>
                    <p className={`text-sm font-medium ${isConflict ? 'text-orange-900' : 'text-red-900'}`}>{f.message}</p>
                    
                    <div className="mt-4 flex flex-wrap gap-2 items-center">
                      {isConflict && f.evidence && f.evidence.map((ev: string, i: number) => (
                        <button 
                          key={i} 
                          onClick={() => handleResolveConflict(f.id, `Kept: ${ev}`)} 
                          className="px-3 py-1.5 bg-white border border-orange-300 rounded shadow-sm text-sm font-medium hover:bg-orange-100 text-orange-900 transition-colors"
                        >
                          Keep: {ev}
                        </button>
                      ))}
                      {isConflict && (
                        <button 
                          onClick={() => handleResolveConflict(f.id, 'Mark Unresolved')} 
                          className="px-3 py-1.5 bg-white border border-dashed border-slate-300 rounded shadow-sm text-sm hover:bg-slate-50 text-slate-600 transition-colors"
                        >
                          Mark Unresolved
                        </button>
                      )}
                      
                      {!isConflict && (
                         <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleResolveConflict(f.id, 'Acknowledged')}>
                           Acknowledge
                         </Button>
                      )}
                      
                      {renderSourceTrigger({ ...f, id: `flag_${idx}` })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-4">
            {renderEditableText(
              'clinicalHistory.chiefComplaint.primaryComplaint', 
              report?.clinicalHistory?.chiefComplaint?.primaryComplaint || '', 
              'Chief Complaint'
            )}
            
            {renderEditableText(
              'clinicalHistory.historyOfPresentIllness.patientNarrative', 
              report?.clinicalHistory?.historyOfPresentIllness?.patientNarrative || '', 
              'History of Present Illness (HPI)'
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div className={`p-4 rounded-lg border ${verifiedSections['medications'] ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-slate-800">Medications</h3>
                  <label className="flex items-center text-sm text-slate-600 cursor-pointer">
                    <Checkbox checked={verifiedSections['medications'] || false} onChange={() => toggleVerified('medications')} className="mr-2" />
                    Verified
                  </label>
                </div>
                {report?.clinicalHistory?.medications?.length ? (
                  <ul className="space-y-3">
                    {report.clinicalHistory.medications.map((med: any, idx: number) => (
                      <li key={idx} className="text-sm bg-slate-50 p-2 rounded border border-slate-100">
                        <div className="font-semibold text-slate-900 flex justify-between">
                          {med.medicationName} {renderSourceTrigger(med)}
                        </div>
                        <div className="text-slate-600 mt-1">{med.dose} {med.frequency}</div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-slate-500">None reported</p>}
             </div>
             
             <div className={`p-4 rounded-lg border ${verifiedSections['allergies'] ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-slate-800">Allergies</h3>
                  <label className="flex items-center text-sm text-slate-600 cursor-pointer">
                    <Checkbox checked={verifiedSections['allergies'] || false} onChange={() => toggleVerified('allergies')} className="mr-2" />
                    Verified
                  </label>
                </div>
                {report?.clinicalHistory?.allergies?.length ? (
                  <ul className="space-y-2">
                    {report.clinicalHistory.allergies.map((alg: any, idx: number) => (
                      <li key={idx} className="text-sm bg-slate-50 p-2 rounded border border-slate-100 flex justify-between">
                        <div>
                          <span className="font-semibold text-slate-900">{alg.allergen}</span>
                          <span className="text-slate-600 ml-1">({alg.reaction})</span>
                        </div>
                        {renderSourceTrigger(alg)}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-slate-500">None reported</p>}
             </div>
          </div>
          
          <div className={`p-4 rounded-lg border ${verifiedSections['pastMedicalHistory'] ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-800">Past Medical History</h3>
              <label className="flex items-center text-sm text-slate-600 cursor-pointer">
                <Checkbox checked={verifiedSections['pastMedicalHistory'] || false} onChange={() => toggleVerified('pastMedicalHistory')} className="mr-2" />
                Verified
              </label>
            </div>
            {report?.clinicalHistory?.pastMedicalHistory?.length ? (
              <ul className="space-y-2">
                {report.clinicalHistory.pastMedicalHistory.map((item: any, idx: number) => (
                  <li key={idx} className="text-sm flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100">
                    <span className="font-medium text-slate-900">{item.conditionName}</span>
                    {renderSourceTrigger(item)}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-500">None reported</p>}
          </div>

        </div>

        {/* RIGHT COLUMN: Sidebar (Documents, Status, ABDM) */}
        <div className="w-80 bg-white border-l border-slate-200 overflow-y-auto">
          <div className="p-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Evidence Sources</h3>
            
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-slate-500 mb-2">DOCUMENTS</h4>
              {documents?.length ? (
                <ul className="space-y-2">
                  {documents.map((doc: any, idx: number) => (
                    <li key={idx} className="bg-slate-50 border border-slate-200 p-2 rounded text-xs hover:bg-slate-100 cursor-pointer">
                      <FileText className="w-3 h-3 inline mr-1 text-blue-500" />
                      <span className="font-semibold text-slate-900 break-all">{doc.fileName}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-slate-400">None</p>}
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-500 mb-2">ABDM TIMELINE</h4>
              {timeline?.events?.length ? (
                <div className="space-y-3 border-l-2 border-slate-200 pl-3 ml-1">
                  {timeline.events.map((event: any, idx: number) => (
                    <div key={idx} className="relative">
                      <div className="absolute w-2 h-2 bg-slate-400 rounded-full -left-[17px] top-1"></div>
                      <div className="text-xs">
                        <span className="font-bold text-slate-500 block">{event.date || 'Past'}</span>
                        <span className="font-semibold text-slate-900 block leading-tight">{event.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-400">No records found</p>}
            </div>

            {session?.status === 'finalized' && (
              <div className="mt-8 border-t pt-6 border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center">
                  <Send className="w-4 h-4 mr-2 text-slate-600" /> Export Integration
                </h4>
                <div className="space-y-4">
                  
                  {/* Hospital Export */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-slate-800 flex items-center">
                        <Activity className="w-4 h-4 mr-1 text-blue-600" /> Hospital EMR
                      </span>
                      {exportStatuses.find(r => r.exportType === 'fhir_hospital' && r.status === 'sent') ? (
                        <span className="text-xs font-bold text-green-600 flex items-center bg-green-100 px-2 py-0.5 rounded">
                          <Check className="w-3 h-3 mr-1" /> Sent
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">Pending</span>
                      )}
                    </div>
                    {!exportStatuses.find(r => r.exportType === 'fhir_hospital' && r.status === 'sent') && (
                      <Button size="sm" className="w-full text-xs h-8 bg-blue-600 hover:bg-blue-700" onClick={handleExportHospital} disabled={isExportingHospital}>
                        {isExportingHospital ? 'Exporting...' : 'Export to Hospital (Stub)'}
                      </Button>
                    )}
                  </div>

                  {/* ABDM Export */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-slate-800 flex items-center">
                        <ShieldCheck className="w-4 h-4 mr-1 text-orange-600" /> ABDM Network
                      </span>
                      {exportStatuses.find(r => r.exportType === 'fhir_abdm' && r.status === 'sent') ? (
                        <span className="text-xs font-bold text-green-600 flex items-center bg-green-100 px-2 py-0.5 rounded">
                          <Check className="w-3 h-3 mr-1" /> Published
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">Pending</span>
                      )}
                    </div>
                    {!exportStatuses.find(r => r.exportType === 'fhir_abdm' && r.status === 'sent') && (
                      <Button size="sm" className="w-full text-xs h-8 bg-orange-600 hover:bg-orange-700" onClick={handleExportABDM} disabled={isExportingABDM}>
                        {isExportingABDM ? 'Publishing...' : 'Publish to ABDM (Mock)'}
                      </Button>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>

        <Dialog 
          isOpen={isSourceTruthOpen} 
          onClose={() => setIsSourceTruthOpen(false)}
          title="Evidence Source"
        >
          {selectedRecord && (
            <SourceTruthPanel 
              record={selectedRecord} 
              onClose={() => setIsSourceTruthOpen(false)} 
              sessionId={sessionId}
            />
          )}
        </Dialog>
      </div>
    </div>
  );
}
