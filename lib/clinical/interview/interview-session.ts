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

    // Pack Phase 4 conversational state context inside covered_topics
    const cleanCovered = (state.coveredTopics || []).filter(t => !t.startsWith('__p4ctx:'));
    const p4Payload = `__p4ctx:${JSON.stringify({
      knownSymptoms: state.knownSymptoms || [],
      newSymptoms: state.newSymptoms || [],
      explicitNegatives: state.explicitNegatives || [],
      unresolvedTopics: state.unresolvedTopics || [],
      activeTopic: state.activeTopic || null,
      recentTopics: state.recentTopics || [],
      clarificationsNeeded: state.clarificationsNeeded || [],
      recentQuestionFingerprints: state.recentQuestionFingerprints || [],
      completionMetadata: state.completionMetadata || null,
    })}`;

    const { error } = await supabase.from('interview_sessions').upsert({
      id: state.sessionId,
      patient_id: state.patientId,
      encounter_id: state.encounterId || null,
      department: state.department,
      consultation_mode: state.consultationMode,
      language: state.language,
      status: state.status,
      chief_complaint: state.chiefComplaint || null,
      current_question_id: state.lastQuestion || null,
      asked_question_ids: state.askedQuestions,
      collected_facts: state.extractedFacts,
      red_flags: state.redFlags,
      conversation_turns: state.conversationTurns,
      covered_topics: [...cleanCovered, p4Payload],
      missing_information: state.missingInformation,
      last_answer: state.lastAnswer,
      turn_count: state.turnCount,
      progress: state.progress,
      started_at: state.createdAt,
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

function parseStateFromRow(row: any): InterviewState {
  const rawTopics: string[] = row.covered_topics || [];
  const cleanTopics = rawTopics.filter(t => typeof t === 'string' && !t.startsWith('__p4ctx:'));
  const p4Item = rawTopics.find(t => typeof t === 'string' && t.startsWith('__p4ctx:'));

  let p4Ctx: any = {};
  if (p4Item) {
    try {
      p4Ctx = JSON.parse(p4Item.substring(8));
    } catch (_e) {
      // ignore
    }
  }

  return {
    sessionId: row.id,
    patientId: row.patient_id,
    encounterId: row.encounter_id || undefined,
    department: row.department || 'General Medicine',
    consultationMode: (row.consultation_mode || 'general_medicine') as any,
    language: (row.language || 'en') as any,
    chiefComplaint: row.chief_complaint || undefined,
    lastQuestion: row.current_question_id || null,
    askedQuestions: row.asked_question_ids || [],
    extractedFacts: row.collected_facts || [],
    redFlags: row.red_flags || [],
    conversationTurns: row.conversation_turns || [],
    coveredTopics: cleanTopics,
    missingInformation: row.missing_information || [],
    lastAnswer: row.last_answer || null,
    turnCount: row.turn_count || 0,
    progress: row.progress || 0,
    status: row.status || 'active',
    knownSymptoms: p4Ctx.knownSymptoms || (row.chief_complaint ? [row.chief_complaint] : []),
    newSymptoms: p4Ctx.newSymptoms || [],
    explicitNegatives: p4Ctx.explicitNegatives || [],
    unresolvedTopics: p4Ctx.unresolvedTopics || [],
    activeTopic: p4Ctx.activeTopic || row.chief_complaint || 'general',
    recentTopics: p4Ctx.recentTopics || [],
    clarificationsNeeded: p4Ctx.clarificationsNeeded || [],
    recentQuestionFingerprints: p4Ctx.recentQuestionFingerprints || [],
    completionMetadata: p4Ctx.completionMetadata || undefined,
    createdAt: row.started_at,
    completedAt: row.completed_at || undefined,
    updatedAt: row.updated_at,
  };
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

    return parseStateFromRow(row);
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

    return parseStateFromRow(row);
  } catch (err) {
    console.error('[Interview Session DB] Error fetching encounter session:', err);
    return null;
  }
}
