import { NextResponse } from 'next/server';
import { db } from '../../../../lib/supabase/db-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hospitalNumber = searchParams.get('hospitalNumber');
    const abhaReference = searchParams.get('abhaReference');
    const mobileNumber = searchParams.get('mobileNumber');

    if (hospitalNumber) {
      let patient = null;
      try { patient = await db.getPatientByHospitalNumber(hospitalNumber); } catch (e) { console.warn('[Lookup API] Error:', e); }
      if (!patient) {
        return NextResponse.json({ success: false, error: 'Patient record not found for this Hospital Number' }, { status: 404 });
      }
      return NextResponse.json({ success: true, patient });
    }

    if (abhaReference) {
      let patient = null;
      try { patient = await db.getPatientByAbha(abhaReference); } catch (e) { console.warn('[Lookup API] Error:', e); }
      if (!patient) {
        return NextResponse.json({ success: false, error: 'Patient record not found for this ABHA ID' }, { status: 404 });
      }
      return NextResponse.json({ success: true, patient });
    }

    if (mobileNumber) {
      let patient = null;
      try { patient = await db.getPatientByMobile(mobileNumber); } catch (e) { console.warn('[Lookup API] Error:', e); }
      if (!patient) {
        return NextResponse.json({ success: false, error: 'Patient record not found for this Mobile Number' }, { status: 404 });
      }
      return NextResponse.json({ success: true, patient });
    }

    return NextResponse.json({ success: false, error: 'Identification query parameter is required' }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Error querying patient directory' }, { status: 500 });
  }
}
