import { NextResponse } from 'next/server';
import {
  getDocumentLabInterpretations,
  interpretDocumentLabs,
} from '@/lib/clinical/documents/extraction/labs/interpretation-service';

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
    const forceReinterpret = !!body?.forceReinterpret;

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'documentId parameter is required' },
        { status: 400 }
      );
    }

    const processRes = await interpretDocumentLabs(documentId, patientId, { forceReinterpret });

    if (!processRes.success || !processRes.data) {
      let status = 400;
      if (processRes.errorCode === 'CONSENT_DENIED' || processRes.errorCode === 'UNAUTHORIZED') {
        status = 403;
      }
      if (processRes.errorCode === 'NOT_FOUND') status = 404;
      if (processRes.errorCode === 'INTERPRETATION_FAILED' || processRes.errorCode === 'DB_ERROR') {
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

    return NextResponse.json(
      {
        success: true,
        data: processRes.data,
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

    const processRes = await getDocumentLabInterpretations(documentId, patientId);

    if (!processRes.success || !processRes.data) {
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

    return NextResponse.json(
      {
        success: true,
        data: processRes.data,
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
