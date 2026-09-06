/**
 * Task #9 — Interview Resume API Route
 * MediKiosk Clinical Architecture
 * 
 * POST /api/interview/[sessionId]/resume
 */

import { NextResponse } from 'next/server';
import { resumeInterviewSession } from '@/lib/clinical/interview/interview-service';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId is required' }, { status: 400 });
    }

    const result = await resumeInterviewSession(sessionId);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error, errorCode: result.errorCode }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (err: any) {
    console.error('[API Interview Resume] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
