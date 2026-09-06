/**
 * Task #31 — Directed Provenance Links Layer
 * MediKiosk Clinical Architecture
 * 
 * Manages directed provenance graph edges in public.clinical_provenance_links.
 * Guarantees idempotency via unique constraints.
 */

import { createAdminClient } from '@/lib/supabase/server';
import type { ProvenanceLink } from './types';

/**
 * Persists a directed provenance link in public.clinical_provenance_links.
 * Idempotent: duplicate identical links are ignored via ON CONFLICT.
 */
export async function registerProvenanceLink(link: ProvenanceLink): Promise<{ success: boolean; linkId?: string; error?: string }> {
  if (!link.patientId || !link.fromType || !link.fromId || !link.toType || !link.toId || !link.relationship) {
    return { success: false, error: 'Missing required link parameters' };
  }

  try {
    const supabase = await createAdminClient();

    // Check unique constraint via upsert / ignore duplicates
    const { data, error } = await supabase
      .from('clinical_provenance_links')
      .upsert(
        {
          patient_id: link.patientId,
          from_type: link.fromType,
          from_id: link.fromId,
          to_type: link.toType,
          to_id: link.toId,
          relationship: link.relationship,
          metadata: link.metadata || {},
        },
        {
          onConflict: 'patient_id,from_type,from_id,to_type,to_id,relationship',
          ignoreDuplicates: true,
        }
      )
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[Provenance Links] Error inserting provenance link:', error);
      return { success: false, error: error.message };
    }

    return { success: true, linkId: data?.id };
  } catch (err: any) {
    console.error('[Provenance Links] Exception inserting link:', err);
    return { success: false, error: err.message || 'Failed to register link' };
  }
}

/**
 * Retrieves outgoing provenance links originating from a given entity.
 */
export async function getProvenanceLinksFrom(patientId: string, fromType: string, fromId: string): Promise<ProvenanceLink[]> {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('clinical_provenance_links')
      .select('*')
      .eq('patient_id', patientId)
      .eq('from_type', fromType)
      .eq('from_id', fromId);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      patientId: row.patient_id,
      fromType: row.from_type,
      fromId: row.from_id,
      toType: row.to_type,
      toId: row.to_id,
      relationship: row.relationship,
      metadata: row.metadata || {},
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('[Provenance Links] Error fetching outgoing links:', err);
    return [];
  }
}

/**
 * Retrieves incoming provenance links pointing to a given entity.
 */
export async function getProvenanceLinksTo(patientId: string, toType: string, toId: string): Promise<ProvenanceLink[]> {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('clinical_provenance_links')
      .select('*')
      .eq('patient_id', patientId)
      .eq('to_type', toType)
      .eq('to_id', toId);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      patientId: row.patient_id,
      fromType: row.from_type,
      fromId: row.from_id,
      toType: row.to_type,
      toId: row.to_id,
      relationship: row.relationship,
      metadata: row.metadata || {},
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('[Provenance Links] Error fetching incoming links:', err);
    return [];
  }
}
