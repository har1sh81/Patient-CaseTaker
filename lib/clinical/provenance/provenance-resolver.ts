/**
 * Task #31 — Multi-Hop Provenance Graph Resolver
 * MediKiosk Clinical Architecture
 * 
 * Traverses provenance graph across Tasks #23-30.
 * Enforces cycle detection, max depth = 10, and secure document reference resolution.
 */

import { createAdminClient } from '@/lib/supabase/server';
import { getProvenanceLinksFrom, getProvenanceLinksTo } from './provenance-links';
import type { ProvenanceChain, ProvenanceLink, ProvenanceReference, AiTraceMetadata } from './types';

const MAX_TRAVERSAL_DEPTH = 10;

/**
 * Resolves full multi-hop provenance chain for a given clinical entity.
 */
export async function resolveProvenanceChain(
  patientId: string,
  sourceType: string,
  sourceId: string
): Promise<ProvenanceChain> {
  const warnings: string[] = [];
  const links: ProvenanceLink[] = [];
  const nodesMap = new Map<string, ProvenanceReference>();
  const visitedKeys = new Set<string>();

  let chainValid = true;
  let aiTraceMetadata: AiTraceMetadata | undefined = undefined;

  // 1. Resolve root node
  const rootNode = await resolveSingleNode(patientId, sourceType, sourceId);
  if (!rootNode) {
    return {
      rootSource: {
        sourceType,
        sourceId,
        patientId,
        provenanceSource: sourceType,
        verificationStatus: 'unverified',
      },
      links: [],
      nodes: [],
      chainValid: false,
      warnings: [`Source record ${sourceType}:${sourceId} not found`],
    };
  }

  nodesMap.set(`${rootNode.sourceType}:${rootNode.sourceId}`, rootNode);

  // Extract AI summary trace metadata if applicable
  if (sourceType === 'ai_summary' || sourceType === 'ai_generated' || rootNode.metadata?.aiTrace) {
    aiTraceMetadata = extractAiTrace(rootNode);
  }

  // 2. Multi-hop traversal (queue-based with depth tracking)
  interface TraversalState {
    type: string;
    id: string;
    depth: number;
  }

  const queue: TraversalState[] = [{ type: sourceType, id: sourceId, depth: 0 }];
  visitedKeys.add(`${sourceType}:${sourceId}`);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.depth >= MAX_TRAVERSAL_DEPTH) {
      warnings.push(`MAX_DEPTH_EXCEEDED (depth limit ${MAX_TRAVERSAL_DEPTH} reached)`);
      break;
    }

    // A. Fetch explicit stored outgoing links in clinical_provenance_links
    const outgoing = await getProvenanceLinksFrom(patientId, current.type, current.id);

    for (const link of outgoing) {
      const targetType = link.toType;
      const targetId = link.toId;
      const targetKey = `${targetType}:${targetId}`;

      // Duplicate link suppression
      if (!links.some(l => l.fromType === link.fromType && l.fromId === link.fromId && l.toType === link.toType && l.toId === link.toId)) {
        links.push(link);
      }

      // Cycle detection
      if (visitedKeys.has(targetKey)) {
        chainValid = false;
        if (!warnings.includes('PROVENANCE_CYCLE_DETECTED')) {
          warnings.push('PROVENANCE_CYCLE_DETECTED');
        }
        continue;
      }

      // Resolve target node
      let targetNode = nodesMap.get(targetKey);
      if (!targetNode) {
        const resolved = await resolveSingleNode(patientId, targetType, targetId);
        if (resolved) {
          targetNode = resolved;
          nodesMap.set(targetKey, targetNode);
        }
      }

      visitedKeys.add(targetKey);
      queue.push({ type: targetType, id: targetId, depth: current.depth + 1 });
    }

    // B. Fallback table-level hierarchy resolution
    const currentNode = nodesMap.get(`${current.type}:${current.id}`);
    if (currentNode && (currentNode.parentSourceId || currentNode.documentId)) {
      const implicitParentType = currentNode.documentId ? 'scanned_document' : 'clinical_source';
      const implicitParentId = currentNode.documentId || currentNode.parentSourceId!;
      const implicitKey = `${implicitParentType}:${implicitParentId}`;

      if (!visitedKeys.has(implicitKey)) {
        const parentNode = await resolveSingleNode(patientId, implicitParentType, implicitParentId);
        if (parentNode) {
          nodesMap.set(implicitKey, parentNode);
          const implicitLink: ProvenanceLink = {
            patientId,
            fromType: current.type,
            fromId: current.id,
            toType: implicitParentType,
            toId: implicitParentId,
            relationship: 'extracted_from',
          };
          if (!links.some(l => l.fromType === implicitLink.fromType && l.fromId === implicitLink.fromId && l.toType === implicitLink.toType && l.toId === implicitLink.toId)) {
            links.push(implicitLink);
          }
          visitedKeys.add(implicitKey);
          queue.push({ type: implicitParentType, id: implicitParentId, depth: current.depth + 1 });
        }
      }
    }
  }

  const nodes = Array.from(nodesMap.values());
  const terminalRecord = nodes.find(n => n.sourceType === 'scanned_document' || n.sourceType === 'voice_transcript' || n.sourceType === 'patient_reported') || nodes[nodes.length - 1];

  return {
    rootSource: rootNode,
    links,
    nodes,
    terminalRecord,
    chainValid,
    warnings,
    aiTraceMetadata,
  };
}

