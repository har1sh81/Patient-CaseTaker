import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/supabase/db-service';
import { mapToFHIRBundle } from '@/lib/fhir/mapper';

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
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

    if (session.status !== 'finalized') {
      return NextResponse.json({ error: 'Export rejected: Session is not finalized.' }, { status: 403 });
    }

    // Try to get the finalized report
    const reportId = session.handoffSnapshotId;
    let report = null;
    if (reportId) {
      report = await db.getReport(reportId);
    }
    if (!report) {
      report = await db.getReportBySession(sessionId);
    }

    if (!report) {
      return NextResponse.json({ error: 'Export rejected: Clinical report not found.' }, { status: 404 });
    }

    if (report.physicianVerification.status !== 'verified' && report.physicianVerification.status !== 'corrected') {
      return NextResponse.json({ error: 'Export rejected: Report has not been verified by a physician.' }, { status: 403 });
    }

    // Deterministic generation
    const fhirBundle = mapToFHIRBundle(session, report);

    return NextResponse.json({ success: true, fhirBundle });
  } catch (error: any) {
    console.error('Failed to generate FHIR export:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
