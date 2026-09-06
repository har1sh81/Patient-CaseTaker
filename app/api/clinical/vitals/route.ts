import { NextResponse } from 'next/server';
import { saveVitalRecord, getLatestVitalsForPatient } from '@/lib/clinical/vitals/vitals-service';

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request body' },
        { status: 400 }
      );
    }

    const { patientId, encounterId, vitals } = body || {};

    if (!patientId || !encounterId) {
      return NextResponse.json(
        { success: false, error: 'patientId and encounterId are required' },
        { status: 400 }
      );
    }

    if (!vitals || typeof vitals !== 'object') {
      return NextResponse.json(
        { success: false, error: 'vitals object is required' },
        { status: 400 }
      );
    }

    const result = await saveVitalRecord(patientId, encounterId, vitals);

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
      { status: result.statusCode || 201 }
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

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: 'patientId query parameter is required' },
        { status: 400 }
      );
    }

    const result = await getLatestVitalsForPatient(patientId);

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
