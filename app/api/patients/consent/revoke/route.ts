import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logConsentAudit } from '@/lib/consent/consent-service';

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

    const { consentId } = body || {};

    if (!consentId || typeof consentId !== 'string' || !consentId.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'consentId is required.' } },
        { status: 400 }
      );
    }

    const cleanConsentId = consentId.trim();
    const supabase = await createClient();

    // 1. Fetch existing consent record
    const { data: existing, error: fetchErr } = await supabase
      .from('patient_consents')
      .select('*')
      .eq('id', cleanConsentId)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json(
        { success: false, error: { code: 'CONSENT_NOT_FOUND', message: 'Consent record not found.' } },
        { status: 404 }
      );
    }

    // 2. Mark consent as revoked and record withdrawn_at timestamp
    const nowIso = new Date().toISOString();
    const { data: updated, error: updateErr } = await supabase
      .from('patient_consents')
      .update({
        status: 'revoked',
        withdrawn_at: nowIso,
        accepted: false,
      })
      .eq('id', cleanConsentId)
      .select()
      .single();

    if (updateErr || !updated) {
      console.error('[Revoke Consent API] Update failed:', updateErr?.message);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to revoke consent.' } },
        { status: 500 }
      );
    }

    // 3. Log Audit Event
    await logConsentAudit('consent_revoked', updated.patient_id, {
      consent_id: updated.id,
      version: updated.consent_version,
      withdrawn_at: updated.withdrawn_at,
    });

    // 4. Return success response
    return NextResponse.json(
      {
        success: true,
        revoked: true,
        consent: {
          id: updated.id,
          patientId: updated.patient_id,
          consentVersion: updated.consent_version,
          status: updated.status,
          accepted: updated.accepted,
          withdrawnAt: updated.withdrawn_at,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[Revoke Consent API] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' } },
      { status: 500 }
    );
  }
}
