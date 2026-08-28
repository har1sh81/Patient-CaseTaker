import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/supabase/db-service';
import { isSessionExpired } from '../../../../../lib/supabase/db-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 });
    }

    const activeSession = await db.getSession(sessionId);

    if (!activeSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    if (activeSession.status !== 'active' || isSessionExpired(activeSession)) {
      return NextResponse.json({ success: false, error: 'Session is expired or inactive' }, { status: 403 });
    }

    const answers = await db.getSessionAnswers(activeSession.id);

    return NextResponse.json({
      success: true,
      session: activeSession,
      answers,
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
