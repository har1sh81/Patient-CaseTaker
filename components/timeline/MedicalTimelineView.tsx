'use client';

import * as React from 'react';
import { MedicalTimeline, FusedClinicalRecord } from '../../types';
import { Card } from '../ui/card';
import { Alert } from '../ui/alert';
import { Activity, Pill, AlertTriangle, Syringe, TestTube, FileText, Stethoscope } from 'lucide-react';

interface MedicalTimelineViewProps {
  timeline: MedicalTimeline;
}

export function MedicalTimelineView({ timeline }: MedicalTimelineViewProps) {
  const { records } = timeline;

  if (!records || records.length === 0) {
    return (
      <div className="p-8 text-center bg-surface/50 border border-border rounded-xl">
        <p className="text-text-secondary font-medium">No records found for timeline fusion.</p>
      </div>
    );
  }

  // Group by year/month or "unknown"
  const groupedRecords: Record<string, FusedClinicalRecord[]> = {};
  
  records.forEach((record: FusedClinicalRecord) => {
    let groupKey = 'Unknown Date';
    if (record.datePrecision === 'exact' && record.date) {
      // Show year and month
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

  // Sort group keys: Known dates descending, Unknown at the end
  const sortedKeys = Object.keys(groupedRecords).sort((a, b) => {
    if (a === 'Unknown Date') return 1;
    if (b === 'Unknown Date') return -1;
    // Basic descending sort for strings assuming they can be parsed or are years
    return new Date(b).getTime() - new Date(a).getTime();
  });

  return (
    <div className="w-full flex flex-col gap-8">
      {sortedKeys.map(key => (
        <div key={key} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-primary text-white font-bold py-1 px-4 rounded-full shadow-sm text-sm">
              {key}
            </div>
            <div className="h-px bg-border flex-1"></div>
          </div>
          
          <div className="flex flex-col gap-4 pl-4 border-l-2 border-primary/20 ml-6 py-2">
            {groupedRecords[key].map(record => (
              <TimelineRecordCard key={record.id} record={record} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineRecordCard({ record }: { record: FusedClinicalRecord }) {
  const getIcon = () => {
    switch (record.category) {
      case 'condition': return <Activity size={20} className="text-secondary" />;
      case 'medication': return <Pill size={20} className="text-primary" />;
      case 'procedure': return <Syringe size={20} className="text-orange-500" />;
      case 'laboratory': return <TestTube size={20} className="text-purple-500" />;
      case 'allergy': return <AlertTriangle size={20} className="text-red-500" />;
      case 'encounter': return <Stethoscope size={20} className="text-blue-500" />;
      default: return <FileText size={20} className="text-gray-500" />;
    }
  };

  const getSourceBadge = (source: string, idx: number) => {
    let color = 'bg-gray-100 text-gray-700 border-gray-200';
    let label = source;
    
    if (source === 'patient_voice' || source === 'patient_touch' || source === 'patient_text') {
      color = 'bg-blue-100 text-blue-700 border-blue-200';
      label = 'Interview';
    } else if (source === 'abdm') {
      color = 'bg-green-100 text-green-700 border-green-200';
      label = 'ABDM';
    } else if (source === 'ocr') {
      color = 'bg-purple-100 text-purple-700 border-purple-200';
      label = 'Document';
    }

    return (
      <span key={idx} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>
        {label}
      </span>
    );
  };

  // Deduplicate sources for display
  const uniqueSources = Array.from(new Set(record.provenances.map((p) => String(p.source))));

  return (
    <Card className={`p-4 relative overflow-hidden transition-all hover:shadow-md ${record.status === 'conflict' ? 'border-orange-300 bg-orange-50/30' : ''}`}>
      {record.status === 'conflict' && (
        <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
      )}
      
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-full bg-surface shadow-sm border border-border shrink-0 mt-1">
          {getIcon()}
        </div>
        
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                {record.category}
              </p>
              <h4 className="text-lg font-bold text-text-primary capitalize">{record.clinicalFact}</h4>
            </div>
            
            <div className="flex flex-wrap gap-1 justify-end">
              {uniqueSources.map((src, idx) => getSourceBadge(src, idx))}
            </div>
          </div>
          
          {record.originalValues.length > 1 && (
            <p className="text-sm text-text-secondary italic">
              Extracted as: {record.originalValues.map(v => String(v)).join(' • ')}
            </p>
          )}

          {record.status === 'conflict' && record.conflicts && (
            <div className="mt-2">
              <Alert variant="warning" title="Conflicting information found">
                <div className="text-sm mt-1">
                  <p>Physician review required. Conflicting records:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {record.conflicts.map((conf, idx: number) => (
                      <li key={idx}>
                        <span className="font-medium">{conf.conflictingValue}</span> 
                        <span className="text-gray-500 ml-1">
                          (Source: {conf.provenance.source})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Alert>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