/**
 * Resolves metadata and source text for a single clinical node from PostgreSQL tables.
 */
export async function resolveSingleNode(
  patientId: string,
  sourceType: string,
  sourceId: string
): Promise<ProvenanceReference | null> {
  const supabase = await createAdminClient();

  // Normalize type string
  const normType = sourceType.toLowerCase();

  // 1. AI Summary / Consultation Summary
  if (normType === 'ai_summary' || normType === 'summary' || normType === 'clinical_consultation_summaries') {
    const { data: row } = await supabase
      .from('clinical_consultation_summaries')
      .select('*')
      .eq('id', sourceId)
      .maybeSingle();

    if (row) {
      const draft = row.ai_summary_draft || {};
      return {
        sourceType: 'ai_summary',
        sourceId: row.id,
        patientId: row.patient_id,
        encounterId: row.encounter_id,
        sourceText: draft.summaryText || null,
        provenanceSource: 'ai_generated',
        verificationStatus: row.physician_notes_edits?.status === 'accepted' || row.physician_notes_edits?.status === 'edited' ? 'doctor_verified' : 'unverified',
        extractionStage: 'AI_summary',
        metadata: {
          promptVersion: draft.promptVersion || '1.0',
          modelProvider: draft.modelProvider || 'openai',
          modelName: draft.modelName || 'gpt-4o-mini',
          fingerprint: row.fingerprint,
          synthesisVersion: row.synthesis_version || '1.0',
          safetyCheckStatus: draft.safetyCheckStatus || 'passed',
        },
        createdAt: row.created_at,
      };
    }
  }

  // 2. Medical Documents (Scanned Document / OCR)
  if (normType === 'scanned_document' || normType === 'document' || normType === 'medical_documents' || normType === 'ocr') {
    const { data: row } = await supabase
      .from('medical_documents')
      .select('*')
      .eq('id', sourceId)
      .maybeSingle();

    if (!row) return null;

    const { data: ext } = await supabase
      .from('document_extractions')
      .select('raw_ocr_text')
      .eq('document_id', row.id)
      .maybeSingle();

    return {
      sourceType: row.document_type === 'handwritten_note' ? 'handwritten_document' : 'scanned_document',
      sourceId: row.id,
      patientId: row.patient_id,
      encounterId: row.encounter_id,
      documentId: row.id,
      documentName: row.file_name || 'Medical Document',
      documentType: row.document_type || 'clinical_record',
      pageNumber: (row as any).page_number ?? 1,
      sourceText: ext?.raw_ocr_text || (row as any).raw_ocr_text || (row as any).extracted_text || null,
      provenanceSource: 'OCR',
      verificationStatus: 'unverified',
      extractionStage: 'OCR',
      secureDocumentUrl: `/api/clinical/documents/${row.id}/download`,
      createdAt: row.created_at,
    };
  }

  // 3. Clinical Labs
  if (normType === 'lab' || normType === 'laboratory_report' || normType === 'clinical_lab_results') {
    const { data: row } = await supabase
      .from('clinical_lab_results')
      .select('*')
      .eq('id', sourceId)
      .maybeSingle();

    if (!row) return null;

    return {
      sourceType: 'laboratory_report',
      sourceId: row.id,
      patientId: row.patient_id,
      encounterId: row.encounter_id,
      documentId: (row as any).document_id || row.source_id || undefined,
      pageNumber: (row as any).page_number || null,
      sourceText: (row as any).source_text || `${row.test_name}: ${row.result_value} ${row.unit || ''}`.trim(),
      provenanceSource: row.provenance_source || 'OCR',
      verificationStatus: row.verification_status || 'unverified',
      extractionStage: 'structured_extraction',
      parentSourceId: row.source_id || undefined,
      createdAt: row.created_at,
    };
  }

  // 4. Clinical Procedures
  if (normType === 'procedure' || normType === 'clinical_procedures') {
    const { data: row } = await supabase
      .from('clinical_procedures')
      .select('*')
      .eq('id', sourceId)
      .maybeSingle();

    if (!row) return null;

    return {
      sourceType: 'consultation_note',
      sourceId: row.id,
      patientId: row.patient_id,
      encounterId: row.encounter_id,
      documentId: row.document_id || undefined,
      pageNumber: row.page_number || null,
      sourceText: row.source_text || row.procedure_name,
      provenanceSource: row.provenance_source || 'OCR',
      verificationStatus: row.verification_status || 'unverified',
      extractionStage: 'structured_extraction',
      parentSourceId: row.document_id || row.source_id,
      createdAt: row.created_at,
    };
  }

  // 5. Clinical Medications
  if (normType === 'medication' || normType === 'prescription' || normType === 'clinical_medications') {
    const { data: row } = await supabase
      .from('clinical_medications')
      .select('*')
      .eq('id', sourceId)
      .maybeSingle();

    if (!row) return null;

    return {
      sourceType: 'prescription',
      sourceId: row.id,
      patientId: row.patient_id,
      encounterId: row.encounter_id,
      sourceText: `${row.medication_name} ${row.dosage || ''} ${row.frequency || ''}`.trim(),
      provenanceSource: row.provenance_source || 'patient_reported',
      verificationStatus: row.verification_status || 'unverified',
      extractionStage: 'structured_extraction',
      parentSourceId: row.source_id || undefined,
      createdAt: row.created_at,
    };
  }

  // 6. Clinical Vitals
  if (normType === 'vital' || normType === 'clinical_vitals') {
    const { data: row } = await supabase
      .from('clinical_vitals')
      .select('*')
      .eq('id', sourceId)
      .maybeSingle();

    if (!row) return null;

    return {
      sourceType: 'consultation_note',
      sourceId: row.id,
      patientId: row.patient_id,
      encounterId: row.encounter_id,
      sourceText: `BP: ${row.systolic_bp}/${row.diastolic_bp}, HR: ${row.heart_rate_bpm}, Temp: ${row.body_temperature_c}°C, SpO2: ${row.spo2_percentage}%`,
      provenanceSource: row.provenance_source || 'patient_reported',
      verificationStatus: row.verification_status || 'unverified',
      extractionStage: 'structured_extraction',
      parentSourceId: row.source_id || undefined,
      createdAt: row.created_at,
    };
  }

  // 7. Symptoms & Patient Conversation Answers
  if (normType === 'symptom' || normType === 'clinical_symptoms' || normType === 'voice_transcript' || normType === 'conversation_answers') {
    const { data: row } = await supabase
      .from('conversation_answers')
      .select('*')
      .eq('id', sourceId)
      .maybeSingle();

    if (row) {
      return {
        sourceType: 'voice_transcript',
        sourceId: row.id,
        patientId,
        encounterId: row.encounter_id,
        sourceText: row.raw_text || row.normalized_english_text || null,
        provenanceSource: 'voice_transcript',
        verificationStatus: 'patient_reported',
        extractionStage: 'raw_document',
        createdAt: row.created_at,
      };
    }

    const { data: symRow } = await supabase
      .from('clinical_symptoms')
      .select('*')
      .eq('id', sourceId)
      .maybeSingle();

    if (symRow) {
      return {
        sourceType: 'patient_reported',
        sourceId: symRow.id,
        patientId: symRow.patient_id,
        encounterId: symRow.encounter_id,
        sourceText: symRow.symptom_name,
        provenanceSource: symRow.provenance_source || 'patient_reported',
        verificationStatus: symRow.verification_status || 'unverified',
        extractionStage: 'structured_extraction',
        parentSourceId: symRow.source_id || undefined,
        createdAt: symRow.created_at,
      };
    }
  }

  // Generic fallback if not matched by specific tables
  return {
    sourceType,
    sourceId,
    patientId,
    provenanceSource: sourceType,
    verificationStatus: 'unverified',
    extractionStage: 'structured_extraction',
  };
}

/**
 * Helper extracting AI trace metadata from reference.
 */
function extractAiTrace(ref: ProvenanceReference): AiTraceMetadata {
  const meta = ref.metadata || {};
  return {
    sourceSynthesisVersion: (meta.synthesisVersion as string) || '1.0',
    sourceFingerprint: (meta.fingerprint as string) || 'synth-fingerprint',
    promptVersion: (meta.promptVersion as string) || '1.0',
    modelProvider: (meta.modelProvider as string) || 'openai',
    modelName: (meta.modelName as string) || 'gpt-4o-mini',
  };
}
