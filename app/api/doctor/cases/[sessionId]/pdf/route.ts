import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/db-service';
import { getClinicalSummaryPDF, storeClinicalSummaryPDF } from '@/lib/reports/pdf-storage';
import { composeClinicalConsultationSummary } from '@/lib/reports/report-composer';
import { generateClinicalSummaryPDFBuffer } from '@/lib/reports/pdf-generator';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const session = await db.getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Try fetching existing PDF snapshot
    let pdfBuffer = await getClinicalSummaryPDF(sessionId);

    // If PDF snapshot is missing, generate on demand from authoritative report data
    if (!pdfBuffer) {
      const patient = await db.getPatient(session.patientId!) || {
        id: session.patientId || 'pat_demo',
        demographics: { firstName: 'Patient', fullName: 'Kiosk Patient', age: 35, gender: 'other' },
        identification: {},
        createdAt: new Date().toISOString(),
      };
      const answers = await db.getSessionAnswers(sessionId);
      const flags = await db.getSessionFlags(sessionId);
      const timeline = await db.getTimeline(sessionId);
      const documents = await db.getSessionDocuments(sessionId);
      const extractions = [];
      for (const d of documents) {
        const ext = await db.getExtraction(d.id);
        if (ext) extractions.push(ext);
      }

      const summary = composeClinicalConsultationSummary({
        session,
        patient,
        answers,
        flags,
        timelineEvents: [],
        documents: extractions,
      });

      pdfBuffer = await generateClinicalSummaryPDFBuffer(summary);
      await storeClinicalSummaryPDF(sessionId, pdfBuffer);
    }

    const searchParams = new URL(request.url).searchParams;
    const download = searchParams.get('download') === 'true';
    const filename = `Clinical_Summary_${sessionId.slice(-6)}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': download
          ? `attachment; filename="${filename}"`
          : `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err: unknown) {
    console.error('Failed to serve PDF:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
