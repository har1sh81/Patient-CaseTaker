import { NextResponse } from 'next/server';
import { db, isSessionExpired } from '../../../../../lib/supabase/db-service';
import { evaluateAttentionFlags } from '../../../../../lib/attention/evaluate';

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId is required' }, { status: 400 });
    }

    const session = await db.getSession(sessionId);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });

    }

    if (process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED !== 'true' && process.env.NODE_ENV !== 'development' && process.env.DEMO_ENVIRONMENT !== 'true') {
      const { createClient } = require('@/lib/supabase/server');
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== session.patientId) {
        return NextResponse.json({ error: 'Unauthorized access to session' }, { status: 403 });
      }
    }


    if (session.status !== 'active' || isSessionExpired(session)) {
      return NextResponse.json({ success: false, error: 'Session is inactive or expired' }, { status: 403 });
    }

    // Log evaluation started
    await db.saveAuditLog({
      id: crypto.randomUUID(),
      sessionId,
      action: 'attention_evaluation_started',
      timestamp: new Date().toISOString(),
    });

    // Fetch context
    const answers = await db.getSessionAnswers(sessionId);
    
    // We would fetch extractions if Phase 10 extractions were tied cleanly to an exposed DB method,
    // For now we get documents, but the evaluate.ts rule for Phase 12 demo doesn't strictly need extractions for the chest pain rule.
    // However, if we need it, we'd do something like:
    // const docs = await db.getSessionDocuments(sessionId);
    // const extractions = await Promise.all(docs.map(d => db.getExtraction(d.id)));
    // (mocking this as empty array for now since mock db doesn't expose getExtraction easily without doc id list)

    const timeline = await db.getTimeline(sessionId);

    // Evaluate
    const flags = await evaluateAttentionFlags(
      sessionId,
      session.patientId || 'unknown_patient',
      {
        answers,
        extractions: [],
        timeline,
      }
    );

    // Log completion
    await db.saveAuditLog({
      id: crypto.randomUUID(),
      sessionId,
      action: 'attention_evaluation_completed',
      timestamp: new Date().toISOString(),
      metadata: { flagsGenerated: flags.length }
    });

    return NextResponse.json({ success: true, data: flags });

  } catch (error) {
    console.error('Attention Evaluation Error:', error);
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

    const flags = await db.getSessionFlags(sessionId);
    return NextResponse.json({ success: true, data: flags });

  } catch (error) {
    console.error('Attention Fetch Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
