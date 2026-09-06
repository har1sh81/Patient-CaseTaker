/**
 * Task #26 — Clinical Timeline Generation Service
 * MediKiosk Clinical Engine
 */

import { createClient } from '@/lib/supabase/server';
import { hasValidConsent } from '@/lib/consent/consent-service';
import { TimelineEvent, TimelineEventType, TimelineQueryOptions, TimelineResult } from './types';
import { partitionTimelineEvents, sortTimelineEvents } from './timeline-sorter';
import {
  buildAttentionFlagEvent,
  buildAyushEvent,
  buildConversationEvent,
  buildDiagnosisEvent,
  buildDocumentEvent,
  buildEncounterEvent,
  buildLabEvent,
  buildMedicationEvent,
  buildProcedureEvent,
  buildSymptomEvent,
  buildVitalEvent,
} from './timeline-builder';

export const VALID_EVENT_TYPES: TimelineEventType[] = [
  'encounter',
  'symptom',
  'vital',
  'medication',
  'lab',
  'diagnosis',
  'procedure',
  'document',
  'ayush_assessment',
  'attention_flag',
  'conversation',
];

/**
 * Writes an entry to public.audit_logs for timeline generation events.
 */
export async function logTimelineAudit(
  action:
    | 'timeline_generation_started'
    | 'timeline_generation_completed'
    | 'timeline_generation_failed',
  patientId: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from('audit_logs').insert({
      action,
      actor_type: 'patient',
      actor_id: patientId,
      metadata: {
        patient_id: patientId,
        ...metadata,
      },
    });
  } catch (err) {
    console.error('[Timeline Service] Failed to write audit log:', err);
  }
}

/**
 * Main service function to fetch and construct a patient's clinical timeline.
 */
