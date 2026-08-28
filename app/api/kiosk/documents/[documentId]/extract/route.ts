import { NextRequest, NextResponse } from 'next/server';
import { db, isSessionExpired } from '../../../../../../lib/supabase/db-service';
import { getExtractionProvider } from '../../../../../../lib/extraction';

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

    // 1. Validate session
    const session = await db.getSession(sessionId);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
    }
    if (session.status !== 'active' || isSessionExpired(session)) {
      return NextResponse.json({ success: false, error: 'Session is inactive or expired.' }, { status: 403 });
    }

    // 2. Validate document ownership
    const document = await db.getDocument(documentId);
    if (!document || document.sessionId !== session.id) {
      return NextResponse.json({ success: false, error: 'Document not found or access denied.' }, { status: 404 });
    }

    // 3. Get OCR Response
    const ocrResponse = await db.getOcrResponse(documentId);
    if (!ocrResponse) {
      return NextResponse.json({ success: false, error: 'OCR data not found. Please run text extraction first.' }, { status: 400 });
    }

    if (ocrResponse.status === 'failed') {
      return NextResponse.json({ success: false, error: 'Cannot extract from failed OCR data.' }, { status: 400 });
    }

    // 4. Audit Log Extraction Started
    await db.saveAuditLog({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      action: retry ? 'clinical_extraction_retry' : 'clinical_extraction_started',
      entityType: 'system',
      entityId: 'extraction_service',
      sessionId: session.id,
      timestamp: new Date().toISOString(),
      metadata: { targetResource: 'medical_document', targetId: documentId, retry },
    });

    // 5. Invoke Extraction Provider
    const provider = getExtractionProvider();
    const result = await provider.extractClinicalInfo(documentId, ocrResponse.rawText, {
      documentType: document.documentType,
      documentDate: document.documentDate,
      // Pass language hints if we add them to document metadata in the future
    });

    // 6. Save Extraction Result
    const savedResult = await db.saveExtraction(result);

    // 7. Audit Log Extraction Completed/Failed
    const auditAction = (savedResult.extractionStatus === 'completed' || savedResult.extractionStatus === 'requires_review')
      ? (savedResult.extractionStatus === 'completed' ? 'clinical_extraction_completed' : 'clinical_extraction_requires_review')
      : 'clinical_extraction_failed';

    await db.saveAuditLog({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      action: auditAction,
      entityType: 'system',
      entityId: 'extraction_service',
      sessionId: session.id,
      timestamp: new Date().toISOString(),
      metadata: { targetResource: 'extraction_result', targetId: documentId, status: savedResult.extractionStatus, confidence: savedResult.confidence },
    });

    return NextResponse.json({ success: true, extraction: savedResult });

  } catch (error) {
    console.error('[Extraction Route] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
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
    const sessionId = req.nextUrl.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID is required.' }, { status: 400 });
    }

    // 1. Validate session
    const session = await db.getSession(sessionId);
    if (!session || session.status !== 'active' || isSessionExpired(session)) {
      return NextResponse.json({ success: false, error: 'Session invalid or expired.' }, { status: 403 });
    }

    // 2. Validate document
    const document = await db.getDocument(documentId);
    if (!document || document.sessionId !== session.id) {
      return NextResponse.json({ success: false, error: 'Document not found or access denied.' }, { status: 404 });
    }

    // 3. Fetch Extraction
    const extraction = await db.getExtraction(documentId);

    if (!extraction) {
      return NextResponse.json({ success: true, extraction: null });
    }

    return NextResponse.json({ success: true, extraction });

  } catch (error) {
    console.error('[Extraction GET Route] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
