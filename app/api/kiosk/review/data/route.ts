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


    const patient = session.patientId ? await db.getPatient(session.patientId) : null;
    if (!patient) {
      return NextResponse.json({ error: 'Patient session could not be loaded.' }, { status: 404 });
    }
    let report = await db.getReportBySession(sessionId);
    const answers = await db.getSessionAnswers(sessionId);
    const flags = await db.getSessionFlags(sessionId);
    const timeline = await db.getTimeline(sessionId);
    const documents = await db.getSessionDocuments(sessionId);

    // Compose the clinical consultation summary for structured data
    const { composeClinicalConsultationSummary } = await import('@/lib/reports/report-composer');
    const extractions = [];
    for (const d of (documents || [])) {
      const ext = await db.getExtraction(d.id);
      if (ext) extractions.push(ext);
    }

    const activePatient = patient;

    const summary = composeClinicalConsultationSummary({
      session,
      patient: activePatient,
      answers: answers || [],
      flags: flags || [],
      timelineEvents: [],
      documents: extractions,
    });

    if (!report) {
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

    // Compute lightweight red flags for UI display (not using full AttentionFlag schema)
    const computedRedFlags: Array<{ id: string; level: 'critical' | 'warning' | 'info'; title: string; description: string }> = [];

    // Severe pain
    const painAns = (answers || []).find(a => a.questionId === 'pain_scale');
    if (painAns) {
      const painVal = String(painAns.rawValue || painAns.normalizedValue || '');
      const painNum = parseInt(painVal, 10);
      if (painNum >= 7 || painVal.includes('7') || painVal.includes('8') || painVal.includes('9') || painVal.includes('10')) {
        computedRedFlags.push({
          id: 'rf_severe_pain',
          level: 'critical',
          title: '⚠️ Severe Pain Reported',
          description: `Patient reported pain level ${painVal}/10. High priority consultation recommended.`,
        });
      }
    }

    // Chest/cardiac
    const hasChestMention = (answers || []).some(a =>
      String(a.rawValue || a.transcript || '').toLowerCase().match(/chest|cardiac|angina|heart/)
    );
    if (hasChestMention) {
      computedRedFlags.push({
        id: 'rf_cardiac',
        level: 'critical',
        title: '🫀 Potential Cardiac Symptom',
        description: 'Patient reported chest-related symptoms. Immediate ECG / Triage review required.',
      });
    }

    // GI red flags
    const giAns = (answers || []).find(a => a.questionId === 'gi_red_flags');
    if (giAns) {
      const giVal = String(giAns.rawValue || giAns.transcript || '').toLowerCase();
      if (giVal && giVal !== 'no' && giVal !== 'none') {
        computedRedFlags.push({
          id: 'rf_gi',
          level: 'warning',
          title: '🔴 Gastrointestinal Red Flags',
          description: `GI concern: ${giAns.rawValue || giAns.transcript}. Further investigation advised.`,
        });
      }
    }

    // DB flags
    const hasAttentionFlags = (flags || []).some(f => f.status === 'active' && (f.severity === 'high' || f.severity === 'critical'));

    // Build structured HPI for frontend
    const structuredHPI = {
      duration: summary.hpi.duration,
      location: summary.hpi.location,
      character: summary.hpi.character,
      aggravatingRelieving: summary.hpi.aggravatingRelieving,
      previousTreatments: summary.hpi.previousTreatments,
      associatedSymptoms: summary.hpi.associatedSymptoms,
      progression: summary.hpi.progression,
    };

    // Suggested doctor questions based on gaps
    const suggestedDoctorQuestions: string[] = [];
    if (!summary.hpi.location) suggestedDoctorQuestions.push('Please clarify the exact anatomical location of the symptom.');
    if (!summary.hpi.character) suggestedDoctorQuestions.push('Can you describe the character/quality of the symptom?');
    if (!summary.hpi.associatedSymptoms) suggestedDoctorQuestions.push('Are there any associated systemic symptoms?');
    if (summary.familyHistory.length === 0) suggestedDoctorQuestions.push('Does the patient have any relevant family medical history?');
    if (summary.medications.length === 0) suggestedDoctorQuestions.push('Is the patient currently taking any medications?');
    if (hasChestMention) suggestedDoctorQuestions.push('Consider immediate ECG and cardiac workup.');
    if (computedRedFlags.length > 0) suggestedDoctorQuestions.push('Red flags detected — prioritize clinical assessment.');

    return NextResponse.json({
      session,
      patient,
      report,
      answers,
      timeline,
      documents,
      hasAttentionFlags: hasAttentionFlags || computedRedFlags.length > 0,
      // New structured data for enhanced review page
      computedRedFlags,
      structuredHPI,
      chiefComplaint: summary.chiefComplaint,
      informationNotReported: summary.informationNotReported,
      suggestedDoctorQuestions,
      ayush: summary.ayush,
      referenceInfo: summary.reference,
      socialHistory: summary.socialHistory,
      familyHistory: summary.familyHistory,
      reviewOfSystems: summary.reviewOfSystems,
    });
  } catch (error: any) {
    console.error('Failed to fetch review data:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message || String(error) }, { status: 500 });
  }
}

