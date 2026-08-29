import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/supabase/db-service';
import { generateUploadToken } from '../../../../../lib/crypto/token';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Missing sessionId' }, { status: 400 });
    }

    const session = await db.getSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (isSupabaseConfigured() && process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED !== 'true' && process.env.NODE_ENV !== 'development' && process.env.DEMO_ENVIRONMENT !== 'true') {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== session.patientId) {
        return NextResponse.json({ error: 'Unauthorized access to session' }, { status: 403 });
      }
    }


    


    if (!session || session.status === 'completed' || session.status === 'cancelled' || session.status === 'expired') {
      return NextResponse.json({ success: false, error: 'Invalid or inactive session' }, { status: 403 });
    }

    // Generate a secure token valid for 10 minutes
    const token = generateUploadToken(sessionId, 10 * 60 * 1000);

    return NextResponse.json({ success: true, token });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
