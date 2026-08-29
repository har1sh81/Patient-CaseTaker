import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/supabase/db-service';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { ClinicalHistoryReport } from '../../../../../types';

const ConfirmRequestSchema = z.object({
  sessionId: z.string(),
  patientConfirmed: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = ConfirmRequestSchema.safeParse(json);

    if (!body.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const { sessionId, patientConfirmed } = body.data;

    if (!patientConfirmed) {
      return NextResponse.json({ error: 'Patient confirmation required' }, { status: 400 });
    }

    const session = await db.getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    }

    if (process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED !== 'true' && process.env.NODE_ENV !== 'development' && process.env.DEMO_ENVIRONMENT !== 'true') {
      const { createClient } = require('@/lib/supabase/server');
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== session.patientId) {
        return NextResponse.json({ error: 'Unauthorized access to session' }, { status: 403 });
      }
    }


    if (session.status === 'sent_to_doctor') {
      return NextResponse.json({ success: true, message: 'Already sent to doctor' }, { status: 200 });
    }

    // if (session.status !== 'patient_review' && session.status !== 'report_ready') {
    //   return NextResponse.json({ error: 'Session not in review state' }, { status: 400 });
    // }

    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 403 });
    }

    const report = await db.getReportBySession(sessionId);
    if (!report) {
      return NextResponse.json({ error: 'No clinical history draft found for session' }, { status: 400 });
    }

    // Freeze the snapshot
    const snapshotId = `snp_${randomUUID()}`;
    const frozenReport: ClinicalHistoryReport = {
      ...report,
      reportId: snapshotId,
      patientConfirmation: {
        confirmedByPatient: true,
        correctionsMade: (await db.getSessionCorrections(sessionId)).length,
      },
    };

    // Save frozen report (the mock DB handles upsert, but we give it a new ID)
    await db.saveReport(frozenReport);

    await db.updateSession(sessionId, {
      status: 'sent_to_doctor',
      handoffSnapshotId: snapshotId,
      handoffAt: new Date().toISOString(),
    });

    await db.saveAuditLog({
      id: `adt_${randomUUID()}`,
      sessionId,
      action: 'patient_confirmation_completed',
      metadata: { details: 'Patient confirmed the clinical history and sent to doctor' },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, snapshotId }, { status: 200 });
  } catch (error: unknown) {
    console.error('Failed to confirm session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
