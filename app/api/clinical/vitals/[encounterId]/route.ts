import { NextResponse } from 'next/server';
import { getEncounterVitals } from '@/lib/clinical/vitals/vitals-service';

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

    const result = await getEncounterVitals(encounterId);

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
