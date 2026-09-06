import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SUPPORTED_PERMISSIONS, logConsentAudit } from '@/lib/consent/consent-service';

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

    const {
      patientId,
      encounterId,
      permissions,
      purpose = 'consultation',
      version = 'v1.1',
      languageCode = 'en',
      accepted = true,
      expiresAt,
    } = body || {};

    // 1. Validate patientId
    if (!patientId || typeof patientId !== 'string' || !patientId.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'patientId is required.' } },
        { status: 400 }
      );
    }

    const cleanPatientId = patientId.trim();

    // 2. Validate patient exists in database
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

    // 3. Validate permissions map
    if (!permissions || typeof permissions !== 'object') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PERMISSIONS', message: 'permissions object is required.' } },
        { status: 400 }
      );
    }

    // Filter and sanitize permission keys
    const sanitizedPermissions: Record<string, boolean> = {};
    for (const key of SUPPORTED_PERMISSIONS) {
      sanitizedPermissions[key] = Boolean(permissions[key]);
    }

    const isAccepted = Boolean(accepted);
    const nowIso = new Date().toISOString();
    const consentStatus = isAccepted ? 'accepted' : 'rejected';

    // 4. Insert new consent record
    const { data: inserted, error: insertErr } = await supabase
      .from('patient_consents')
      .insert({
        patient_id: cleanPatientId,
        encounter_id: encounterId || null,
        consent_version: version,
        language_code: languageCode,
        permissions: sanitizedPermissions,
        accepted: isAccepted,
        accepted_at: isAccepted ? nowIso : null,
        withdrawn_at: null,
        expires_at: expiresAt || null,
        purpose,
        status: consentStatus,
      })
      .select()
      .single();

    if (insertErr || !inserted) {
      console.error('[Consent API] Insert failed:', insertErr?.message);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create consent record.' } },
        { status: 500 }
      );
    }

    // 5. Log Audit Event
    await logConsentAudit('consent_created', cleanPatientId, {
      consent_id: inserted.id,
      version: inserted.consent_version,
      purpose: inserted.purpose,
      accepted: inserted.accepted,
      status: inserted.status,
    });

    // 6. Return response
    return NextResponse.json(
      {
        success: true,
        consent: {
          id: inserted.id,
          patientId: inserted.patient_id,
          encounterId: inserted.encounter_id,
          consentVersion: inserted.consent_version,
          languageCode: inserted.language_code,
          permissions: inserted.permissions,
          accepted: inserted.accepted,
          status: inserted.status,
          purpose: inserted.purpose,
          acceptedAt: inserted.accepted_at,
          expiresAt: inserted.expires_at,
          createdAt: inserted.created_at,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[Consent API] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' } },
      { status: 500 }
    );
  }
}
