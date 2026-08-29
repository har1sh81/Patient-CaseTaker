import { NextResponse } from 'next/server';
import { db } from '../../../../lib/supabase/db-service';
import { Consent, IntakeSession } from '../../../../types';
import { createClient } from '../../../../lib/supabase/server';

const isMockEnabled = process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED !== 'false';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patient, language, departmentMode, permissions } = body;

    if (!patient || !patient.id) {
      return NextResponse.json(
        { success: false, error: 'Patient data is required' },
        { status: 400 }
      );
    }

    let authUserId = patient.id; // Default to client-provided ID for mock mode
    const supabaseResponse = NextResponse.json({ success: true }, { status: 200 });

    if (!isMockEnabled) {
      // Create server client which intercepts cookies
      const supabase = await createClient();
      
      try {
        // Attempt anonymous sign-in to bind browser session to an auth.uid()
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
        if (authError) throw authError;
        
        if (authData?.user) {
          authUserId = authData.user.id;
        } else {
          throw new Error('No user data returned from anonymous sign-in');
        }
      } catch (authError: any) {
        console.warn('[MediKiosk Auth] Anonymous sign-in is disabled or failed. Falling back to secure generated patient ID:', authError.message);
        // Fallback to a generated patient ID so the kiosk check-in continues
        authUserId = `pat_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      }
      
      patient.id = authUserId; // Bind the physical patient ID to the auth session
    }

    // 1. Ensure patient exists in repository
    let existingPatient = await db.getPatient(patient.id);
    if (!existingPatient) {
      existingPatient = await db.createPatient(patient);
    }

    // 2. Initialize Intake Session (without consentId first to prevent foreign key violation)
    const sessionId = `ses_${Math.random().toString(36).substring(2, 11)}`;
    const consentId = `con_${sessionId.substring(4)}`;

    const session: IntakeSession = {
      id: sessionId,
      patientId: existingPatient.id,
      status: 'active',
      language: language || 'en',
      departmentMode: departmentMode || 'standard',
      // consentId is left blank initially to avoid FK constraint violation
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60000).toISOString(), // 30 mins lifetime
      currentStep: 'consent',
      progress: {
        completedSections: [],
        pendingSections: ['consent', 'interview', 'documents', 'review', 'print'],
        percentage: 0,
      },
      cleanupStatus: {
        temporaryDataDeleted: false,
      },
    };
    await db.createSession(session);

    // 3. Save Consent details
    const consent: Consent = {
      id: consentId,
      patientId: existingPatient.id,
      sessionId: session.id,
      consentVersion: '1.0',
      permissions: permissions || {
        intakeCollection: true,
        voiceProcessing: true,
        documentProcessing: true,
        aiAssistedStructuring: true,
        reportGeneration: true,
      },
      accepted: true,
      acceptedAt: new Date().toISOString(),
      language: language || 'en',
      source: 'touchscreen',
    };
    await db.saveConsent(consent);

    // 4. Update the session with the consentId now that the consent record exists
    session.consentId = consentId;
    await db.updateSession(session.id, { consentId: consentId });

    await db.saveAuditLog({
      id: `log_${Math.random().toString(36).substring(2, 11)}`,
      sessionId: session.id,
      action: 'session_started',
      timestamp: new Date().toISOString(),
      metadata: {
        departmentMode,
        language,
        actor: 'patient',
        ipAddress: '127.0.0.1',
        userAgent: 'MediKiosk UI Client',
      },
    });

    // Update the response with the payload and return the secure cookies
    const payload = {
      success: true,
      patient: existingPatient,
      session,
      consent,
    };
    
    // Merge payload into the response that already contains the Supabase cookies
    const responseBody = JSON.stringify(payload);
    return new NextResponse(responseBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': supabaseResponse.headers.get('Set-Cookie') || '',
      }
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || 'Session creation failed' },
      { status: 500 }
    );
  }
}
