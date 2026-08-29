import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '../../../../../../lib/supabase/db-service';

export async function PATCH(
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
    const updates = await request.json();

    // Verify session belongs to doctor's queue
    const session = await db.getSession(sessionId);
    if (!session || session.status !== 'sent_to_doctor') {
      return NextResponse.json(
        { error: 'Session is not available for update or does not exist' },
        { status: 403 }
      );
    }

    // Update the clinical report
    const updatedReport = await db.updateClinicalReport(sessionId, updates);
    return NextResponse.json({ success: true, report: updatedReport });
  } catch (error: unknown) {
    console.error('Failed to update clinical report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
