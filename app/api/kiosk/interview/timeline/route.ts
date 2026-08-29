import { NextResponse } from 'next/server';
import { db, isSessionExpired } from '../../../../../lib/supabase/db-service';
import { buildTimeline } from '../../../../../lib/timeline/fusion-engine';

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId is required' }, { status: 400 });
    }

    // 1. Session Verification
    const activeSession = await db.getSession(sessionId);
    if (!activeSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });

    }
    if (activeSession.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Session is not active' }, { status: 403 });
    }
    if (isSessionExpired(activeSession)) {
      return NextResponse.json({ success: false, error: 'Session has expired' }, { status: 403 });
    }

    const patientId = activeSession.patientId!;

    // 2. Fetch Data Sources
    const answers = await db.getSessionAnswers(sessionId);
    
    // We only process documents that have been successfully extracted
    const documents = await db.getSessionDocuments(sessionId);
    const extractions = [];
    for (const doc of documents) {
      const ext = await db.getExtraction(doc.id);
      if (ext) extractions.push(ext);
    }

    // Attempt to get ABDM payload. For prototype, it's saved as ClinicalHistory by Phase 7.5
    let abdmHistory;
    try {
      const history = await db.getClinicalHistory(sessionId);
      if (history) {
        // Just verify if it has abdm provenances or data
        abdmHistory = history;
      }
    } catch {
      console.warn("No ABDM history found for timeline fusion");
    }

    // 3. Build Timeline
    const timeline = buildTimeline(
      sessionId,
      patientId,
      answers,
      extractions,
      abdmHistory
    );

    // 4. Save Timeline
    const savedTimeline = await db.saveTimeline(timeline);
    
    // Audit Logging
    await db.saveAuditLog({
      id: `audit_${Date.now()}`,
      sessionId,
      action: 'timeline_generation_completed',
      metadata: { 
        patientId,
        recordsCount: savedTimeline.records.length 
      },
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ success: true, data: savedTimeline });
  } catch (error) {
    console.error('Timeline Generation Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

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
    if (activeSession.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Session is not active' }, { status: 403 });
    }

    const timeline = await db.getTimeline(sessionId);
    if (!timeline) {
      return NextResponse.json({ success: true, data: { records: [] } });
    }

    return NextResponse.json({ success: true, data: timeline });
  } catch (error) {
    console.error('Timeline Fetch Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
