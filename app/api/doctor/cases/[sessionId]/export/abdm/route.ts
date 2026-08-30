import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/supabase/db-service';
import { mapToFHIRBundle } from '@/lib/fhir/mapper';
import { getHealthRecordProvider } from '@/lib/abdm/factory';
import { randomUUID } from 'crypto';

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const isMockOrDemo = process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED === 'true' || process.env.DEMO_ENVIRONMENT === 'true';
    if (!isMockOrDemo) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.app_metadata?.role !== 'doctor') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const { sessionId } = await context.params;
    
    const existing = await db.getExportRecords(sessionId);
    const existingAbdm = existing.find((r: any) => r.exportType === 'fhir_abdm' && r.status === 'sent');
    if (existingAbdm) {
      return NextResponse.json({ success: true, record: existingAbdm, cached: true });
    }

    const session = await db.getSession(sessionId);
    if (!session || session.status !== 'finalized') {
      return NextResponse.json({ error: 'Export rejected: Session is not finalized.' }, { status: 403 });
    }

    const reportId = session.handoffSnapshotId || sessionId;
    let report = await db.getReport(reportId);
    if (!report) report = await db.getReportBySession(sessionId);

    if (!report || (report.physicianVerification.status !== 'verified' && report.physicianVerification.status !== 'corrected')) {
      return NextResponse.json({ error: 'Export rejected: Report has not been verified.' }, { status: 403 });
    }

    const fhirBundle = mapToFHIRBundle(session, report);

    const provider = getHealthRecordProvider();
    
    try {
      // Attempt publish
      const result = await provider.publishRecord(fhirBundle);
      
      const record = await db.saveExportRecord({
        id: `exp_abdm_${randomUUID()}`,
        sessionId,
        reportId: report.reportId,
        exportType: 'fhir_abdm',
        status: result.success ? 'sent' : 'failed',
        externalReferenceId: result.externalId,
        provider: 'MockABDMProvider',
        failureReason: result.error,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: result.success, record });
    } catch (err: any) {
      const record = await db.saveExportRecord({
        id: `exp_abdm_${randomUUID()}`,
        sessionId,
        reportId: report.reportId,
        exportType: 'fhir_abdm',
        status: 'failed',
        provider: 'MockABDMProvider',
        failureReason: err.message || 'Unknown network error',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: false, record, error: err.message }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Failed to export to ABDM:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
