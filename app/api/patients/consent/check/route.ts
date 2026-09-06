import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { evaluateConsent, SUPPORTED_PERMISSIONS, logConsentAudit } from '@/lib/consent/consent-service';

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'Invalid JSON body.' } },
        { status: 400 }
      );
    }

    const { patientId, permission } = body || {};

    // 1. Validate patientId
    if (!patientId || typeof patientId !== 'string' || !patientId.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'patientId is required.' } },
        { status: 400 }
      );
    }

    const cleanPatientId = patientId.trim();

    // 2. Validate permission key
    if (!permission || typeof permission !== 'string' || !permission.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PERMISSION', message: 'permission is required.' } },
        { status: 400 }
      );
    }

    const cleanPermission = permission.trim();

    if (!SUPPORTED_PERMISSIONS.includes(cleanPermission as any)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PERMISSION',
            message: `Unsupported permission '${cleanPermission}'. Supported permissions: ${SUPPORTED_PERMISSIONS.join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    // 3. Verify patient exists in database
    const supabase = await createClient();
    const { data: patient, error: patientErr } = await supabase
      .from('patients')
      .select('id')
      .eq('id', cleanPatientId)
      .maybeSingle();

    if (patientErr || !patient) {
      return NextResponse.json(
        { success: false, error: { code: 'PATIENT_NOT_FOUND', message: 'Patient not found.' } },
        { status: 404 }
      );
    }

    // 4. Server-side consent evaluation
    const evalResult = await evaluateConsent(cleanPatientId, cleanPermission);

    // 5. Log Audit Event
    await logConsentAudit('consent_checked', cleanPatientId, {
      permission: cleanPermission,
      allowed: evalResult.allowed,
      consent_id: evalResult.consentId || null,
    });

    // 6. Return minimal response
    return NextResponse.json(
      {
        success: true,
        allowed: evalResult.allowed,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[Consent Check API] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' } },
      { status: 500 }
    );
  }
}
