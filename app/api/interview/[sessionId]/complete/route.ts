import { NextResponse } from 'next/server';
import { getInterviewSession, saveInterviewSession } from '@/lib/clinical/interview/interview-session';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const state = await getInterviewSession(sessionId);

    if (!state) {
      return NextResponse.json({ success: false, error: 'Session not found', errorCode: 'NOT_FOUND' }, { status: 404 });
    }

    if (state.status === 'completed' || state.status === 'terminated_for_safety') {
      return NextResponse.json({ success: true, status: state.status });
    }

    state.status = 'completed';
    state.progress = 100;
    
    const result = await saveInterviewSession(state);
    if (!result.success) {
      throw new Error(result.error);
    }

    return NextResponse.json({ success: true, status: 'completed' });
  } catch (err: any) {
    console.error('[API Interview Complete] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
