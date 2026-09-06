import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Allowed external identifier types
const SUPPORTED_IDENTIFIER_TYPES = new Set([
  'abha_number',
  'abha_address',
  'hospital_number',
  'national_health_id',
]);

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid JSON request body.',
          },
        },
        { status: 400 }
      );
    }

    const { identifierType, identifierValue } = body || {};

    // 1. Validate identifierType presence
    if (!identifierType || typeof identifierType !== 'string' || !identifierType.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'identifierType is required.',
          },
        },
        { status: 400 }
      );
    }

    const cleanType = identifierType.trim();

    // 2. Validate identifierType support
    if (!SUPPORTED_IDENTIFIER_TYPES.has(cleanType)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNSUPPORTED_IDENTIFIER_TYPE',
            message: `Unsupported identifier type '${cleanType}'. Supported types are: abha_number, abha_address, hospital_number.`,
          },
        },
        { status: 400 }
      );
    }

    // 3. Validate identifierValue presence and non-emptiness
    if (!identifierValue || typeof identifierValue !== 'string' || !identifierValue.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'identifierValue is required and cannot be empty.',
          },
        },
        { status: 400 }
      );
    }

    const cleanValue = identifierValue.trim();

    // 4. Query Supabase for matching identifier linked to patient demographics
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('patient_external_identifiers')
      .select(`
        id,
        identifier_type,
        identifier_value,
        verification_status,
        patient_id,
        patients!inner (
          id,
          first_name,
          last_name,
          full_name,
          date_of_birth,
          gender,
          preferred_language
        )
      `)
      .eq('identifier_type', cleanType)
      .eq('identifier_value', cleanValue);

    if (error) {
      console.error('[Patient Identification API] Database query error:', error.message);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An internal server error occurred while looking up patient.',
          },
        },
        { status: 500 }
      );
    }

    // 5. Identifier not found -> 404
    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PATIENT_NOT_FOUND',
            message: 'No patient matched the supplied identifier.',
          },
        },
        { status: 404 }
      );
    }

    // 6. Multiple records matched -> 409 Conflict
    if (data.length > 1) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MULTIPLE_PATIENTS_MATCHED',
            message: 'Multiple patient records matched the supplied identifier.',
          },
        },
        { status: 409 }
      );
    }

    const match = data[0];
    const patientRecord = Array.isArray(match.patients) ? match.patients[0] : match.patients;

    if (!patientRecord) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PATIENT_NOT_FOUND',
            message: 'Matched identifier has no valid associated patient record.',
          },
        },
        { status: 404 }
      );
    }

    // 7. Successful identification response (HTTP 200)
    return NextResponse.json(
      {
        success: true,
        patient: {
          id: patientRecord.id,
          name: patientRecord.full_name || `${patientRecord.first_name || ''} ${patientRecord.last_name || ''}`.trim(),
          dateOfBirth: patientRecord.date_of_birth || null,
          gender: patientRecord.gender ? patientRecord.gender.toLowerCase() : null,
          preferredLanguage: patientRecord.preferred_language || 'en',
        },
        matchedIdentifier: {
          type: match.identifier_type,
          value: match.identifier_value,
          verified: match.verification_status === 'verified',
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[Patient Identification API] Unexpected error:', err);
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
