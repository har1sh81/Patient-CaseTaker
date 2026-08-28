import { NextResponse } from 'next/server';
import { db, isSessionExpired } from '../../../../../lib/supabase/db-service';
import { PHASE6_DEMO_QUESTIONS, PHASE13_AYUSH_QUESTIONS } from '../../../../../lib/conversation/question-library';
import { AdaptiveQuestionRequestSchema } from '../../../../../schemas/ai.schema';
import { z } from 'zod';
import { getAIProvider } from '../../../../../lib/ai/factory';
import { AdaptiveQuestionResponse } from '../../../../../types';

export async function POST(request: Request) {
  let reqData: z.infer<typeof AdaptiveQuestionRequestSchema> | null = null;
  try {
    const body = await request.json();
    
    try {
      reqData = AdaptiveQuestionRequestSchema.parse(body);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid request payload' }, { status: 400 });
    }

    // 2. Load Session and Verify Authorization
    // Checks 1 & 2: sessionId exists and session exists in DB
    const activeSession = await db.getSession(reqData.sessionId);
    if (!activeSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // Check 3: session.status === 'active'
    if (activeSession.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Session is not active' }, { status: 403 });
    }

    // Check 4: session is not expired
    if (isSessionExpired(activeSession)) {
      return NextResponse.json({ success: false, error: 'Session has expired' }, { status: 403 });
    }

    // Check 5: session belongs to the authorized context
    // In our architecture, the session data itself verifies it is an intake session.
    if (!activeSession.patientId) {
      return NextResponse.json({ success: false, error: 'Invalid session context' }, { status: 403 });
    }

    // Server-provided question library validation
    const allowedQuestions = activeSession.departmentMode === 'ayush' ? PHASE13_AYUSH_QUESTIONS : PHASE6_DEMO_QUESTIONS;
    const serverAllowedQuestionIds = allowedQuestions.map(q => q.id);

    // Check 6: requested currentQuestionId actually belongs to the allowed question library
    if (reqData.currentQuestion?.id && !serverAllowedQuestionIds.includes(reqData.currentQuestion.id)) {
      return NextResponse.json(
        { success: false, error: 'Current question is not in the allowed question library' }, 
        { status: 400 }
      );
    }

    // 3. Provider Invocation
    const provider = getAIProvider();
    
    await db.saveAuditLog({
      id: crypto.randomUUID(),
      sessionId: activeSession.id,
      entityType: 'patient',
      entityId: activeSession.patientId,
      metadata: { resource: 'adaptive_question' },
      action: 'adaptive_question_started',
      timestamp: new Date().toISOString(),
      details: 'Initiated adaptive questioning.'
    } as unknown as Parameters<typeof db.saveAuditLog>[0]);

    const timeoutMs = process.env.AI_TIMEOUT_MS ? parseInt(process.env.AI_TIMEOUT_MS, 10) : 8000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI Request timed out')), timeoutMs);
    });

    const aiResponse = await Promise.race([
      provider.analyzeAnswer(reqData),
      timeoutPromise
    ]) as AdaptiveQuestionResponse;

    // 4. Safety & Allowlist Enforcement
    // Check 7: AI can ONLY select from server-provided allowed question IDs
    if (aiResponse.nextAction === 'ask_follow_up' && aiResponse.nextQuestionId) {
      if (!serverAllowedQuestionIds.includes(aiResponse.nextQuestionId)) {
        console.error('AI returned a forbidden question ID:', aiResponse.nextQuestionId);
        // Fallback to deterministic by denying the AI's question choice
        aiResponse.nextAction = 'continue_deterministic';
        aiResponse.nextQuestionId = undefined;
      }
    }

    if (aiResponse.confidence !== 'high') {
      console.warn('AI confidence low. Falling back to deterministic.');
      aiResponse.nextAction = 'continue_deterministic';
      aiResponse.nextQuestionId = undefined;
      await db.saveAuditLog({
        id: crypto.randomUUID(),
        sessionId: activeSession.id,
        entityType: 'patient',
        entityId: activeSession.patientId,
        metadata: { resource: 'adaptive_question' },
        action: 'adaptive_question_fallback',
        timestamp: new Date().toISOString(),
        details: 'Fell back to deterministic due to low confidence or invalid selection.'
      } as unknown as Parameters<typeof db.saveAuditLog>[0]);
    } else {
      await db.saveAuditLog({
        id: crypto.randomUUID(),
        sessionId: activeSession.id,
        entityType: 'patient',
        entityId: activeSession.patientId,
        metadata: { resource: 'adaptive_question' },
        action: 'adaptive_question_completed',
        timestamp: new Date().toISOString(),
        details: 'Successfully extracted explicit info and selected next question.'
      } as unknown as Parameters<typeof db.saveAuditLog>[0]);
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
    });
  } catch (error) {
    console.error('AI Adaptive Route Error:', error);
    const err = error as Error;

    await db.saveAuditLog({
      id: crypto.randomUUID(),
      sessionId: reqData?.sessionId || 'unknown',
      entityType: 'patient',
      entityId: 'unknown',
      metadata: { resource: 'adaptive_question' },
      action: 'adaptive_question_failed',
      timestamp: new Date().toISOString(),
      details: err.message || 'AI processing failed'
    } as unknown as Parameters<typeof db.saveAuditLog>[0]).catch(() => {}); // ignore errors logging failure

    // Do not crash the interview. Return 500 so the client falls back to deterministic.
    return NextResponse.json(
      { success: false, error: err.message || 'AI processing failed' },
      { status: 500 }
    );
  }
}
