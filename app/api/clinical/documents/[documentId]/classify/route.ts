import { NextResponse } from 'next/server';
import {
  classifyMedicalDocument,
  getDocumentClassification,
} from '@/lib/clinical/documents/classification/classification-service';

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
      // Empty body allowed
    }

    const patientId = body?.patientId;
    const forceReclassify = !!body?.forceReclassify;

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'documentId parameter is required' },
        { status: 400 }
      );
    }

    const processRes = await classifyMedicalDocument(documentId, patientId, { forceReclassify });

    if (!processRes.success || !processRes.result) {
      let status = 400;
      if (processRes.errorCode === 'CONSENT_DENIED' || processRes.errorCode === 'UNAUTHORIZED') {
        status = 403;
      }
      if (processRes.errorCode === 'NOT_FOUND') status = 404;
      if (processRes.errorCode === 'CLASSIFICATION_FAILED' || processRes.errorCode === 'DB_ERROR') {
        status = 500;
      }

      return NextResponse.json(
        {
          success: false,
          documentId: processRes.documentId,
          error: processRes.error,
          errorCode: processRes.errorCode,
        },
        { status }
      );
    }

    const res = processRes.result;

    return NextResponse.json(
      {
        success: true,
        documentId: processRes.documentId,
        predictedDocumentType: res.predictedDocumentType,
        confidence: res.confidence,
        method: res.method,
        classifierVersion: res.classifierVersion,
        evidence: res.evidence,
        matchedKeywords: res.matchedKeywords,
        needsReview: res.needsReview,
        manualDocumentType: res.manualDocumentType,
        matchesManualType: res.matchesManualType,
        classifiedAt: res.classifiedAt,
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

    const processRes = await getDocumentClassification(documentId, patientId);

    if (!processRes.success || !processRes.result) {
      let status = 400;
      if (processRes.errorCode === 'CONSENT_DENIED' || processRes.errorCode === 'UNAUTHORIZED') {
        status = 403;
      }
      if (processRes.errorCode === 'NOT_FOUND') status = 404;

      return NextResponse.json(
        {
          success: false,
          documentId: processRes.documentId,
          error: processRes.error,
          errorCode: processRes.errorCode,
        },
        { status }
      );
    }

    const res = processRes.result;

    return NextResponse.json(
      {
        success: true,
        documentId: processRes.documentId,
        predictedDocumentType: res.predictedDocumentType,
        confidence: res.confidence,
        method: res.method,
        classifierVersion: res.classifierVersion,
        evidence: res.evidence,
        matchedKeywords: res.matchedKeywords,
        needsReview: res.needsReview,
        manualDocumentType: res.manualDocumentType,
        matchesManualType: res.matchesManualType,
        classifiedAt: res.classifiedAt,
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
