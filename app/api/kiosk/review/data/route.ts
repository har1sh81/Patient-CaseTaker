import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/supabase/db-service';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const session = await db.getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    }

    if (isSupabaseConfigured() && process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED !== 'true' && process.env.NODE_ENV !== 'development' && process.env.DEMO_ENVIRONMENT !== 'true') {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== session.patientId) {
        return NextResponse.json({ error: 'Unauthorized access to session' }, { status: 403 });
      }
    }


    const patient = session.patientId ? await db.getPatient(session.patientId) : null;
    let report = await db.getReportBySession(sessionId);
    const answers = await db.getSessionAnswers(sessionId);
    const flags = await db.getSessionFlags(sessionId);
    const timeline = await db.getTimeline(sessionId);
    const documents = await db.getSessionDocuments(sessionId);

    if (!report) {
      const { composeClinicalConsultationSummary } = await import('@/lib/reports/report-composer');
      const extractions = [];
      for (const d of (documents || [])) {
        const ext = await db.getExtraction(d.id);
        if (ext) extractions.push(ext);
      }

      const activePatient = patient || {
        id: session.patientId || 'pat_demo',
        demographics: { firstName: 'Patient', fullName: 'Kiosk Patient', age: 35, gender: 'other' },
        identification: {},
        createdAt: new Date().toISOString(),
      };

      const summary = composeClinicalConsultationSummary({
        session,
        patient: activePatient,
        answers: answers || [],
        flags: flags || [],
        timelineEvents: [],
        documents: extractions,
      });

      const draftReport: any = {
        reportId: `rep_${sessionId}`,
        reportVersion: '1.0.0',
        generatedAt: new Date().toISOString(),
        sessionId,
        patient: {
          fullName: activePatient.demographics?.fullName || 'Kiosk Patient',
          age: activePatient.demographics?.age,
          gender: activePatient.demographics?.gender,
          hospitalNumber: activePatient.identification?.hospitalNumber,
          abhaReference: activePatient.identification?.abhaReference,
        },
        visit: {
          generatedDate: new Date().toISOString().split('T')[0],
          departmentMode: session.departmentMode,
          intakeLanguage: session.language || (session as any).preferredLanguage || 'en',
          reasonForVisit: summary.chiefComplaint.primaryComplaint,
        },
        clinicalHistory: {
          chiefComplaint: {
            primaryComplaint: summary.chiefComplaint.primaryComplaint,
            additionalComplaints: [],
            provenance: { source: 'patient_voice' },
          },
          historyOfPresentIllness: {
            patientNarrative: summary.chiefComplaint.patientWords || summary.chiefComplaint.primaryComplaint,
            completeness: { missingFields: summary.informationNotReported, completedFields: ['primaryComplaint'] },
          },
          pastMedicalHistory: summary.relevantPreviousHistory.map((h: any, idx: number) => ({
            id: `pmh_${idx}`,
            conditionName: h.conditionName,
            status: 'active' as const,
            provenance: { source: 'patient_voice' },
          })),
          pastSurgicalHistory: [],
          medications: summary.medications.map((m: any, idx: number) => ({
            id: `med_${idx}`,
            name: m.medicationName,
            status: 'active' as const,
            provenance: { source: 'patient_voice' },
          })),
          allergies: [],
          familyHistory: [],
        },
        documentSummary: {
          uploadedDocumentCount: extractions.length,
          documents: extractions.map((d: any) => ({ id: d.documentId, type: d.documentType, fileName: d.documentId })),
          extractedConditions: extractions.flatMap((d: any) => d.extractedConditions || []),
          laboratoryResults: [],
          admissions: [],
        },
        medicalTimeline: [],
        attentionFlags: flags,
        patientConfirmation: {
          confirmedByPatient: false,
          confirmedAt: '',
          correctionsMade: 0,
        },
        physicianVerification: {
          status: 'pending_physician_review',
          signatureRequired: false,
        },
        reference: {
          referenceNumber: summary.reference.referenceNumber,
          qrPayload: summary.reference.qrPayload,
          generatedAt: summary.reference.generatedAt,
        },
      };

      await db.saveReport(draftReport);
      report = draftReport;
    }

    // Filter flags to just show there are flags, without clinical logic
    const hasAttentionFlags = (flags || []).some(f => f.status === 'active' && (f.severity === 'high' || f.severity === 'critical'));

    return NextResponse.json({
      session,
      patient,
      report,
      answers,
      timeline,
      documents,
      hasAttentionFlags,
    });
  } catch (error: any) {
    console.error('Failed to fetch review data:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message || String(error) }, { status: 500 });
  }
}