export async function getPatientTimeline(
  options: TimelineQueryOptions
): Promise<TimelineResult> {
  const { patientId, department, encounterId, fromDate, toDate, eventTypes, descending = true } = options;

  if (!patientId || typeof patientId !== 'string' || patientId.trim().length === 0) {
    return {
      success: false,
      errorCode: 'INVALID_INPUT',
      error: 'patientId is required',
    };
  }

  // Validate eventTypes filter if specified
  if (Array.isArray(eventTypes) && eventTypes.length > 0) {
    const invalidType = eventTypes.find((t) => !VALID_EVENT_TYPES.includes(t));
    if (invalidType) {
      return {
        success: false,
        errorCode: 'INVALID_INPUT',
        error: `Invalid eventType filter: '${invalidType}'`,
      };
    }
  }

  const supabase = await createClient();

  // 1. Verify Patient Existence
  const { data: patient, error: patientErr } = await supabase
    .from('patients')
    .select('id')
    .eq('id', patientId)
    .maybeSingle();

  if (patientErr || !patient) {
    return {
      success: false,
      errorCode: 'NOT_FOUND',
      error: `Patient not found: ${patientId}`,
    };
  }

  // 2. Enforce General Medicine Consent
  const hasGeneralConsent = await hasValidConsent(patientId, 'share_health_records');
  if (!hasGeneralConsent) {
    await logTimelineAudit('timeline_generation_failed', patientId, {
      reason: 'CONSENT_DENIED',
      permission: 'share_health_records',
    });
    return {
      success: false,
      errorCode: 'CONSENT_DENIED',
      error: "Patient has not granted active consent for 'share_health_records'",
    };
  }

  // 3. Enforce AYUSH Consent if AYUSH eventType is requested or department is AYUSH
  const requestedAyush =
    (Array.isArray(eventTypes) && eventTypes.includes('ayush_assessment')) ||
    department?.toLowerCase().includes('ayush') ||
    department?.toLowerCase().includes('ayurveda');

  if (requestedAyush) {
    const hasAyushConsent = await hasValidConsent(patientId, 'share_ayush_records');
    if (!hasAyushConsent) {
      await logTimelineAudit('timeline_generation_failed', patientId, {
        reason: 'CONSENT_DENIED',
        permission: 'share_ayush_records',
      });
      return {
        success: false,
        errorCode: 'CONSENT_DENIED',
        error: "Patient has not granted active consent for 'share_ayush_records'",
      };
    }
  }

  await logTimelineAudit('timeline_generation_started', patientId, {
    department,
    encounter_id: encounterId,
    from_date: fromDate,
    to_date: toDate,
  });

  const rawEvents: TimelineEvent[] = [];

  // Helper filter check
  const shouldInclude = (type: TimelineEventType) => {
    if (!Array.isArray(eventTypes) || eventTypes.length === 0) return true;
    return eventTypes.includes(type);
  };

  try {
    // A. Encounters
    if (shouldInclude('encounter')) {
      let q = supabase.from('encounters').select('*').eq('patient_id', patientId);
      if (encounterId) q = q.eq('id', encounterId);
      if (department) q = q.ilike('department', `%${department}%`);
      const { data: encs } = await q;
      if (Array.isArray(encs)) {
        for (const e of encs) rawEvents.push(buildEncounterEvent(e));
      }
    }

    // B. Symptoms
    if (shouldInclude('symptom')) {
      let q = supabase.from('clinical_symptoms').select('*').eq('patient_id', patientId);
      if (encounterId) q = q.eq('encounter_id', encounterId);
      const { data: syms } = await q;
      if (Array.isArray(syms)) {
        for (const s of syms) rawEvents.push(buildSymptomEvent(s));
      }
    }

    // C. Vitals
    if (shouldInclude('vital')) {
      let q = supabase.from('clinical_vitals').select('*').eq('patient_id', patientId);
      if (encounterId) q = q.eq('encounter_id', encounterId);
      const { data: vits } = await q;
      if (Array.isArray(vits)) {
        for (const v of vits) rawEvents.push(buildVitalEvent(v));
      }
    }

    // D. Medications
    if (shouldInclude('medication')) {
      let q = supabase.from('clinical_medications').select('*').eq('patient_id', patientId);
      if (encounterId) q = q.eq('encounter_id', encounterId);
      const { data: meds } = await q;
      if (Array.isArray(meds)) {
        for (const m of meds) rawEvents.push(buildMedicationEvent(m));
      }
    }

    // E. Labs
    if (shouldInclude('lab')) {
      let q = supabase.from('clinical_lab_results').select('*').eq('patient_id', patientId);
      if (encounterId) q = q.eq('encounter_id', encounterId);
      const { data: labs } = await q;
      if (Array.isArray(labs)) {
        for (const l of labs) rawEvents.push(buildLabEvent(l));
      }
    }

    // F. Diagnoses
    if (shouldInclude('diagnosis')) {
      let q = supabase.from('clinical_diagnoses').select('*').eq('patient_id', patientId);
      if (encounterId) q = q.eq('encounter_id', encounterId);
      const { data: diags } = await q;
      if (Array.isArray(diags)) {
        for (const d of diags) rawEvents.push(buildDiagnosisEvent(d));
      }
    }

    // G. Procedures
    if (shouldInclude('procedure')) {
      try {
        const { data: procs, error: procErr } = await supabase.from('clinical_procedures').select('*').eq('patient_id', patientId);
        if (!procErr && Array.isArray(procs) && procs.length > 0) {
          for (const p of procs) rawEvents.push(buildProcedureEvent(p));
        }
      } catch (err) {
        // PostgREST schema cache fallback
      }

      // Check document_extractions JSON for procedures as additional source
      const { data: docs } = await supabase.from('medical_documents').select('id, encounter_id').eq('patient_id', patientId);
      if (Array.isArray(docs) && docs.length > 0) {
        const docIds = docs.map((d) => d.id);
        const { data: exts } = await supabase.from('document_extractions').select('*').in('document_id', docIds);
        if (Array.isArray(exts)) {
          for (const ext of exts) {
            const procList = (ext.extracted_json as any)?.procedures || (ext.extracted_json as any)?.procedureExtraction?.procedures;
            if (Array.isArray(procList)) {
              for (const p of procList) {
                const encId = docs.find((d) => d.id === ext.document_id)?.encounter_id;
                rawEvents.push(
                  buildProcedureEvent({
                    id: p.id || `proc_ext_${ext.id}`,
                    patient_id: patientId,
                    encounter_id: encId,
                    procedure_name: p.procedureName || p.rawProcedureName,
                    raw_procedure_name: p.rawProcedureName,
                    procedure_date: p.procedureDate,
                    status: p.status,
                    category: p.category,
                    body_site: p.bodySite,
                    laterality: p.laterality,
                    verification_status: p.verificationStatus || 'unverified',
                    provenance_source: p.provenanceSource || 'document_extraction',
                    page_number: p.pageNumber,
                    source_text: p.sourceText,
                  })
                );
              }
            }
          }
        }
      }
    }

    // H. Medical Documents
    if (shouldInclude('document')) {
      let q = supabase.from('medical_documents').select('*').eq('patient_id', patientId);
      if (encounterId) q = q.eq('encounter_id', encounterId);
      const { data: docs } = await q;
      if (Array.isArray(docs)) {
        for (const doc of docs) rawEvents.push(buildDocumentEvent(doc));
      }
    }

    // I. AYUSH Assessments
    if (shouldInclude('ayush_assessment')) {
      // Check AYUSH consent if not previously checked
      const hasAyushConsent = await hasValidConsent(patientId, 'share_ayush_records');
      if (hasAyushConsent) {
        let q = supabase.from('clinical_ayush_assessments').select('*').eq('patient_id', patientId);
        if (encounterId) q = q.eq('encounter_id', encounterId);
        const { data: ayush } = await q;
        if (Array.isArray(ayush)) {
          for (const a of ayush) rawEvents.push(buildAyushEvent(a));
        }
      }
    }

    // Pre-fetch patient encounter IDs for tables linked via encounter_id
    const { data: patientEncs } = await supabase.from('encounters').select('id').eq('patient_id', patientId);
    const patientEncounterIds = Array.isArray(patientEncs) ? patientEncs.map((e) => e.id) : [];

    // J. Attention Flags
    if (shouldInclude('attention_flag')) {
      let targetEncIds = patientEncounterIds;
      if (encounterId) {
        targetEncIds = targetEncIds.filter((id) => id === encounterId);
      }
      if (targetEncIds.length > 0) {
        const { data: flags } = await supabase.from('attention_flags').select('*');
        if (Array.isArray(flags)) {
          for (const f of flags) {
            const encId = f.encounter_id || f.session_id;
            if (targetEncIds.includes(encId) || f.patient_id === patientId) {
              rawEvents.push(buildAttentionFlagEvent(f, patientId));
            }
          }
        }
      }
    }

    // K. Conversation Answers
    if (shouldInclude('conversation')) {
      let targetEncIds = patientEncounterIds;
      if (encounterId) {
        targetEncIds = targetEncIds.filter((id) => id === encounterId);
      }
      if (targetEncIds.length > 0) {
        const { data: convs } = await supabase.from('conversation_answers').select('*').in('encounter_id', targetEncIds);
        if (Array.isArray(convs)) {
          for (const c of convs) rawEvents.push(buildConversationEvent(c, patientId));
        }
      }
    }

    // 4. Deduplicate by sourceType + sourceId
    const seen = new Set<string>();
    const uniqueEvents: TimelineEvent[] = [];
    for (const ev of rawEvents) {
      const key = `${ev.sourceType}:${ev.sourceId}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueEvents.push(ev);
      }
    }

    // 5. Apply Date Range Filters (fromDate, toDate)
    let filteredEvents = uniqueEvents;
    if (fromDate || toDate) {
      filteredEvents = uniqueEvents.filter((ev) => {
        if (!ev.eventDate) return false;
        const d = ev.eventDate;
        if (fromDate) {
          const targetFrom = d.length === 4 ? fromDate.slice(0, 4) : d.length === 7 ? fromDate.slice(0, 7) : fromDate;
          if (d < targetFrom) return false;
        }
        if (toDate) {
          const targetTo = d.length === 4 ? toDate.slice(0, 4) : d.length === 7 ? toDate.slice(0, 7) : toDate;
          if (d > targetTo) return false;
        }
        return true;
      });
    }

    // 6. Sort Events Deterministically
    const sortedEvents = sortTimelineEvents(filteredEvents, descending);
    const { datedEvents, undatedEvents } = partitionTimelineEvents(sortedEvents);

    await logTimelineAudit('timeline_generation_completed', patientId, {
      total_events: sortedEvents.length,
      dated_events: datedEvents.length,
      undated_events: undatedEvents.length,
    });

    return {
      success: true,
      data: {
        patientId,
        events: sortedEvents,
        datedEvents,
        undatedEvents,
        total: sortedEvents.length,
      },
    };
  } catch (err: any) {
    await logTimelineAudit('timeline_generation_failed', patientId, {
      error: err?.message || String(err),
    });
    return {
      success: false,
      errorCode: 'INTERNAL_ERROR',
      error: `Failed to construct timeline: ${err?.message || String(err)}`,
    };
  }
}
