/**
 * Task #33 — ABDM Status & History Service
 * MediKiosk Clinical Architecture
 * 
 * Provides exchange status polling and patient exchange history retrieval.
 */

import { createAdminClient } from '@/lib/supabase/server';
import { getAbdmTransportProvider } from './abdm-provider';
import { logAbdmAudit } from './abdm-service';
import type { AbdmExchangeRecord, AbdmTransportStatusResult, AbdmServiceResponse, AbdmEnvironment } from './types';

export async function getAbdmExchangeStatus(
  patientId: string,
  requestId: string
): Promise<AbdmServiceResponse<AbdmTransportStatusResult>> {
  if (!patientId || !requestId) {
    return { success: false, errorCode: 'INVALID_INPUT', error: 'patientId and requestId are required' };
  }

  try {
    const adminSupabase = await createAdminClient();

    // Verify exchange record exists and belongs to requested patient
    const { data: record } = await adminSupabase
      .from('abdm_exchanges')
      .select('*')
      .eq('request_id', requestId)
      .eq('patient_id', patientId)
      .maybeSingle();

    if (!record) {
      return { success: false, errorCode: 'NOT_FOUND', error: 'ABDM exchange record not found or cross-patient request' };
    }

    const env = record.environment as AbdmEnvironment;
    const provider = getAbdmTransportProvider(env);
    const statusRes = await provider.getHealthRecordStatus(requestId, env);

    // Update status in public.abdm_exchanges if changed
    if (statusRes.status !== record.status) {
      await adminSupabase
        .from('abdm_exchanges')
        .update({
          status: statusRes.status,
          response_metadata: { ...record.response_metadata, ...statusRes.metadata },
          completed_at: statusRes.status === 'completed' ? new Date().toISOString() : record.completed_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', record.id);
    }

    await logAbdmAudit('abdm_status_checked', patientId, { requestId, status: statusRes.status, environment: env });

    return {
      success: true,
      data: statusRes,
    };
  } catch (err: any) {
    console.error('[ABDM Status Service] Error checking status:', err);
    return {
      success: false,
      errorCode: 'INTERNAL_SERVER_ERROR',
      error: err.message || 'Failed to fetch ABDM exchange status',
    };
  }
}

export async function getPatientAbdmExchanges(
  patientId: string,
  options: {
    encounterId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  } = {}
): Promise<AbdmServiceResponse<{ exchanges: AbdmExchangeRecord[]; total: number }>> {
  if (!patientId) {
    return { success: false, errorCode: 'INVALID_INPUT', error: 'patientId is required' };
  }

  try {
    const adminSupabase = await createAdminClient();
    const limit = Math.min(options.limit || 20, 50);

    let query = adminSupabase
      .from('abdm_exchanges')
      .select('*', { count: 'exact' })
      .eq('patient_id', patientId)
      .order('requested_at', { ascending: false })
      .limit(limit);

    if (options.encounterId) query = query.eq('encounter_id', options.encounterId);
    if (options.status) query = query.eq('status', options.status);
    if (options.fromDate) query = query.gte('requested_at', options.fromDate);
    if (options.toDate) query = query.lte('requested_at', options.toDate);

    const { data, count, error } = await query;

    if (error) {
      console.error('[ABDM History Service] Query error:', error);
      return { success: false, errorCode: 'INTERNAL_SERVER_ERROR', error: error.message };
    }

    return {
      success: true,
      data: {
        exchanges: (data || []) as AbdmExchangeRecord[],
        total: count || (data ? data.length : 0),
      },
    };
  } catch (err: any) {
    console.error('[ABDM History Service] Exception:', err);
    return {
      success: false,
      errorCode: 'INTERNAL_SERVER_ERROR',
      error: err.message || 'Failed to query ABDM exchange history',
    };
  }
}
