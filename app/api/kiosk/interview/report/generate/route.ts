import { NextResponse } from 'next/server';
import { db, isSessionExpired } from '../../../../../../lib/supabase/db-service';
import { getAIProvider } from '../../../../../../lib/ai/factory';
import { ReportGenerationRequest } from '../../../../../../types';

export async function POST(request: Request) {
  try {
    const { sessionId, patientId } = await request.json();

    if (!sessionId || !patientId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const session = await db.getSession(sessionId);
    if (!session || session.patientId !== patientId) {
      return NextResponse.json({ success: false, error: 'Invalid session context' }, { status: 403 });
    }
    
    if (session.status !== 'active' && session.status !== 'completed') {
      return NextResponse.json({ success: false, error: 'Session is not in a valid state' }, { status: 403 });
    }

    if (isSessionExpired(session)) {
      return NextResponse.json({ success: false, error: 'Session has expired' }, { status: 403 });
    }

    const patient = await db.getPatient(patientId);
    if (!patient) {
      return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
    }

    // Audit log: Generation Started
    await db.saveAuditLog({
      id: crypto.randomUUID(),
      sessionId,
      entityType: 'patient',
      entityId: patientId,
      metadata: { resource: 'clinical_history_report' },
      action: 'history_generation_started',
      timestamp: new Date().toISOString(),
      details: 'Initiated final clinical history generation.'
    } as unknown as Parameters<typeof db.saveAuditLog>[0]);

    // 1. Fetch All Sources
    const answers = await db.getSessionAnswers(sessionId);
    
    // ABDM Clinical History might be present
    const abdmHistory = await db.getClinicalHistory(sessionId);
    
    const documents = await db.getSessionDocuments(sessionId);
    const extractions = [];
    for (const doc of documents) {
      const ext = await db.getExtraction(doc.id);
      if (ext) extractions.push(ext);
    }
    
    const timeline = await db.getTimeline(sessionId);
    const flags = await db.getSessionFlags(sessionId);

    // 2. Assemble Request Payload
    const genRequest: ReportGenerationRequest = {
      session,
      patient,
      answers,
      timeline: timeline ? timeline.records : [],
      clinicalHistory: abdmHistory || undefined,
      documents: extractions,
      flags,
      patientReview: {
        sessionId,
        sections: [],
        status: 'pending'
      }
    };

    // 3. AI Orchestration
    const provider = getAIProvider();
    const response = await provider.generateClinicalHistoryDraft(genRequest);

    // 4. Persistence
    await db.saveReport(response.report);

    // Audit log: Generation Completed
    await db.saveAuditLog({
      id: crypto.randomUUID(),
      sessionId,
      entityType: 'patient',
      entityId: patientId,
      metadata: { resource: 'clinical_history_report', resourceId: response.report.reportId },
      action: 'history_generation_completed',
      timestamp: new Date().toISOString(),
      details: 'Generated draft report.'
    } as unknown as Parameters<typeof db.saveAuditLog>[0]);

    return NextResponse.json({
      success: true,
      report: response.report,
      validation: response.validation
    });
  } catch (error) {
    console.error('Report Generation Error:', error);
    const err = error as Error;

    return NextResponse.json(
      { success: false, error: err.message || 'Generation failed' },
      { status: 500 }
    );
  }
}
