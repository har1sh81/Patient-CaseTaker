import { NextResponse } from 'next/server';
import { getDashavidhaAssessment, verifyDashavidhaDomain } from '@/lib/clinical/ayush/dashavidha-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ encounterId: string }> | { encounterId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const encounterId = resolvedParams.encounterId;

    if (!encounterId) {
      return NextResponse.json(
        { success: false, error: 'encounterId is required' },
        { status: 400 }
      );
    }

    const result = await getDashavidhaAssessment(encounterId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.statusCode || 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ encounterId: string }> | { encounterId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const encounterId = resolvedParams.encounterId;

    if (!encounterId) {
      return NextResponse.json(
        { success: false, error: 'encounterId is required' },
        { status: 400 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { domainName, status, clinicianNotes } = body || {};

    if (!domainName || !status) {
      return NextResponse.json(
        { success: false, error: 'domainName and status are required' },
        { status: 400 }
      );
    }

    const result = await verifyDashavidhaDomain(
      encounterId,
      domainName,
      status,
      clinicianNotes
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.statusCode || 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
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
