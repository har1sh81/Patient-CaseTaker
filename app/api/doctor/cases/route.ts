import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '../../../../lib/supabase/db-service';
import { IntakeSession, AttentionFlag } from '../../../../types';

interface DoctorCase {
  session: IntakeSession;
  patient: unknown | null;
  departmentMode: string;
  chiefComplaint: string;
  attentionFlagsCount: number;
  priority: number;
  documentCount: number;
  hasAbdm: boolean;
  conflictCount: number;
  handoffAt: string;
}

export async function GET() {
  try {
    const isMockOrDemo = process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED === 'true' || process.env.DEMO_ENVIRONMENT === 'true';
    if (!isMockOrDemo) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.app_metadata?.role !== 'doctor') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const sessions = await db.getSessionsByStatus('sent_to_doctor');

    const cases: DoctorCase[] = await Promise.all(
      sessions.map(async (session: IntakeSession) => {
        const patient = session.patientId ? await db.getPatient(session.patientId) : null;
        const report = await db.getReportBySession(session.id);
        const flags = await db.getSessionFlags(session.id);
        const docs = await db.getSessionDocuments(session.id);
        const timeline = await db.getTimeline(session.id);

        const activeFlags = flags.filter((f: AttentionFlag) => f.status === 'active');
        const hasCritical = activeFlags.some((f: AttentionFlag) => f.severity === 'critical');
        const hasHigh = activeFlags.some((f: AttentionFlag) => f.severity === 'high');

        let priority = 0;
        if (hasCritical) priority = 3;
        else if (hasHigh) priority = 2;
        else if (activeFlags.length > 0) priority = 1;

        return {
          session,
          patient,
          departmentMode: session.departmentMode,
          chiefComplaint: report?.clinicalHistory?.chiefComplaint?.primaryComplaint || 'Not specified',
          attentionFlagsCount: activeFlags.length,
          priority,
          documentCount: docs.length,
          hasAbdm: timeline?.records?.some((r) => r.provenances?.[0]?.source === 'abdm') || false,
          conflictCount: 0,
          handoffAt: session.handoffAt || session.startedAt,
        };
      })
    );

    cases.sort((a: DoctorCase, b: DoctorCase) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      const timeA = new Date(a.handoffAt || 0).getTime();
      const timeB = new Date(b.handoffAt || 0).getTime();
      return timeA - timeB;
    });

    return NextResponse.json({ cases });
  } catch (error: unknown) {
    console.error('Failed to fetch doctor cases:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
