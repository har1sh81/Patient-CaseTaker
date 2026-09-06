'use client';

/**
 * Task #30 — AI Summary Draft View Doctor Component
 * MediKiosk Physician Portal
 * 
 * Displays the controlled AI-generated clinical summary draft,
 * explicit safety disclaimers, metadata provenance, and physician review controls.
 */

import React, { useState } from 'react';
import type { AiClinicalSummary, PhysicianNotesEditsData } from '@/lib/clinical/ai-summary/types';

interface AiSummaryDraftViewProps {
  patientId: string;
  encounterId?: string;
  summary: AiClinicalSummary;
  physicianReview?: PhysicianNotesEditsData;
  onReviewSubmit?: (action: 'accept' | 'edit', editedText?: string) => Promise<void>;
  loading?: boolean;
}

export const AiSummaryDraftView: React.FC<AiSummaryDraftViewProps> = ({
  patientId,
  encounterId,
  summary,
  physicianReview,
  onReviewSubmit,
  loading = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(physicianReview?.editedText || summary.summaryText);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!onReviewSubmit) return;
    setIsSubmitting(true);
    try {
      await onReviewSubmit('accept', summary.summaryText);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!onReviewSubmit) return;
    setIsSubmitting(true);
    try {
      await onReviewSubmit('edit', editedText);
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRejected = summary.safetyCheckStatus === 'rejected';
  const isWarning = summary.safetyCheckStatus === 'warning' || (summary.generationWarnings && summary.generationWarnings.length > 0);
  const isReviewed = Boolean(physicianReview?.status);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-slate-100 max-w-4xl mx-auto my-6">
      {/* Prominent Mandatory Safety Banner */}
      <div className="bg-amber-950/80 border-2 border-amber-500/80 text-amber-200 px-4 py-3 rounded-lg mb-6 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="font-bold text-lg tracking-wide uppercase">
              AI-Generated Draft — Physician Review Required
            </h3>
            <p className="text-xs text-amber-300/80">
              The physician remains the sole clinical decision-maker. This draft summarizes documented evidence and must be verified before clinical use.
            </p>
          </div>
        </div>
        <span className="bg-amber-500/20 text-amber-300 text-xs font-mono px-2.5 py-1 rounded border border-amber-400/40">
          Draft v{summary.promptVersion}
        </span>
      </div>

      {/* Warning/Rejected Alert */}
      {isRejected && (
        <div className="bg-red-950 border border-red-500/60 text-red-200 p-4 rounded-lg mb-4 text-sm">
          <strong>⚠️ Safety Validation Failed:</strong> {summary.generationWarnings.join('; ')}
        </div>
      )}

      {isWarning && !isRejected && (
        <div className="bg-amber-900/40 border border-amber-500/40 text-amber-200 p-3 rounded-lg mb-4 text-xs">
          <strong>⚠️ Safety Warnings:</strong> {summary.generationWarnings.join('; ')}
        </div>
      )}

      {/* Main Draft Summary Content */}
      <div className="space-y-4">
        {isReviewed && (
          <div className="bg-emerald-950/60 border border-emerald-500/50 p-3 rounded-lg flex items-center justify-between text-emerald-200 text-sm">
            <span>
              <strong>Physician Status:</strong> {physicianReview?.status === 'accepted' ? 'Accepted AI Draft' : 'Edited & Approved by Doctor'}
              {physicianReview?.reviewedAt && ` on ${new Date(physicianReview.reviewedAt).toLocaleString()}`}
            </span>
            <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
              Verified
            </span>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-300">
              Physician Edit Mode (Editing Doctor Note):
            </label>
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={8}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none font-sans leading-relaxed"
            />
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-md transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md transition shadow"
              >
                {isSubmitting ? 'Saving Edits...' : 'Save Physician Edits'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 font-sans leading-relaxed text-sm text-slate-200 whitespace-pre-wrap">
            {physicianReview?.editedText || summary.summaryText}
          </div>
        )}

        {/* Action Controls */}
        {!isEditing && !isRejected && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              disabled={isSubmitting || loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md transition border border-slate-700"
            >
              ✏️ Edit Draft
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={isSubmitting || loading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-md transition shadow"
            >
              {isSubmitting ? 'Accepting...' : '✅ Accept AI Draft'}
            </button>
          </div>
        )}
      </div>

      {/* Detailed Metadata Provenance Footer */}
      <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] font-mono text-slate-400 grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <span className="text-slate-500 block">Model Provider:</span>
          {summary.modelProvider} ({summary.modelName})
        </div>
        <div>
          <span className="text-slate-500 block">Prompt / Synthesis Ver:</span>
          Prompt v{summary.promptVersion} / Synth v{summary.sourceSynthesisVersion}
        </div>
        <div>
          <span className="text-slate-500 block">Generated At:</span>
          {new Date(summary.generatedAt).toLocaleTimeString()}
        </div>
        <div className="truncate">
          <span className="text-slate-500 block">Source Fingerprint:</span>
          <span title={summary.sourceFingerprint}>{summary.sourceFingerprint.substring(0, 16)}...</span>
        </div>
      </div>
    </div>
  );
};
