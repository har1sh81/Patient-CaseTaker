import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/supabase/db-service';
import { storage } from '../../../../lib/supabase/storage';
import { verifyUploadToken } from '../../../../lib/crypto/token';
import { MedicalDocumentTypeSchema } from '../../../../schemas';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  let sessionId = req.nextUrl.searchParams.get('sessionId');
  const token = req.nextUrl.searchParams.get('token');

  if (token) {
    const decoded = verifyUploadToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid or expired upload session token' }, { status: 403 });
    }
    sessionId = decoded;
  }

  if (!sessionId) {
    return NextResponse.json({ success: false, error: 'Missing session information' }, { status: 400 });
  }

  try {
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

    const docs = await db.getSessionDocuments(sessionId);
    return NextResponse.json({ success: true, documents: docs });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const token = formData.get('token') as string;
    const categoryRaw = formData.get('category') as string;
    const file = formData.get('file') as File;

    if (!token || !categoryRaw || !file) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const sessionId = verifyUploadToken(token);
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Invalid or expired upload session token' }, { status: 403 });
    }

    const session = await db.getSession(sessionId);
    if (!session || session.status === 'completed' || session.status === 'cancelled' || session.status === 'expired') {
      return NextResponse.json({ success: false, error: 'Invalid or inactive session' }, { status: 403 });
    }

    if (!session.patientId) {
      return NextResponse.json({ success: false, error: 'Session has no patient' }, { status: 400 });
    }

    const parseResult = MedicalDocumentTypeSchema.safeParse(categoryRaw);
    if (!parseResult.success) {
      return NextResponse.json({ success: false, error: 'Invalid document category' }, { status: 400 });
    }
    const category = parseResult.data;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Using Date.now() for unique id to avoid eslint purity issues with Math.random()
    const documentId = `doc_${Date.now().toString(36)}`;
    const filePayload = {
      name: file.name,
      type: file.type,
      size: file.size,
      buffer,
    };

    const storagePath = await storage.uploadDocument(
      session.patientId,
      sessionId,
      documentId,
      filePayload
    );

    const doc = await db.saveDocument({
      id: documentId,
      sessionId,
      patientId: session.patientId,
      fileName: file.name,
      mimeType: file.type,
      storagePath,
      documentType: category,
      uploadStatus: 'completed',
      uploadedAt: new Date().toISOString(),
      provenance: { source: 'uploaded_document' }
    });

    return NextResponse.json({ success: true, document: doc });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
