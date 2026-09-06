import { NextResponse } from 'next/server';
import {
  getMedicalDocumentById,
  archiveMedicalDocument,
} from '@/lib/clinical/documents/document-storage-service';

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

    const result = await getMedicalDocumentById(documentId, patientId);

    if (!result.success) {
      let status = 400;
      if (result.errorCode === 'CONSENT_DENIED' || result.errorCode === 'UNAUTHORIZED') status = 403;
      if (result.errorCode === 'NOT_FOUND') status = 404;
      if (result.errorCode === 'STORAGE_ERROR' || result.errorCode === 'DB_ERROR') status = 500;

      return NextResponse.json(
        { success: false, error: result.error, errorCode: result.errorCode },
        { status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        document: result.document,
        signedUrl: result.signedUrl,
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'documentId parameter is required' },
        { status: 400 }
      );
    }

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: 'patientId query parameter is required for document archiving' },
        { status: 400 }
      );
    }

    const result = await archiveMedicalDocument(documentId, patientId);

    if (!result.success) {
      let status = 400;
      if (result.errorCode === 'CONSENT_DENIED' || result.errorCode === 'UNAUTHORIZED') status = 403;
      if (result.errorCode === 'NOT_FOUND') status = 404;
      if (result.errorCode === 'DB_ERROR') status = 500;

      return NextResponse.json(
        { success: false, error: result.error, errorCode: result.errorCode },
        { status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        document: result.document,
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
