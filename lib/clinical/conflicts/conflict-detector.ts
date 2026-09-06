/**
 * Task #28 — Clinical Conflict Detector
 * MediKiosk Clinical Engine
 *
 * Gathers clinical evidence records from Supabase tables for a given patient,
 * normalizes matching keys, and groups candidate records into comparison sets.
 */

import { createClient } from '@/lib/supabase/server';
import type { ConflictCandidate } from './types';

export interface RawEvidenceItem {
  sourceType: string;
  sourceId: string;
  documentId?: string;
  eventDate?: string;
  eventDatePrecision?: string;
  key: string; // Normalized concept key (e.g., 'med_amlodipine', 'lab_hba1c')
  value: unknown;
  unit?: string;
  status?: string;
  verificationStatus: string;
  provenance: Record<string, unknown>;
  sourceText?: string;
  needsReview?: boolean;
  referenceRange?: string;
}

/**
 * Normalizes text string for key comparison.
 */
export function normalizeConceptKey(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/^(tab\.|cap\.|inj\.|syrup|tablet|capsule|injection)\s+/i, '')
    .replace(/\s+(sr|xr|cr|er)\b/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Gathers all clinical evidence for a patient and groups them by concept key.
 */
export async function gatherPatientEvidence(
  patientId: string,
  options?: {
    encounterId?: string;
    eventTypes?: string[];
    fromDate?: string;
    toDate?: string;
  }
): Promise<Map<string, ConflictCandidate[]>> {
  const supabase = await createClient();
  const candidateGroups = new Map<string, ConflictCandidate[]>();

  const addCandidate = (groupKey: string, candidate: ConflictCandidate) => {
    if (!candidateGroups.has(groupKey)) {
      candidateGroups.set(groupKey, []);
    }
    const existing = candidateGroups.get(groupKey)!;
    // Prevent inserting exact identical object references
    if (!existing.some((c) => c.sourceId === candidate.sourceId && c.sourceType === candidate.sourceType)) {
      existing.push(candidate);
    }
  };

  const { encounterId, eventTypes, fromDate, toDate } = options || {};

  // 1. Gather Medications
  if (!eventTypes || eventTypes.includes('medication')) {
    let query = supabase.from('clinical_medications').select('*').eq('patient_id', patientId);
    if (encounterId) query = query.eq('encounter_id', encounterId);
    if (fromDate) query = query.gte('prescribed_at', fromDate);
    if (toDate) query = query.lte('prescribed_at', toDate);

    const { data: meds } = await query;
    if (meds && meds.length > 0) {
      for (const m of meds) {
        const normName = normalizeConceptKey(m.medication_name || m.name || '');
        if (!normName) continue;
        const groupKey = `med:${normName}`;

        const eventDate = m.prescribed_at || m.start_date || m.created_at;
        const candidate: ConflictCandidate = {
          sourceType: 'medication',
          sourceId: String(m.id),
          documentId: m.source_id || m.document_id || undefined,
          eventDate: eventDate ? String(eventDate).slice(0, 10) : undefined,
          eventDatePrecision: eventDate ? 'day' : 'unknown',
          value: {
            medicationName: m.medication_name,
            dosage: m.dosage,
            frequency: m.frequency,
            route: m.route,
          },
          status: m.status || 'active',
          verificationStatus: m.verification_status || 'unverified',
          provenance: {
            provenanceSource: m.provenance_source || 'historical_document',
            documentId: m.source_id || m.document_id,
            pageNumber: m.page_number,
            sourceText: m.source_text,
          },
          sourceText: m.source_text || `${m.medication_name} ${m.dosage || ''}`.trim(),
          needsReview: m.needs_review || m.is_uncertain || false,
        };
        addCandidate(groupKey, candidate);
      }
    }
  }

  // 2. Gather Labs
  if (!eventTypes || eventTypes.includes('lab')) {
    let query = supabase.from('clinical_lab_results').select('*').eq('patient_id', patientId);
    if (encounterId) query = query.eq('encounter_id', encounterId);
    if (fromDate) query = query.gte('tested_at', fromDate);
    if (toDate) query = query.lte('tested_at', toDate);

    const { data: labs } = await query;
    if (labs && labs.length > 0) {
      for (const l of labs) {
        const normTest = normalizeConceptKey(l.test_name || '');
        if (!normTest) continue;
        const groupKey = `lab:${normTest}`;

        const eventDate = l.specimen_date || l.tested_at || l.created_at;
        const candidate: ConflictCandidate = {
          sourceType: 'lab',
          sourceId: String(l.id),
          documentId: l.source_id || l.document_id || undefined,
          eventDate: eventDate ? String(eventDate).slice(0, 10) : undefined,
          eventDatePrecision: eventDate ? 'day' : 'unknown',
          value: l.result_value,
          unit: l.unit || undefined,
          status: l.status || 'final',
          verificationStatus: l.verification_status || 'unverified',
          provenance: {
            provenanceSource: l.provenance_source || 'historical_document',
            documentId: l.source_id || l.document_id,
            pageNumber: l.page_number,
            sourceText: l.source_text,
            referenceRange: l.reference_range,
          },
          sourceText: l.source_text || `${l.test_name}: ${l.result_value} ${l.unit || ''}`.trim(),
          needsReview: l.needs_review || l.is_uncertain || false,
        };
        addCandidate(groupKey, candidate);
      }
    }
  }

  // 3. Gather Diagnoses
  if (!eventTypes || eventTypes.includes('diagnosis')) {
    let query = supabase.from('clinical_diagnoses').select('*').eq('patient_id', patientId);
    if (encounterId) query = query.eq('encounter_id', encounterId);
    if (fromDate) query = query.gte('diagnosed_at', fromDate);
    if (toDate) query = query.lte('diagnosed_at', toDate);

    const { data: diags } = await query;
    if (diags && diags.length > 0) {
      for (const d of diags) {
        const normDiag = normalizeConceptKey(d.condition_name || d.diagnosis_name || '');
        if (!normDiag) continue;
        const groupKey = `diag:${normDiag}`;

        const eventDate = d.diagnosed_at || d.onset_date || d.created_at;
        const candidate: ConflictCandidate = {
          sourceType: 'diagnosis',
          sourceId: String(d.id),
          documentId: d.source_id || d.document_id || undefined,
          eventDate: eventDate ? String(eventDate).slice(0, 10) : undefined,
          eventDatePrecision: eventDate ? 'day' : 'unknown',
          value: {
            conditionName: d.condition_name,
            icd10Code: d.icd10_code,
          },
          status: d.clinical_status || d.status || 'verified',
          verificationStatus: d.verification_status || 'unverified',
          provenance: {
            provenanceSource: d.provenance_source || 'historical_document',
            documentId: d.source_id || d.document_id,
            pageNumber: d.page_number,
            sourceText: d.source_text,
          },
          sourceText: d.source_text || d.condition_name,
          needsReview: d.needs_review || d.is_uncertain || false,
        };
        addCandidate(groupKey, candidate);
      }
    }
  }

  // 4. Gather Procedures
  if (!eventTypes || eventTypes.includes('procedure')) {
    let query = supabase.from('clinical_procedures').select('*').eq('patient_id', patientId);
    if (encounterId) query = query.eq('encounter_id', encounterId);
    if (fromDate) query = query.gte('performed_at', fromDate);
    if (toDate) query = query.lte('performed_at', toDate);

    const { data: procs } = await query;
    if (procs && procs.length > 0) {
      for (const p of procs) {
        const normProc = normalizeConceptKey(p.procedure_name || p.name || '');
        if (!normProc) continue;
        const groupKey = `proc:${normProc}`;

        const eventDate = p.performed_at || p.scheduled_at || p.created_at;
        const candidate: ConflictCandidate = {
          sourceType: 'procedure',
          sourceId: String(p.id),
          documentId: p.source_id || p.document_id || undefined,
          eventDate: eventDate ? String(eventDate).slice(0, 10) : undefined,
          eventDatePrecision: eventDate ? 'day' : 'unknown',
          value: {
            procedureName: p.procedure_name,
            bodySite: p.body_site,
          },
          status: p.status || 'completed',
          verificationStatus: p.verification_status || 'unverified',
          provenance: {
            provenanceSource: p.provenance_source || 'historical_document',
            documentId: p.source_id || p.document_id,
            pageNumber: p.page_number,
            sourceText: p.source_text,
          },
          sourceText: p.source_text || p.procedure_name,
          needsReview: p.needs_review || p.is_uncertain || false,
        };
        addCandidate(groupKey, candidate);
      }
    }
  }

  // 5. Gather Vitals
  if (!eventTypes || eventTypes.includes('vital')) {
    let query = supabase.from('vitals').select('*').eq('patient_id', patientId);
    if (encounterId) query = query.eq('encounter_id', encounterId);
    if (fromDate) query = query.gte('measured_at', fromDate);
    if (toDate) query = query.lte('measured_at', toDate);

    const { data: vitalsData } = await query;
    if (vitalsData && vitalsData.length > 0) {
      for (const v of vitalsData) {
        const eventDate = v.measured_at || v.created_at;

        if (v.systolic_bp != null || v.diastolic_bp != null) {
          const candidate: ConflictCandidate = {
            sourceType: 'vital',
            sourceId: String(v.id),
            eventDate: eventDate ? String(eventDate).slice(0, 10) : undefined,
            eventDatePrecision: eventDate ? 'day' : 'unknown',
            value: `${v.systolic_bp}/${v.diastolic_bp}`,
            unit: 'mmHg',
            status: 'recorded',
            verificationStatus: v.verification_status || 'unverified',
            provenance: { provenanceSource: v.provenance_source || 'historical_document' },
            sourceText: `BP: ${v.systolic_bp}/${v.diastolic_bp} mmHg`,
          };
          addCandidate('vital:bp', candidate);
        }

        if (v.heart_rate_bpm != null) {
          const candidate: ConflictCandidate = {
            sourceType: 'vital',
            sourceId: String(v.id),
            eventDate: eventDate ? String(eventDate).slice(0, 10) : undefined,
            eventDatePrecision: eventDate ? 'day' : 'unknown',
            value: v.heart_rate_bpm,
            unit: 'bpm',
            status: 'recorded',
            verificationStatus: v.verification_status || 'unverified',
            provenance: { provenanceSource: v.provenance_source || 'historical_document' },
            sourceText: `Heart Rate: ${v.heart_rate_bpm} bpm`,
          };
          addCandidate('vital:heart_rate', candidate);
        }
      }
    }
  }

  // Filter groups: keep only those with at least 2 candidates OR single candidate with needsReview
  const filteredMap = new Map<string, ConflictCandidate[]>();
  for (const [key, candidates] of candidateGroups.entries()) {
    if (candidates.length >= 2 || candidates.some((c) => c.needsReview)) {
      filteredMap.set(key, candidates);
    }
  }

  return filteredMap;
}
