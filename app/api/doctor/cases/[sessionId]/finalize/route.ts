import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { db } from '../../../../../../lib/supabase/db-service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { sessionId } = await params;

    const session = await db.getSession(sessionId);
    if (!session || session.status !== 'sent_to_doctor') {
      return NextResponse.json(
        { error: 'Session is not ready to be finalized' },
        { status: 403 }
      );
    }

    // Mark as finalized
    await db.finalizeSession(sessionId);

    
    await db.saveAuditLog({
      id: `log_${randomUUID()}`,
      sessionId,
      action: 'physician_finalized',
      timestamp: new Date().toISOString(),
      metadata: { actor: user.id }
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to finalize session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
