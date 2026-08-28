import { NextResponse } from 'next/server';
import { db, isSessionExpired } from '../../../../../../lib/supabase/db-service';
import { reconstructHistory } from '../../../../../../lib/timeline/relevance-engine';
import { ReconstructedHistory } from '../../../../../../types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId is required' }, { status: 400 });
    }

    // Session Verification
    const activeSession = await db.getSession(sessionId);
    if (!activeSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }
    if (activeSession.status !== 'active' && activeSession.status !== 'completed') {
      return NextResponse.json({ success: false, error: 'Session is not valid' }, { status: 403 });
    }

    const patientId = activeSession.patientId!;

    // Fetch existing fused timeline
    const timeline = await db.getTimeline(sessionId);
    if (!timeline) {
      // If no timeline exists, maybe it wasn't generated yet.
      return NextResponse.json({ success: true, data: {
        sessionId,
        patientId,
        currentComplaintContext: { complaint: 'Unknown' },
        records: [],
        conflicts: [],
        lastUpdated: new Date().toISOString()
      }});
    }

    // Fetch answers to get current complaint context
    const answers = await db.getSessionAnswers(sessionId);

    // Reconstruct history based on complaint
    const { context, relevantRecords } = reconstructHistory(timeline.records, answers);

    // Extract conflicts from the relevant records only
    const conflicts = relevantRecords.flatMap(r => r.conflicts || []);

    const reconstructedHistory: ReconstructedHistory = {
      sessionId,
      patientId,
      currentComplaintContext: context || { complaint: 'Unknown' },
      records: relevantRecords,
      conflicts,
      lastUpdated: new Date().toISOString()
    };

    // Audit Logging
    await db.saveAuditLog({
      id: `audit_${Date.now()}`,
      sessionId,
      action: 'complaint_history_reconstructed',
      metadata: { 
        patientId,
        totalRecords: timeline.records.length,
        relevantRecordsCount: relevantRecords.length 
      },
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ success: true, data: reconstructedHistory });
  } catch (error) {
    console.error('Timeline Reconstruction Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
