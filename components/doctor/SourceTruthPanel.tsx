'use client';

import * as React from 'react';
import { FusedClinicalRecord, RelevantFusedRecord, DataProvenance } from '../../types';
import { AlertTriangle, Info } from 'lucide-react';
import { Alert } from '../ui/alert';

interface SourceTruthPanelProps {
  record: FusedClinicalRecord | RelevantFusedRecord;
  onClose: () => void;
  sessionId?: string;
}

export function SourceTruthPanel({ record, sessionId }: SourceTruthPanelProps) {
  const hasConflicts = record.conflicts && record.conflicts.length > 0;
  
  // Optional: We can ping an API to log an audit event when the panel is opened
  React.useEffect(() => {
    if (sessionId) {
      // Fire-and-forget audit log
      fetch('/api/kiosk/interview/answers', { // or some audit API
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId, 
          action: hasConflicts ? 'source_truth_conflict_viewed' : 'source_truth_viewed',
          factId: record.id
        })
      }).catch(() => {}); // ignore errors silently
    }
  }, [sessionId, record.id, hasConflicts]);

  const getSourceBadge = (source: string) => {
    let color = 'bg-gray-100 text-gray-700 border-gray-200';
    let label = source;
    let icon = '';
    
    if (source === 'patient_voice' || source === 'patient_touch' || source === 'patient_text') {
      color = 'bg-blue-100 text-blue-800 border-blue-200';
      label = 'Patient Interview';
      icon = '🗣️ ';
    } else if (source === 'abdm') {
      color = 'bg-green-100 text-green-800 border-green-200';
      label = 'ABDM Record';
      icon = '🏥 ';
    } else if (source === 'ocr' || source === 'uploaded_document') {
      color = 'bg-purple-100 text-purple-800 border-purple-200';
      label = 'Document';
      icon = '📄 ';
    }

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
        {icon}{label}
      </span>
    );
  };

  const renderProvenanceDetail = (prov: DataProvenance, idx: number) => {
    const isInterview = prov.source.startsWith('patient_');
    const isAbdm = prov.source === 'abdm';
    const isDocument = prov.source === 'ocr' || prov.source === 'uploaded_document';

    let title = prov.source.toUpperCase();
    let icon = 'ℹ️';

    if (isInterview) {
      title = 'PATIENT INTERVIEW';
      icon = '🗣️';
    } else if (isAbdm) {
      title = 'ABDM';
      icon = '🏥';
    } else if (isDocument) {
      title = 'DOCUMENT';
      icon = '📄';
    }

    return (
      <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden mb-4 last:mb-0">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <span className="font-bold text-gray-700 text-sm flex items-center gap-2">
            <span>{icon}</span> {title}
          </span>
          {prov.extractedAt && (
            <span className="text-xs text-gray-500 font-mono">Date: {new Date(prov.extractedAt).toLocaleDateString()}</span>
          )}
        </div>
        <div className="p-4 flex flex-col gap-3 text-sm">
          {/* Interview Details */}
          {isInterview && (
            <>
              {prov.conversationMessageId && (
                <div>
                  <span className="text-gray-500 font-semibold block mb-1">Message ID:</span>
                  <span className="font-mono text-gray-800 text-xs bg-white px-2 py-1 rounded border border-gray-200">{prov.conversationMessageId}</span>
                </div>
              )}
              {prov.sourceId && (
                <div>
                  <span className="text-gray-500 font-semibold block mb-1">Question ID:</span>
                  <span className="font-mono text-gray-800 text-xs bg-white px-2 py-1 rounded border border-gray-200">{prov.sourceId}</span>
                </div>
              )}
              {record.originalValues && record.originalValues.length > 0 && (
                <div>
                  <span className="text-gray-500 font-semibold block mb-1">Patient Answer (Extracted):</span>
                  <p className="italic text-gray-700 bg-white p-3 rounded border border-gray-200 shadow-sm leading-relaxed">
                    &quot;{record.originalValues[0]}&quot;
                  </p>
                </div>
              )}
            </>
          )}

          {/* Document Details */}
          {isDocument && (
            <>
              {prov.documentId && (
                <div>
                  <span className="text-gray-500 font-semibold block mb-1">Document ID:</span>
                  <span className="font-mono text-gray-800 text-xs bg-white px-2 py-1 rounded border border-gray-200">{prov.documentId}</span>
                </div>
              )}
              {record.originalValues && record.originalValues.length > 0 && (
                <div>
                  <span className="text-gray-500 font-semibold block mb-1">Extracted Text:</span>
                  <p className="font-mono text-gray-700 bg-white p-3 rounded border border-gray-200 text-xs whitespace-pre-wrap">
                    {record.originalValues[0]}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ABDM Details */}
          {isAbdm && (
            <>
              {prov.sourceId && (
                <div>
                  <span className="text-gray-500 font-semibold block mb-1">Record ID:</span>
                  <span className="font-mono text-gray-800 text-xs bg-white px-2 py-1 rounded border border-gray-200">{prov.sourceId}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500 font-semibold block mb-1">Record Data:</span>
                <p className="text-gray-700 bg-white p-3 rounded border border-gray-200">
                  {record.clinicalFact} ({record.category})
                </p>
              </div>
            </>
          )}

          {/* Fallback for other sources */}
          {!isInterview && !isDocument && !isAbdm && (
             <div>
               <span className="text-gray-500 font-semibold block mb-1">Source Information:</span>
               <p className="text-gray-700 bg-white p-3 rounded border border-gray-200">
                 {record.originalValues && record.originalValues.length > 0 ? record.originalValues[0] : record.clinicalFact}
               </p>
             </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
        
        {/* Fact Summary */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-bold text-gray-900 capitalize">{record.clinicalFact}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {record.provenances.map((p, i) => (
              <div key={i}>{getSourceBadge(p.source)}</div>
            ))}
          </div>
          <p className="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md inline-block self-start">
            {record.provenances.length} supporting source{record.provenances.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* Conflicts Alert */}
        {hasConflicts && (
          <Alert variant="error" title="CONFLICTING INFORMATION" className="bg-red-50 border-red-200 text-red-800">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div className="ml-2">
              <h4 className="font-bold">CONFLICTING INFORMATION</h4>
              <p className="text-sm mt-1">Physician review required.</p>
              <div className="mt-2 flex flex-col gap-2">
                {record.conflicts!.map((c, idx) => (
                  <div key={idx} className="text-xs bg-red-100 p-2 rounded flex flex-col gap-1 border border-red-200">
                    <span className="font-bold">Conflict with {c.provenance.source}:</span>
                    <span className="font-mono">Value: &quot;{c.conflictingValue}&quot;</span>
                  </div>
                ))}
              </div>
            </div>
          </Alert>
        )}

        {/* Evidence List */}
        <div className="flex flex-col">
          {record.provenances.length === 0 ? (
            <Alert variant="warning" title="Source unavailable">
              <Info className="h-5 w-5" />
              <div className="ml-2">
                <h4 className="font-bold">Source unavailable</h4>
                <p className="text-sm">This information cannot currently be traced to an original source.</p>
              </div>
            </Alert>
          ) : (
            record.provenances.map((prov, idx) => renderProvenanceDetail(prov, idx))
          )}
        </div>

      </div>
    </div>
  );
}
