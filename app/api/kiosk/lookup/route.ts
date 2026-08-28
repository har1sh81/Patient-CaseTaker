import { NextResponse } from 'next/server';
import { db } from '../../../../lib/supabase/db-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hospitalNumber = searchParams.get('hospitalNumber');
    const abhaReference = searchParams.get('abhaReference');
    const mobileNumber = searchParams.get('mobileNumber');

    if (hospitalNumber) {
      const patient = await db.getPatientByHospitalNumber(hospitalNumber);
      return NextResponse.json({ success: true, patient });
    }

    if (abhaReference) {
      const patient = await db.getPatientByAbha(abhaReference);
      return NextResponse.json({ success: true, patient });
    }

    if (mobileNumber) {
      const patient = await db.getPatientByMobile(mobileNumber);
      return NextResponse.json({ success: true, patient });
    }

    return NextResponse.json(
      { success: false, error: 'Missing identifier parameter' },
      { status: 400 }
    );
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || 'Lookup operation failed' },
      { status: 500 }
    );
  }
}
