import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/supabase/db-service';
import { ConversationAnswerSchema } from '../../../../../schemas';

// Save an answer
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Server-side validation against our schema
    const answer = ConversationAnswerSchema.parse(body.answer);
    
    // Save via backend db-service
    const savedAnswer = await db.saveAnswer(answer);

    return NextResponse.json({
      success: true,
      answer: savedAnswer,
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// Delete invalidated answers
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { answerIds } = body;

    if (!Array.isArray(answerIds) || answerIds.length === 0) {
      return NextResponse.json({ success: false, error: 'answerIds array is required' }, { status: 400 });
    }

    // Backend deletion
    await db.deleteAnswers(answerIds);

    return NextResponse.json({
      success: true,
      deletedCount: answerIds.length,
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
