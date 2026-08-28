'use client';

import * as React from 'react';
import type { ProgressResult } from '../../lib/conversation/progress';

export interface ConversationProgressProps {
  progress: ProgressResult;
}

const SECTION_LABELS: Record<string, string> = {
  chief_complaint: 'Reason for Visit',
  hpi: 'History of Present Illness',
  past_medical_history: 'Medical History',
  past_surgical_history: 'Surgical History',
  medications: 'Medications',
  allergies: 'Allergies',
  family_history: 'Family History',
  personal_history: 'Personal History',
  social_history: 'Social History',
  review_of_systems: 'Review of Systems',
  documents: 'Documents',
  ayush: 'AYUSH Assessment',
};

export const ConversationProgress: React.FC<ConversationProgressProps> = ({ progress }) => {
  const sectionLabel = progress.currentSection
    ? SECTION_LABELS[progress.currentSection] || 'Questionnaire'
    : 'Questionnaire';

  return (
    <div className="w-full mb-8">
      <div className="flex justify-between items-end mb-2">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
          {sectionLabel}
        </h3>
        <span className="text-sm font-semibold text-text-muted">
          {progress.completedQuestions} / {progress.totalQuestions}
        </span>
      </div>
      <div className="w-full h-3 bg-surface-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${progress.percentage}%` }}
          role="progressbar"
          aria-valuenow={progress.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};
