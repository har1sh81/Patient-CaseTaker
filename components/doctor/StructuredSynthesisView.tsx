/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import * as React from 'react';
import {
  FileText,
  AlertTriangle,
  Activity,
  CheckCircle,
  Clock,
  ShieldAlert,
  HelpCircle,
  Info,
  Pill,
  Stethoscope,
  Scissors,
  Bookmark,
} from 'lucide-react';
import type { StructuredClinicalSynthesis, SynthesisSectionItem } from '@/lib/clinical/synthesis/types';

interface StructuredSynthesisViewProps {
  synthesis: StructuredClinicalSynthesis;
  patientName?: string;
}

export function StructuredSynthesisView({ synthesis, patientName }: StructuredSynthesisViewProps) {
  const [activeTab, setActiveTab] = React.useState<'all' | 'conflicts' | 'meds' | 'labs' | 'presentation'>('all');

  const {
    consultationContext,
    currentPresentation = [],
    relevantHistory = [],
    medications = [],
    vitals = [],
    laboratoryFindings = [],
    procedures = [],
    diagnoses = [],
    ayushContext = [],
    unresolvedConflicts = [],
    uncertainties = [],
    missingInformation = [],
    summaryText = '',
  } = synthesis || {};

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Structured Clinical Synthesis</h2>
            <p className="text-xs text-slate-300">
              Source-Grounded Evidence Synthesis • {patientName || 'Patient Record'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
            Version 1.0 (Deterministic)
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-6 flex gap-2 overflow-x-auto text-xs font-medium py-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'all'
              ? 'bg-indigo-600 text-white font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          All Sections
        </button>
        {unresolvedConflicts.length > 0 && (
          <button
            onClick={() => setActiveTab('conflicts')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'conflicts'
                ? 'bg-amber-600 text-white font-semibold'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Conflicts ({unresolvedConflicts.length})
          </button>
        )}
        <button
          onClick={() => setActiveTab('presentation')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'presentation'
              ? 'bg-indigo-600 text-white font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          Current Presentation ({currentPresentation.length})
        </button>
        <button
          onClick={() => setActiveTab('meds')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'meds'
              ? 'bg-indigo-600 text-white font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          Medications ({medications.length})
        </button>
        <button
          onClick={() => setActiveTab('labs')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'labs'
              ? 'bg-indigo-600 text-white font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          Labs & Vitals ({laboratoryFindings.length + vitals.length})
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Narrative Summary Box */}
        {summaryText && (
          <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Source-Grounded Narrative Summary
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {summaryText}
            </p>
          </div>
        )}

        {/* Section 10: Unresolved Conflicts Alert Box */}
        {(activeTab === 'all' || activeTab === 'conflicts') && unresolvedConflicts.length > 0 && (
          <div className="border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Clinical Conflicts Requiring Physician Review ({unresolvedConflicts.length})
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                Action Required
              </span>
            </div>
            <div className="grid gap-2.5">
              {unresolvedConflicts.map((conf) => (
                <div key={conf.id} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-amber-200 dark:border-amber-800/80 text-xs">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-amber-800 dark:text-amber-300 capitalize">{conf.conflictType.replace(/_/g, ' ')}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                      Severity: {conf.severity}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 mt-1">{conf.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 1: Consultation Context */}
        {activeTab === 'all' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Chief Complaint</span>
              <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{consultationContext.chiefComplaint || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Department</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{consultationContext.department || 'General Medicine'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Consultation Mode</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">{consultationContext.consultationMode || 'Standard'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Encounter ID</span>
              <span className="font-mono text-slate-600 dark:text-slate-400 truncate block">{consultationContext.encounterId || 'N/A'}</span>
            </div>
          </div>
        )}

        {/* Section 2: Current Presentation */}
        {(activeTab === 'all' || activeTab === 'presentation') && currentPresentation.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-500" /> Current Presentation & Symptoms ({currentPresentation.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentPresentation.map((item) => (
                <SynthesisCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Section 4: Current Medications */}
        {(activeTab === 'all' || activeTab === 'meds') && medications.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Pill className="w-4 h-4 text-emerald-500" /> Documented Medications ({medications.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {medications.map((item) => (
                <SynthesisCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Section 5 & 6: Vitals & Laboratory Findings */}
        {(activeTab === 'all' || activeTab === 'labs') && (vitals.length > 0 || laboratoryFindings.length > 0) && (
          <div className="space-y-4">
            {vitals.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-500" /> Recorded Vital Signs ({vitals.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {vitals.map((item) => (
                    <div key={item.id} className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-lg text-xs">
                      <span className="font-semibold text-slate-600 dark:text-slate-400 block">{item.title}</span>
                      <span className="text-base font-bold text-blue-900 dark:text-blue-200">{item.summary}</span>
                      <span className="text-[10px] text-slate-400 block mt-1">{item.eventDate || 'Recent'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {laboratoryFindings.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-500" /> Laboratory Findings ({laboratoryFindings.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {laboratoryFindings.map((item) => (
                    <SynthesisCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 7 & 8: Procedures & Diagnoses */}
        {activeTab === 'all' && (procedures.length > 0 || diagnoses.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {diagnoses.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-teal-500" /> Physician-Verified Diagnoses ({diagnoses.length})
                </h3>
                <div className="space-y-2">
                  {diagnoses.map((item) => (
                    <div key={item.id} className="p-3 bg-teal-50/40 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 rounded-lg text-xs flex justify-between items-center">
                      <div>
                        <span className="font-bold text-teal-900 dark:text-teal-200 block">{item.title}</span>
                        <span className="text-slate-500 text-[11px]">{item.summary}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 text-[10px] font-semibold capitalize">
                        {item.verificationStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {procedures.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Scissors className="w-4 h-4 text-cyan-500" /> Documented Procedures ({procedures.length})
                </h3>
                <div className="space-y-2">
                  {procedures.map((item) => (
                    <div key={item.id} className="p-3 bg-cyan-50/40 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/40 rounded-lg text-xs flex justify-between items-center">
                      <div>
                        <span className="font-bold text-cyan-900 dark:text-cyan-200 block">{item.title}</span>
                        <span className="text-slate-500 text-[11px]">{item.summary}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 text-[10px] font-semibold capitalize">
                        {item.status || 'documented'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 9: AYUSH Context */}
        {activeTab === 'all' && ayushContext.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Bookmark className="w-4 h-4 text-amber-500" /> AYUSH Clinical Context ({ayushContext.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ayushContext.map((item) => (
                <SynthesisCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Section 11 & 12: Uncertainties & Missing Info */}
        {activeTab === 'all' && (uncertainties.length > 0 || missingInformation.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {uncertainties.length > 0 && (
              <div className="p-4 bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40 rounded-xl space-y-2">
                <h4 className="text-xs font-bold uppercase text-orange-800 dark:text-orange-300 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-orange-500" /> Extraction / OCR Uncertainties
                </h4>
                <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
                  {uncertainties.map((u) => (
                    <li key={u.id}>
                      <span className="font-semibold">{u.title}:</span> {u.summary}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {missingInformation.length > 0 && (
              <div className="p-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-slate-400" /> Not Documented in Retrieved Records
                </h4>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                  {missingInformation.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SynthesisCard({ item }: { item: SynthesisSectionItem }) {
  return (
    <div
      className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-all ${
        item.conflictFlag
          ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
          : 'bg-slate-50/80 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex justify-between items-start gap-2">
        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
          {item.title}
          {item.conflictFlag && (
            <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[10px] font-bold">
              Conflict
            </span>
          )}
          {item.isNegated && (
            <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 text-[10px] font-bold">
              Negated
            </span>
          )}
        </span>
        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {item.eventDate || 'N/A'}
        </span>
      </div>

      <p className="text-slate-700 dark:text-slate-300 font-medium">{item.summary}</p>

      {item.referenceRange && (
        <span className="text-[10px] text-slate-500 block">Ref Range: {item.referenceRange}</span>
      )}

      {item.interpretation && (
        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 block uppercase">
          Interpretation: {item.interpretation}
        </span>
      )}

      <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
        <span className="capitalize">Source: {item.provenanceSource.replace(/_/g, ' ')}</span>
        <span className="capitalize font-semibold text-slate-500">{item.verificationStatus}</span>
      </div>
    </div>
  );
}
