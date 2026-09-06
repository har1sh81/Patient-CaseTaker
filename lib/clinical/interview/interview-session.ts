/**
 * Task #9 — Interview Session Persistence Layer
 * MediKiosk Clinical Architecture
 * 
 * Manages database CRUD operations for public.interview_sessions.
 */

import { createAdminClient } from '@/lib/supabase/server';
import type { InterviewState } from './types';

export async function saveInterviewSession(state: InterviewState): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('interview_sessions').upsert({
      id: state.sessionId,
      patient_id: state.patientId,
      encounter_id: state.encounterId || null,
      department: state.department,
      consultation_mode: state.consultationMode,
      language: state.language,
      status: state.status,
      chief_complaint: state.chiefComplaint || null,
      current_question_id: state.currentQuestionId || null,
      asked_question_ids: state.askedQuestionIds,
      answered_question_ids: state.answeredQuestionIds,
      skipped_question_ids: state.skippedQuestionIds,
      collected_facts: state.collectedFacts,
      red_flags: state.redFlags,
      progress: state.progress,
      started_at: state.startedAt,
      completed_at: state.completedAt || null,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[Interview Session DB] Upsert error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Interview Session DB] Exception:', err);
    return { success: false, error: err.message || 'Database error' };
  }
}

export async function getInterviewSession(sessionId: string): Promise<InterviewState | null> {
  try {
    const supabase = await createAdminClient();
    const { data: row, error } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (error || !row) return null;

    return {
      sessionId: row.id,
      patientId: row.patient_id,
      encounterId: row.encounter_id || undefined,
      department: row.department || 'General Medicine',
      consultationMode: (row.consultation_mode || 'general_medicine') as any,
      language: (row.language || 'en') as any,
      chiefComplaint: row.chief_complaint || undefined,
      currentQuestionId: row.current_question_id || undefined,
      askedQuestionIds: row.asked_question_ids || [],
      answeredQuestionIds: row.answered_question_ids || [],
      skippedQuestionIds: row.skipped_question_ids || [],
      collectedFacts: row.collected_facts || [],
      redFlags: row.red_flags || [],
      progress: row.progress || 0,
      status: row.status || 'active',
      startedAt: row.started_at,
      completedAt: row.completed_at || undefined,
      updatedAt: row.updated_at,
    };
  } catch (err) {
    console.error('[Interview Session DB] Error fetching session:', err);
    return null;
  }
}

export async function getActiveSessionForEncounter(encounterId: string): Promise<InterviewState | null> {
  try {
    const supabase = await createAdminClient();
    const { data: row, error } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('encounter_id', encounterId)
      .in('status', ['active', 'paused'])
      .order('updated_at', { ascending: false })
      .maybeSingle();

    if (error || !row) return null;

    return {
      sessionId: row.id,
      patientId: row.patient_id,
      encounterId: row.encounter_id || undefined,
      department: row.department || 'General Medicine',
      consultationMode: (row.consultation_mode || 'general_medicine') as any,
      language: (row.language || 'en') as any,
      chiefComplaint: row.chief_complaint || undefined,
      currentQuestionId: row.current_question_id || undefined,
      askedQuestionIds: row.asked_question_ids || [],
      answeredQuestionIds: row.answered_question_ids || [],
      skippedQuestionIds: row.skipped_question_ids || [],
      collectedFacts: row.collected_facts || [],
      redFlags: row.red_flags || [],
      progress: row.progress || 0,
      status: row.status || 'active',
      startedAt: row.started_at,
      completedAt: row.completed_at || undefined,
      updatedAt: row.updated_at,
    };
  } catch (err) {
    console.error('[Interview Session DB] Error fetching encounter session:', err);
    return null;
  }
}
