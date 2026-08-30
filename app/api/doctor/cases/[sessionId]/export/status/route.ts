import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/supabase/db-service';

export async function GET(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const isDemoCookie = cookieStore.get('demo_doctor_session')?.value === 'true';
    const isMockOrDemo = isDemoCookie || process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED === 'true' || process.env.DEMO_ENVIRONMENT === 'true';
    if (!isMockOrDemo) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.app_metadata?.role !== 'doctor') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const { sessionId } = await context.params;
    const records = await db.getExportRecords(sessionId);
    return NextResponse.json({ success: true, records });
  } catch (error: any) {
    console.error('Failed to get export status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
