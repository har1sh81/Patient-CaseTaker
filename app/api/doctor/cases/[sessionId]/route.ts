import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '../../../../../lib/supabase/db-service';

export async function GET(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const isMockOrDemo = process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED === 'true' || process.env.DEMO_ENVIRONMENT === 'true';
    if (!isMockOrDemo) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.app_metadata?.role !== 'doctor') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const { sessionId } = await context.params;

    const session = await db.getSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'sent_to_doctor') {
      return NextResponse.json({ error: 'Case not ready for doctor review' }, { status: 403 });
    }

    const patient = session.patientId ? await db.getPatient(session.patientId) : null;
    
    // We should ideally fetch the specific frozen snapshot via its ID
    const reportId = session.handoffSnapshotId;
    let report = null;
    if (reportId) {
      report = await db.getReport(reportId);
    }
    // Fallback if ID didn't match (for older test cases)
    if (!report) {
      report = await db.getReportBySession(sessionId);
    }

    const flags = await db.getSessionFlags(sessionId);
    const docs = await db.getSessionDocuments(sessionId);
    const timeline = await db.getTimeline(sessionId);
    const corrections = await db.getSessionCorrections(sessionId);

    return NextResponse.json({
      session,
      patient,
      report,
      flags,
      documents: docs,
      timeline,
      corrections,
    });
  } catch (error: unknown) {
    console.error('Failed to fetch doctor case detail:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
