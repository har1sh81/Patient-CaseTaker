/**
 * Task #9 — Interview Complete API Route
 * MediKiosk Clinical Architecture
 * 
 * POST /api/interview/[sessionId]/complete
 */

import { NextResponse } from 'next/server';
import { completeInterviewSession } from '@/lib/clinical/interview/interview-service';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId is required' }, { status: 400 });
    }

    const result = await completeInterviewSession(sessionId);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error, errorCode: result.errorCode }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (err: any) {
    console.error('[API Interview Complete] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
