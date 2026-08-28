import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/supabase/db-service';
import { storage } from '../../../../../lib/supabase/storage';
import type { AuditAction } from '../../../../../types';

// Valid cleanup reason values the client may pass
type CleanupReason = 'user_cancelled' | 'session_timeout' | 'consent_declined' | 'print_completed';

// Map each reason to the canonical AuditAction in the schema
function reasonToAuditAction(reason: CleanupReason): AuditAction {
  switch (reason) {
    case 'user_cancelled':
      return 'session_cancelled';
    case 'session_timeout':
      return 'session_expired';
    case 'consent_declined':
      return 'consent_declined';
    case 'print_completed':
      return 'print_completed';
    default:
      return 'session_cleaned';
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, reason } = body as { sessionId?: string; reason?: CleanupReason };

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const resolvedReason: CleanupReason = reason ?? 'user_cancelled';
    const auditAction = reasonToAuditAction(resolvedReason);

    // 1. Delete temporary in-progress data only
    //    cleanupSession deletes: conversation_messages, conversation_answers, patient_corrections
    //    It does NOT touch: patients, consents, reports, audit_logs, attention_flags
    await db.cleanupSession(sessionId);

    // 2. Delete temporary storage objects (abandoned OCR uploads etc.)
    //    Does NOT delete completed report PDFs
    await storage.cleanupSessionDocuments(sessionId);

    // 3. Record the audit event with the actual reason
    await db.saveAuditLog({
      id: `log_${Math.random().toString(36).substring(2, 11)}`,
      sessionId,
      action: auditAction,
      timestamp: new Date().toISOString(),
      metadata: { reason: resolvedReason },
    });

    return NextResponse.json({ success: true, message: 'Session data cleared successfully' });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || 'Cleanup operation failed' },
      { status: 500 }
    );
  }
}
