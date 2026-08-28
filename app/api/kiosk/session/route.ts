import { NextResponse } from 'next/server';
import { db } from '../../../../lib/supabase/db-service';
import { Consent, IntakeSession } from '../../../../types';

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

    // 1. Ensure patient exists in repository
    let existingPatient = await db.getPatient(patient.id);
    if (!existingPatient) {
      existingPatient = await db.createPatient(patient);
    }

    // 2. Initialize Intake Session
    const sessionId = `ses_${Math.random().toString(36).substring(2, 11)}`;
    const consentId = `con_${sessionId.substring(4)}`;

    const session: IntakeSession = {
      id: sessionId,
      patientId: existingPatient.id,
      status: 'active',
      language: language || 'en',
      departmentMode: departmentMode || 'standard',
      consentId: consentId,
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

    return NextResponse.json({
      success: true,
      patient: existingPatient,
      session,
      consent,
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || 'Session creation failed' },
      { status: 500 }
    );
  }
}
