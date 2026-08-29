'use client';

import * as React from 'react';
import { ReconstructedHistory, RelevantFusedRecord } from '../../types';
import { Card } from '../ui/card';
import { Alert } from '../ui/alert';
import { Activity, Pill, AlertTriangle, Syringe, TestTube, FileText, Stethoscope, Search, Info } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { SourceTruthPanel } from '../doctor/SourceTruthPanel';

interface ComplaintHistoryViewProps {
  history: ReconstructedHistory;
}

export function ComplaintHistoryView({ history }: ComplaintHistoryViewProps) {
  const { records, currentComplaintContext, conflicts } = history;
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedRecord, setSelectedRecord] = React.useState<RelevantFusedRecord | null>(null);

  const filteredRecords = React.useMemo(() => {
    if (!searchTerm) return records;
    const lowerSearch = searchTerm.toLowerCase();
    return records.filter(r => 
      r.clinicalFact.toLowerCase().includes(lowerSearch) || 
      r.originalValues.some(v => v.toLowerCase().includes(lowerSearch))
    );
  }, [records, searchTerm]);

  const hasConflicts = conflicts && conflicts.length > 0;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* HEADER: Current Complaint */}
      <Card className="p-6 bg-blue-50/50 border-blue-200">
        <h2 className="text-xl font-bold text-blue-900 mb-2">CURRENT COMPLAINT</h2>
        <div className="flex flex-col gap-2">
          <p className="text-lg font-medium text-blue-800 capitalize">
            {currentComplaintContext?.complaint || 'No specific complaint recorded'}
          </p>
          {currentComplaintContext?.duration && (
            <p className="text-sm text-blue-700">Duration: {currentComplaintContext.duration}</p>
          )}
          {currentComplaintContext?.severity && (
            <p className="text-sm text-blue-700">Severity: {currentComplaintContext.severity}</p>
          )}
        </div>
      </Card>

      {/* CONFLICTS ALERT */}
      {hasConflicts && (
        <Alert variant="error" title="Conflicting Information" className="bg-red-50 border-red-200">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <div className="ml-2 flex flex-col">
            <h3 className="text-red-800 font-bold">CONFLICTING INFORMATION</h3>
            <p className="text-red-700 text-sm">
              {conflicts.length} conflict(s) found in relevant historical records. Physician review required.
            </p>
          </div>
        </Alert>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">RELEVANT PREVIOUS HISTORY</h3>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary w-64"
            />
          </div>
        </div>

        {/* DYNAMIC PRESENTATION */}
        {filteredRecords.length === 0 ? (
          <EmptyHistoryState />
        ) : filteredRecords.length === 1 ? (
          <SingleRecordView record={filteredRecords[0]} onSelect={setSelectedRecord} />
        ) : (
          <TimelineListView records={filteredRecords} isComplex={filteredRecords.length > 3} onSelect={setSelectedRecord} />
        )}
      </div>

      {/* CURRENT CONSULTATION MARKER */}
      <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-300 flex flex-col items-center">
        <div className="text-gray-400 text-2xl mb-2">▼</div>
        <Card className="p-4 bg-green-50 border-green-200 text-center w-full max-w-md">
          <h3 className="font-bold text-green-800">CURRENT CONSULTATION</h3>
          <p className="text-green-700 text-sm mt-1">Doctor Review Required</p>
        </Card>
      </div>
      <Dialog 
        isOpen={!!selectedRecord} 
        onClose={() => setSelectedRecord(null)}
        title="Evidence Traceability"
        description="Source Truth for this clinical fact"
      >
        {selectedRecord && (
          <div className="h-[60vh] max-h-[600px] overflow-y-auto">
            <SourceTruthPanel 
              record={selectedRecord} 
              onClose={() => setSelectedRecord(null)} 
              sessionId={history.sessionId}
            />
          </div>
        )}
      </Dialog>
    </div>
  );
}

function EmptyHistoryState() {
  return (
    <Card className="p-12 flex flex-col items-center justify-center text-center bg-gray-50 border-dashed">
      <Info className="h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">No relevant previous history found</h3>
      <p className="text-gray-500 max-w-sm text-sm">
        No previous records relevant to the current complaint were identified from the available patient information.
      </p>
    </Card>
  );
}

function SingleRecordView({ record, onSelect }: { record: RelevantFusedRecord, onSelect: (r: RelevantFusedRecord) => void }) {
  return (
    <div className="w-full">
      <TimelineRecordCard record={record} expanded onSelect={() => onSelect(record)} />
    </div>
  );
}

