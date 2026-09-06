/**
 * Task #9 — Interview Submit Answer API Route
 * MediKiosk Clinical Architecture
 * 
 * POST /api/interview/[sessionId]/answer
 */

import { NextResponse } from 'next/server';
import { submitInterviewAnswer } from '@/lib/clinical/interview/interview-service';
import type { InputMethod, AnswerStatus } from '@/lib/clinical/interview/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      questionId,
      answer,
      inputMethod = 'touch',
      answerStatus = 'answered',
      confidenceScore = 1.0,
      nativeTranscript,
    } = body;

    const result = await submitInterviewAnswer(sessionId, {
      questionId,
      answer,
      inputMethod: inputMethod as InputMethod,
      answerStatus: answerStatus as AnswerStatus,
      confidenceScore,
      nativeTranscript,
    });

    if (!result.success) {
      const status = result.errorCode === 'NOT_FOUND' ? 404 : result.errorCode === 'SAFETY_TERMINATED' ? 400 : 400;
      return NextResponse.json({ success: false, error: result.error, errorCode: result.errorCode }, { status });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (err: any) {
    console.error('[API Interview Answer] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
