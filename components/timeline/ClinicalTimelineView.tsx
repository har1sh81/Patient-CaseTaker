'use client';

import React, { useState, useMemo } from 'react';
import { TimelineEvent, TimelineEventType } from '@/lib/clinical/timeline/types';
import { Card } from '@/components/ui/card';

interface ClinicalTimelineViewProps {
  events: TimelineEvent[];
  patientId: string;
  loading?: boolean;
}

const EVENT_TYPE_COLORS: Record<TimelineEventType, { bg: string; text: string; border: string }> = {
  attention_flag: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
  encounter: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  diagnosis: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  procedure: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
  lab: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  medication: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
  symptom: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  vital: { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
  ayush_assessment: { bg: 'bg-lime-50', text: 'text-lime-800', border: 'border-lime-200' },
  document: { bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-200' },
  conversation: { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200' },
};

export function ClinicalTimelineView({ events, patientId, loading }: ClinicalTimelineViewProps) {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (selectedType !== 'all' && ev.eventType !== selectedType) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchTitle = ev.title.toLowerCase().includes(term);
        const matchSummary = ev.summary.toLowerCase().includes(term);
        if (!matchTitle && !matchSummary) return false;
      }
      return true;
    });
  }, [events, selectedType, searchTerm]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        Loading clinical timeline...
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-500">
        No clinical timeline events recorded for patient.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Patient Clinical Timeline</h3>
          <p className="text-xs text-slate-500">Chronological history of extracted evidence</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
          >
            <option value="all">All Types</option>
            <option value="encounter">Encounters</option>
            <option value="diagnosis">Diagnoses</option>
            <option value="procedure">Procedures</option>
            <option value="lab">Labs</option>
            <option value="medication">Medications</option>
            <option value="symptom">Symptoms</option>
            <option value="vital">Vitals</option>
            <option value="ayush_assessment">AYUSH</option>
            <option value="attention_flag">Attention Flags</option>
            <option value="document">Documents</option>
          </select>
        </div>
      </div>

      {/* Events Stream */}
      <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 ml-3">
        {filteredEvents.map((ev) => {
          const colors = EVENT_TYPE_COLORS[ev.eventType] || EVENT_TYPE_COLORS.document;
          const isVerified = ev.verificationStatus === 'verified';

          return (
            <div key={ev.id} className="relative group">
              {/* Timeline Marker Bullet */}
              <div
                className={`absolute -left-[31px] top-4 w-4 h-4 rounded-full border-2 border-white ${
                  ev.eventType === 'attention_flag' ? 'bg-red-500' : 'bg-blue-500'
                } shadow-sm`}
              />

              <Card className={`p-4 transition-all hover:shadow-md border ${colors.border}`}>
                <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Event Type Pill */}
                    <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-md uppercase tracking-wider ${colors.bg} ${colors.text}`}>
                      {ev.eventType.replace('_', ' ')}
                    </span>
                    {/* Verification Badge */}
                    <span
                      className={`px-2 py-0.5 text-[11px] font-medium rounded-md ${
                        isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isVerified ? 'Physician Verified' : 'Unverified'}
                    </span>
                    {/* Date Badge */}
                    <span className="text-xs font-medium text-slate-500">
                      {ev.eventDate ? ev.eventDate : 'Undated'}
                      {ev.eventDatePrecision && ev.eventDatePrecision !== 'day' ? ` (${ev.eventDatePrecision})` : ''}
                    </span>
                  </div>

                  {ev.sourceDocumentId && (
                    <span className="text-[11px] text-blue-600 font-medium hover:underline cursor-pointer">
                      View Source Doc
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-semibold text-slate-900 mb-1">{ev.title}</h4>
                <p className="text-xs text-slate-700 leading-relaxed">{ev.summary}</p>

                {ev.sourceText && (
                  <div className="mt-2 text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100">
                    &ldquo;{ev.sourceText}&rdquo;
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
