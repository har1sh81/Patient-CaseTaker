import { NextResponse } from 'next/server';
import {
  ocrDocument,
  getDocumentOcr,
} from '@/lib/clinical/documents/ocr/ocr-service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Empty or non-JSON body allowed
    }

    const patientId = body?.patientId;
    const forceRetry = !!body?.forceRetry;
    const mode = body?.mode as 'standard' | 'handwritten' | 'multilingual' | undefined;
    const language = body?.language as string | undefined;

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'documentId parameter is required' },
        { status: 400 }
      );
    }

    const result = await ocrDocument(documentId, patientId, { forceRetry, mode, language });

    if (!result.success) {
      let status = 400;
      if (result.errorCode === 'CONSENT_DENIED' || result.errorCode === 'UNAUTHORIZED') status = 403;
      if (result.errorCode === 'NOT_FOUND') status = 404;
      if (result.errorCode === 'STORAGE_ERROR' || result.errorCode === 'DB_ERROR' || result.errorCode === 'OCR_FAILED') {
        status = 500;
      }

      return NextResponse.json(
        {
          success: false,
          documentId: result.documentId,
          ocrStatus: result.ocrStatus,
          error: result.error,
          errorCode: result.errorCode,
        },
        { status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        documentId: result.documentId,
        ocrStatus: result.ocrStatus,
        extraction: result.extraction,
        rawText: result.rawText,
        pages: result.pages,
        provider: result.provider,
        extractionMethod: result.extractionMethod,
        confidence: result.confidence,
        comparison: result.comparison,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId') || undefined;

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'documentId parameter is required' },
        { status: 400 }
      );
    }

    const result = await getDocumentOcr(documentId, patientId);

    if (!result.success) {
      let status = 400;
      if (result.errorCode === 'CONSENT_DENIED' || result.errorCode === 'UNAUTHORIZED') status = 403;
      if (result.errorCode === 'NOT_FOUND') status = 404;

      return NextResponse.json(
        { success: false, error: result.error, errorCode: result.errorCode },
        { status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        documentId: result.documentId,
        ocrStatus: result.ocrStatus,
        extraction: result.extraction,
        rawText: result.rawText,
        provider: result.provider,
        extractionMethod: result.extractionMethod,
        confidence: result.confidence,
        comparison: result.comparison,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
