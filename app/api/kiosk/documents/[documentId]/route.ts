import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/supabase/db-service';
import { storage } from '../../../../../lib/supabase/storage';
import { verifyUploadToken } from '../../../../../lib/crypto/token';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  let sessionId = req.nextUrl.searchParams.get('sessionId');
  const token = req.nextUrl.searchParams.get('token');

  if (token) {
    const decoded = verifyUploadToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid or expired upload session token' }, { status: 403 });
    }
    sessionId = decoded;
  }
  
  if (!sessionId || !documentId) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const session = await db.getSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED !== 'true' && process.env.NODE_ENV !== 'development' && process.env.DEMO_ENVIRONMENT !== 'true') {
      const { createClient } = require('@/lib/supabase/server');
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== session.patientId) {
        return NextResponse.json({ error: 'Unauthorized access to session' }, { status: 403 });
      }
    }


    

    if (!session || session.status === 'completed' || session.status === 'cancelled' || session.status === 'expired') {
      return NextResponse.json({ success: false, error: 'Invalid or inactive session' }, { status: 403 });
    }

    const doc = await db.getDocument(documentId);
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });

    }

    if (doc.sessionId !== sessionId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    if (doc.storagePath) {
      await storage.deleteDocument(doc.storagePath);
    }
    
    await db.deleteDocument(documentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
