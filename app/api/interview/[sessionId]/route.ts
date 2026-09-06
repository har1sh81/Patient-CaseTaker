/**
 * Task #9 — Interview Get State API Route
 * MediKiosk Clinical Architecture
 * 
 * GET /api/interview/[sessionId]
 */

import { NextResponse } from 'next/server';
import { getInterviewSession } from '@/lib/clinical/interview/interview-session';
import { selectNextQuestion, getLocalizedQuestionText } from '@/lib/clinical/interview/question-selector';
import { getQuestionById } from '@/lib/clinical/questions';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId is required' }, { status: 400 });
    }

    const state = await getInterviewSession(sessionId);
    if (!state) {
      return NextResponse.json({ success: false, error: 'Interview session not found' }, { status: 404 });
    }

    let currentQ = state.currentQuestionId ? getQuestionById(state.currentQuestionId) : undefined;
    if (!currentQ && state.status === 'active') {
      currentQ = selectNextQuestion(state) || undefined;
    }

    const localized = currentQ ? getLocalizedQuestionText(currentQ, state.language) : undefined;

    return NextResponse.json({
      success: true,
      data: {
        ...state,
        currentQuestion: currentQ
          ? {
              ...currentQ,
              localizedText: localized?.text,
              localizedOptions: localized?.options,
            }
          : undefined,
      },
    });
  } catch (err: any) {
    console.error('[API Interview Get State] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
