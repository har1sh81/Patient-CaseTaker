import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/supabase/db-service';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const session = await db.getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    }

    if (isSupabaseConfigured() && process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED !== 'true' && process.env.NODE_ENV !== 'development' && process.env.DEMO_ENVIRONMENT !== 'true') {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== session.patientId) {
        return NextResponse.json({ error: 'Unauthorized access to session' }, { status: 403 });
      }
    }


    const patient = session.patientId ? await db.getPatient(session.patientId) : null;
    let report = await db.getReportBySession(sessionId);
    const answers = await db.getSessionAnswers(sessionId);
    const flags = await db.getSessionFlags(sessionId);
    const timeline = await db.getTimeline(sessionId);
    const documents = await db.getSessionDocuments(sessionId);

    if (!report) {
      const { getAIProvider } = await import('@/lib/ai/factory');
      const extractions = [];
      for (const d of documents) {
        const ext = await db.getExtraction(d.id);
        if (ext) extractions.push(ext);
      }
      const provider = getAIProvider();
      const genResponse = await provider.generateClinicalHistoryDraft({
        session,
        patient: patient || {
          id: session.patientId || 'pat_demo',
          demographics: { firstName: 'Patient', fullName: 'Kiosk Patient', age: 35, gender: 'other' },
          identification: {},
          createdAt: new Date().toISOString(),
        },
        answers,
        timeline: timeline ? timeline.records : [],
        documents: extractions,
        flags,
        patientReview: { sessionId, sections: [], status: 'pending' },
      });
      report = genResponse.report;
      await db.saveReport(report);
    }

    // Filter flags to just show there are flags, without clinical logic
    const hasAttentionFlags = flags.some(f => f.status === 'active' && (f.severity === 'high' || f.severity === 'critical'));

    return NextResponse.json({
      session,
      patient,
      report,
      answers,
      timeline,
      documents,
      hasAttentionFlags,
    });
  } catch (error: unknown) {
    console.error('Failed to fetch review data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
