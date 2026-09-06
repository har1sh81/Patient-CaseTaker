import { NextResponse } from 'next/server';
import {
  uploadMedicalDocument,
  listPatientDocuments,
} from '@/lib/clinical/documents/document-storage-service';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    let patientId: string | null = null;
    let encounterId: string | null = null;
    let documentType: string | null = null;
    let title: string | null = null;
    let documentDate: string | null = null;
    let fileName: string | null = null;
    let fileBuffer: Buffer | null = null;
    let mimeType: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      patientId = formData.get('patientId') as string | null;
      encounterId = formData.get('encounterId') as string | null;
      documentType = (formData.get('documentType') as string | null) || 'miscellaneous';
      title = formData.get('title') as string | null;
      documentDate = formData.get('documentDate') as string | null;

      const fileEntry = formData.get('file');
      if (fileEntry && typeof fileEntry === 'object' && 'arrayBuffer' in fileEntry) {
        const fileObj = fileEntry as File;
        fileName = fileObj.name;
        mimeType = fileObj.type || 'application/pdf';
        const arrayBuf = await fileObj.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuf);
      }
    } else {
      // Fallback for JSON body testing if buffer passed as base64 or inline string
      let body: any;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid request format. Expected multipart/form-data or valid JSON' },
          { status: 400 }
        );
      }

      patientId = body?.patientId;
      encounterId = body?.encounterId;
      documentType = body?.documentType || 'miscellaneous';
      title = body?.title;
      documentDate = body?.documentDate;
      fileName = body?.fileName;
      mimeType = body?.mimeType || 'application/pdf';
      if (body?.fileBuffer) {
        fileBuffer = Buffer.isBuffer(body.fileBuffer)
          ? body.fileBuffer
          : Buffer.from(body.fileBuffer, typeof body.fileBuffer === 'string' ? 'base64' : undefined);
      }
    }

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: 'patientId is required' },
        { status: 400 }
      );
    }

    if (!fileBuffer || !fileName) {
      return NextResponse.json(
        { success: false, error: 'Medical document file is required' },
        { status: 400 }
      );
    }

    const result = await uploadMedicalDocument({
      patientId,
      encounterId: encounterId || undefined,
      documentType: documentType || 'miscellaneous',
      fileName,
      fileBuffer,
      mimeType: mimeType || 'application/pdf',
      title: title || undefined,
      documentDate: documentDate || undefined,
    });

    if (!result.success) {
      let status = 400;
      if (result.errorCode === 'CONSENT_DENIED') status = 403;
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
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const encounterId = searchParams.get('encounterId') || undefined;
    const documentType = searchParams.get('documentType') || undefined;

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: 'patientId query parameter is required' },
        { status: 400 }
      );
    }

    const result = await listPatientDocuments(patientId, {
      encounterId,
      documentType,
    });

    if (!result.success) {
      let status = 400;
      if (result.errorCode === 'CONSENT_DENIED') status = 403;
      if (result.errorCode === 'DB_ERROR') status = 500;

      return NextResponse.json(
        { success: false, error: result.error, errorCode: result.errorCode },
        { status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        documents: result.documents,
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
