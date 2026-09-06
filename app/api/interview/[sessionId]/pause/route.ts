/**
 * Task #9 — Interview Pause API Route
 * MediKiosk Clinical Architecture
 * 
 * POST /api/interview/[sessionId]/pause
 */

import { NextResponse } from 'next/server';
import { pauseInterviewSession } from '@/lib/clinical/interview/interview-service';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId is required' }, { status: 400 });
    }

    const result = await pauseInterviewSession(sessionId);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error, errorCode: result.errorCode }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (err: any) {
    console.error('[API Interview Pause] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
