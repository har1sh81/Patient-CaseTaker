import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasValidConsent } from '@/lib/consent/consent-service';
import { getPatientClinicalHistory, ClinicalHistoryOptions } from '@/lib/clinical/clinical-history-service';

// UUID v4 Regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;

    // 1. Validate UUID format
    if (!patientId || typeof patientId !== 'string' || !UUID_REGEX.test(patientId.trim())) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PATIENT_ID',
            message: 'Invalid patient UUID format.',
          },
        },
        { status: 400 }
      );
    }

    const cleanPatientId = patientId.trim();

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const encounterId = searchParams.get('encounterId') || undefined;
    const category = (searchParams.get('category') as any) || undefined;
    const department = (searchParams.get('department') as any) || undefined;
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;

    const options: ClinicalHistoryOptions = {
      encounterId,
      category,
      department,
      fromDate,
      toDate,
    };

    // 3. Verify Patient Exists
    const supabase = await createClient();
    const { data: patient, error: patientErr } = await supabase
      .from('patients')
      .select('id')
      .eq('id', cleanPatientId)
      .maybeSingle();

    if (patientErr || !patient) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PATIENT_NOT_FOUND',
            message: 'Patient not found.',
          },
        },
        { status: 404 }
      );
    }

    // 4. Enforce Task #6 Consent Check
    const requiredPermission =
      department === 'ayush' || category === 'ayush'
        ? 'share_ayush_records'
        : 'share_health_records';

    const isAuthorized = await hasValidConsent(cleanPatientId, requiredPermission);

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONSENT_DENIED',
            message: `Access to clinical history denied. Active consent for permission '${requiredPermission}' is required.`,
          },
        },
        { status: 403 }
      );
    }

    // 5. Retrieve Structured Clinical History
    const history = await getPatientClinicalHistory(cleanPatientId, options);

    if (!history) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to retrieve patient clinical history.',
          },
        },
        { status: 500 }
      );
    }

    // 6. Return Structured Response (HTTP 200)
    return NextResponse.json(
      {
        success: true,
        data: history,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[Clinical History API] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected internal server error occurred.',
        },
      },
      { status: 500 }
    );
  }
}
