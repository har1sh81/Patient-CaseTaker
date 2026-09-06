/**
 * Task #9 & #10 — Interview Get State API Route
 * MediKiosk Clinical Architecture
 * 
 * GET /api/interview/[sessionId]
 */

import { NextResponse } from 'next/server';
import { getInterviewSession } from '@/lib/clinical/interview/interview-session';
import { generateDynamicNextQuestion, buildStateDerivedFallbackQuestion } from '@/lib/clinical/interview/dynamic-question-engine';

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

    let currentQuestion: { id: string; text: string } | undefined = undefined;
    if (state.status !== 'completed' && state.status !== 'terminated_for_safety') {
      if (state.lastQuestion) {
        currentQuestion = {
          id: `q_${state.conversationTurns.length || 1}`,
          text: state.lastQuestion,
        };
      } else {
        try {
          const dynQ = await generateDynamicNextQuestion(state);
          currentQuestion = { id: dynQ.id, text: dynQ.text };
        } catch (qErr: any) {
          console.warn('[API Interview GET] LLM fallback:', qErr.message);
          const fallback = buildStateDerivedFallbackQuestion(state);
          currentQuestion = { id: fallback.id, text: fallback.text };
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...state,
        currentQuestion,
      },
    });
  } catch (err: any) {
    console.error('[API Interview Get State] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
