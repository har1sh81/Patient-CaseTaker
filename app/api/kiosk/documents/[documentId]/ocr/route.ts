import { NextRequest, NextResponse } from 'next/server';
import { db, isSessionExpired } from '../../../../../../lib/supabase/db-service';
import { getOCRProvider } from '../../../../../../lib/ocr';
import { storage } from '../../../../../../lib/supabase/storage';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const body = await req.json();
    const sessionId = body.sessionId;
    const retry = req.nextUrl.searchParams.get('retry') === 'true';

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID is required.' }, { status: 400 });
    }

    // 1. Validate active session
    const session = await db.getSession(sessionId);
    if (!session || session.status !== 'active' || isSessionExpired(session)) {
      return NextResponse.json({ success: false, error: 'Invalid or expired session.' }, { status: 403 });
    }

    // 2. Validate document ownership
    const document = await db.getDocument(documentId);
    if (!document || document.sessionId !== sessionId) {
      return NextResponse.json({ success: false, error: 'Document not found or access denied.' }, { status: 404 });
    }

    // 3. Check for existing completed OCR (unless retrying)
    if (!retry) {
      const existingOcr = await db.getOcrResponse(documentId);
      if (existingOcr && existingOcr.status === 'completed') {
        return NextResponse.json({ success: true, ocr: existingOcr });
      }
    }

    // 4. Update initial status to processing
    await db.saveOcrResponse({
      documentId,
      rawText: '',
      pages: [],
      confidence: 'unknown',
      status: 'processing',
    });

    await db.saveAuditLog({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      action: retry ? 'document_ocr_retry' : 'document_ocr_started',
      entityType: 'patient',
      entityId: session.patientId,
      sessionId: session.id,
      timestamp: new Date().toISOString(),
      metadata: { targetResource: 'medical_document', targetId: documentId, retry },
    });

    // 5. Download document from storage
    if (!document.storagePath) {
      const errorMsg = 'Document storage path is missing.';
      const failedResp = await db.saveOcrResponse({
        documentId,
        rawText: '',
        pages: [],
        confidence: 'unknown',
        status: 'failed',
        error: errorMsg,
      });
      return NextResponse.json({ success: false, error: errorMsg, ocr: failedResp }, { status: 400 });
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = await storage.downloadDocument(document.storagePath);
    } catch {
      const failedResp = await db.saveOcrResponse({
        documentId,
        rawText: '',
        pages: [],
        confidence: 'unknown',
        status: 'failed',
        error: 'Failed to download document for OCR.',
      });
      return NextResponse.json({ success: false, error: 'Storage download failed.', ocr: failedResp }, { status: 500 });
    }

    // 6. Invoke OCR Provider
    const ocrProvider = getOCRProvider();
    
    // Optional: map session language to hints
    const languageHints = session.language ? [session.language] : undefined;

    const ocrResult = await ocrProvider.processDocument(
      documentId,
      fileBuffer,
      document.mimeType,
      languageHints
    );

    // 7. Save and return response
    const savedResult = await db.saveOcrResponse(ocrResult);

    const auditAction = savedResult.status === 'completed' 
      ? 'document_ocr_completed' 
      : 'document_ocr_failed';

    await db.saveAuditLog({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      action: auditAction,
      entityType: 'system',
      entityId: 'ocr_service',
      sessionId: session.id,
      timestamp: new Date().toISOString(),
      metadata: { targetResource: 'ocr_response', targetId: documentId, status: savedResult.status, confidence: savedResult.confidence },
    });

    return NextResponse.json({ success: true, ocr: savedResult });
  } catch {
    console.error('Error starting OCR process:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during OCR.' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    // We expect sessionId as a query parameter for GET
    const sessionId = req.nextUrl.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID is required.' }, { status: 400 });
    }

    // 1. Validate session
    const session = await db.getSession(sessionId);
    if (!session || session.status !== 'active' || isSessionExpired(session)) {
      return NextResponse.json({ success: false, error: 'Invalid or expired session.' }, { status: 403 });
    }

    // 2. Validate document ownership
    const document = await db.getDocument(documentId);
    if (!document || document.sessionId !== sessionId) {
      return NextResponse.json({ success: false, error: 'Document not found or access denied.' }, { status: 404 });
    }

    // 3. Get OCR status
    const ocr = await db.getOcrResponse(documentId);
    if (!ocr) {
      return NextResponse.json({ success: true, ocr: null });
    }

    return NextResponse.json({ success: true, ocr });
  } catch (error) {
    console.error('[OCR API GET] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error fetching OCR.' },
      { status: 500 }
    );
  }
}
