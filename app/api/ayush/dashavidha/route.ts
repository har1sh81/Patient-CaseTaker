import { NextResponse } from 'next/server';
import { saveDashavidhaAssessment } from '@/lib/clinical/ayush/dashavidha-service';

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { patientId, encounterId, domains } = body || {};

    if (!patientId || !encounterId) {
      return NextResponse.json(
        { success: false, error: 'patientId and encounterId are required' },
        { status: 400 }
      );
    }

    const result = await saveDashavidhaAssessment({
      patientId,
      encounterId,
      domains,
    });

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