function TimelineListView({ records, isComplex, onSelect }: { records: RelevantFusedRecord[], isComplex: boolean, onSelect: (r: RelevantFusedRecord) => void }) {
  // Group by year/month or "unknown"
  const groupedRecords: Record<string, RelevantFusedRecord[]> = {};
  
  records.forEach((record) => {
    let groupKey = 'Unknown Date';
    if (record.datePrecision === 'exact' && record.date) {
      const d = new Date(record.date);
      groupKey = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
    } else if (record.datePrecision === 'month' && record.date) {
      const d = new Date(record.date + '-01');
      groupKey = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
    } else if (record.datePrecision === 'year' && record.date) {
      groupKey = record.date.substring(0, 4);
    }
    
    if (!groupedRecords[groupKey]) groupedRecords[groupKey] = [];
    groupedRecords[groupKey].push(record);
  });

  const sortedKeys = Object.keys(groupedRecords).sort((a, b) => {
    if (a === 'Unknown Date') return 1;
    if (b === 'Unknown Date') return -1;
    return new Date(b).getTime() - new Date(a).getTime();
  });

  return (
    <div className={`w-full flex flex-col gap-6 ${isComplex ? 'pl-2 border-l-2 border-blue-200' : ''}`}>
      {sortedKeys.map(key => (
        <div key={key} className="flex flex-col gap-3 relative">
          {isComplex && (
            <div className="absolute -left-[13px] top-2 h-4 w-4 rounded-full bg-blue-500 border-4 border-white" />
          )}
          <div className="flex items-center gap-4 pl-4">
            <span className="font-bold text-gray-700">{key}</span>
            <div className="h-px bg-border flex-1"></div>
          </div>
          
          <div className="flex flex-col gap-3 pl-4">
            {groupedRecords[key].map(record => (
              <TimelineRecordCard key={record.id} record={record} onSelect={() => onSelect(record)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineRecordCard({ record, expanded = false, onSelect }: { record: RelevantFusedRecord, expanded?: boolean, onSelect?: () => void }) {
  const [isExpanded, setIsExpanded] = React.useState(expanded);

  const getIcon = () => {
    switch (record.category) {
      case 'condition': return <Activity size={18} className="text-blue-500" />;
      case 'medication': return <Pill size={18} className="text-green-500" />;
      case 'procedure': return <Syringe size={18} className="text-orange-500" />;
      case 'laboratory': return <TestTube size={18} className="text-purple-500" />;
      case 'allergy': return <AlertTriangle size={18} className="text-red-500" />;
      case 'encounter': return <Stethoscope size={18} className="text-indigo-500" />;
      default: return <FileText size={18} className="text-gray-500" />;
    }
  };

  const getSourceBadge = (source: string) => {
    let color = 'bg-gray-100 text-gray-700 border-gray-200';
    let label = source;
    let icon = '';
    
    if (source === 'patient_voice' || source === 'patient_touch' || source === 'patient_text') {
      color = 'bg-blue-100 text-blue-800 border-blue-200';
      label = 'Interview';
      icon = '🗣️ ';
    } else if (source === 'abdm') {
      color = 'bg-green-100 text-green-800 border-green-200';
      label = 'ABDM';
      icon = '🏥 ';
    } else if (source === 'ocr') {
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

  return (
    <Card 
      className={`p-4 border border-border transition-all hover:border-gray-300 cursor-pointer ${isExpanded ? 'bg-surface shadow-sm' : 'bg-white'}`}
      onClick={() => {
        if (onSelect) {
          onSelect();
        } else {
          setIsExpanded(!isExpanded);
        }
      }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
              {getIcon()}
            </div>
            <div>
              <h4 className="font-bold text-gray-900 capitalize">{record.clinicalFact}</h4>
              <p className="text-xs text-gray-500 capitalize">{record.category}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          {record.provenances.map((p, i) => (
            <div key={i}>{getSourceBadge(p.source)}</div>
          ))}
          {record.relevance === 'direct' && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
              🎯 Direct Match
            </span>
          )}
        </div>

        {!onSelect && isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-4 text-sm">
            {record.provenances.map((prov, idx) => (
              <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <h5 className="font-bold text-gray-700 mb-2">Source: {prov.source.toUpperCase()}</h5>
                {prov.documentId && <p className="text-gray-600 mb-1"><span className="font-semibold">Document ID:</span> {prov.documentId}</p>}
                {prov.sourceId && <p className="text-gray-600 mb-1"><span className="font-semibold">Source ID:</span> {prov.sourceId}</p>}
                {prov.conversationMessageId && <p className="text-gray-600 mb-1"><span className="font-semibold">Message ID:</span> {prov.conversationMessageId}</p>}
                
                {record.originalValues && record.originalValues.length > 0 && (
                  <div className="mt-2">
                    <span className="font-semibold text-gray-600">Original information:</span>
                    <p className="italic text-gray-600 bg-white p-2 mt-1 rounded border border-gray-100">
                      &quot;{record.originalValues[0]}&quot;
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {onSelect && (
          <div className="mt-2 border-t border-gray-100 pt-2 flex justify-end">
            <button className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
              <Search className="h-3 w-3" />
              View Source Truth
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
