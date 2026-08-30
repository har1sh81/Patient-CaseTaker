import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '../../../../../../lib/supabase/db-service';
import { cookies } from 'next/headers';

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const isMockOrDemo = process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED === 'true' || process.env.DEMO_ENVIRONMENT === 'true';
    let userId = 'demo-doctor';
    if (!isMockOrDemo) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.app_metadata?.role !== 'doctor') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      userId = user.id;
    }

    const { sessionId } = await context.params;
    const { flagId, decision, updatePayload } = await request.json();

    if (!flagId || !decision) {
      return NextResponse.json({ error: 'Missing flagId or decision' }, { status: 400 });
    }

    const session = await db.getSession(sessionId);
    if (!session || session.status !== 'sent_to_doctor') {
      return NextResponse.json({ error: 'Case not ready for doctor review' }, { status: 403 });
    }

    // In a real app we'd decode the JWT to get the doctor ID
    // For now we'll mock the doctor ID or read a cookie
    const cookieStore = await cookies();
    const isMock = process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED === 'true';
    const supabaseToken = cookieStore.get('sb-ouqhtjcvtsmfyfmanvjq-auth-token');
    
    // In mock mode without a token, use a default ID. Otherwise they wouldn't be able to log in.
    const doctorId = 'dr_temp_123';
    
    // Perform resolution
    const flag = await db.resolveConflict(flagId, decision, doctorId);

    // If there's an updatePayload for the clinical report (e.g. they chose Medication A)
    if (updatePayload && Object.keys(updatePayload).length > 0) {
      await db.updateClinicalReport(sessionId, updatePayload);
    }

    await db.saveAuditLog({
      id: `log_${crypto.randomUUID()}`,
      sessionId,
      action: 'conflict_resolved',
      timestamp: new Date().toISOString(),
      metadata: { actor: userId, flagId, decision }
    });


    return NextResponse.json({ success: true, flag });
  } catch (error: unknown) {
    console.error('Failed to resolve conflict:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
