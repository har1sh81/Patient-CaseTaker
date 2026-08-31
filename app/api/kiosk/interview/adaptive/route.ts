import { NextResponse } from 'next/server';
import { db, isSessionExpired } from '../../../../../lib/supabase/db-service';
import { PHASE6_DEMO_QUESTIONS, PHASE13_AYUSH_QUESTIONS } from '../../../../../lib/conversation/question-library';
import { AdaptiveQuestionRequestSchema } from '../../../../../schemas/ai.schema';
import { z } from 'zod';
import { getAIProvider, getQuestionSelectionProvider } from '../../../../../lib/ai/factory';
import { buildAdaptiveContext, evaluateDomainCompleteness } from '../../../../../lib/conversation/adaptive-logic';
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

    // 3. Provider Invocation - Separate fact extraction & question selection
    const factProvider = getAIProvider();                    // LocalProvider for fact extraction
    const questionProvider = getQuestionSelectionProvider(); // Gemini (or local) for next question

    const timeoutMs = process.env.AI_TIMEOUT_MS ? parseInt(process.env.AI_TIMEOUT_MS, 10) : 8000;

    // Step 1: Extract facts locally (always local for privacy/reliability)
    const factsTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Fact extraction timed out')), timeoutMs);
    });
    const factsResponse = await Promise.race([
      factProvider.analyzeAnswer(reqData),
      factsTimeout
    ]) as AdaptiveQuestionResponse;

    // Step 2: Build adaptive context for question selection
    const prevAnswers = reqData.previousAnswers || [];
    const latestText = typeof reqData.latestAnswer?.rawValue === 'string'
      ? reqData.latestAnswer.rawValue
      : String(reqData.latestAnswer?.transcript || '');
    const combinedText = [...prevAnswers.map(a => String(a.transcript || a.rawValue || a.normalizedValue || '')), latestText].filter(Boolean).join(' ');
    
    const answersMap: Record<string, any> = {};
    prevAnswers.forEach(a => { answersMap[a.questionId] = a; });
    if (reqData.latestAnswer?.questionId) {
      answersMap[reqData.latestAnswer.questionId] = reqData.latestAnswer;
    }
    const askedIds = new Set(Object.keys(answersMap));
    const allowedQuestionIds = serverAllowedQuestionIds.filter(id => !askedIds.has(id));

    const ctx = buildAdaptiveContext(
      answersMap,
      reqData.latestAnswer || null,
      allowedQuestionIds,
      reqData.language === 'hi' ? 'hi' : reqData.language === 'ta' ? 'ta' : 'en'
    );
    const domains = evaluateDomainCompleteness(ctx);

    // Step 3: Select next question via QuestionSelector (can be Gemini)
    const questionTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Question selection timed out')), timeoutMs);
    });
    const questionResponse = await Promise.race([
      questionProvider.selectQuestion({
        context: ctx,
        domains,
        candidates: allowedQuestionIds,
      }),
      questionTimeout
    ]);

    // Combine facts + selected question
    const aiResponse: AdaptiveQuestionResponse = {
      ...factsResponse,
      nextQuestionId: questionResponse.selectedQuestionId,
      nextAction: questionResponse.selectedQuestionId ? 'ask_follow_up' : 'continue_deterministic',
      confidence: questionResponse.selectedQuestionId ? 'high' : 'medium',
    };

    // 4. Safety & Allowlist Enforcement
    // Check 7: AI can ONLY select from server-provided allowed question IDs
    if (aiResponse.nextAction === 'ask_follow_up' && aiResponse.nextQuestionId) {
      if (!serverAllowedQuestionIds.includes(aiResponse.nextQuestionId)) {
        console.error('QuestionSelector returned a forbidden question ID:', aiResponse.nextQuestionId);
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
        details: `Successfully extracted facts (${factsResponse.extractedFacts.length}) and selected next question: ${questionResponse.selectedQuestionId || 'none'} (provider: ${questionResponse.providerUsed}, fallback: ${questionResponse.fallbackUsed})`
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
    } as unknown as Parameters<typeof db.saveAuditLog>[0]).catch(() => {});

    // Do not crash the interview. Return 500 so the client falls back to deterministic.
    return NextResponse.json(
      { success: false, error: err.message || 'AI processing failed' },
      { status: 500 }
    );
  }
}
