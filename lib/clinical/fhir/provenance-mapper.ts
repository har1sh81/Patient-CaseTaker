/**
 * Task #32 — FHIR Provenance Mapper
 * MediKiosk Clinical Architecture
 * 
 * Maps Task #31 provenance lineage into FHIR Provenance R4.
 */

import { FHIR_SYSTEMS } from './fhir-constants';
import type { FhirProvenance, FhirExtension } from './types';
import type { ProvenanceChain } from '@/lib/clinical/provenance/types';

export function mapProvenanceChainToFhir(
  targetRef: { reference: string; type: string },
  chain: ProvenanceChain
): FhirProvenance {
  const extensions: FhirExtension[] = [
    { url: FHIR_SYSTEMS.EXTENSION_VERIFICATION_STATUS, valueString: chain.rootSource.verificationStatus || 'unverified' },
    { url: FHIR_SYSTEMS.EXTENSION_PROVENANCE_SOURCE, valueString: chain.rootSource.provenanceSource || 'system_generated' },
  ];

  if (chain.aiTraceMetadata) {
    extensions.push({
      url: FHIR_SYSTEMS.EXTENSION_AI_TRACE,
      valueValue: {
        modelProvider: chain.aiTraceMetadata.modelProvider,
        modelName: chain.aiTraceMetadata.modelName,
        promptVersion: chain.aiTraceMetadata.promptVersion,
        sourceFingerprint: chain.aiTraceMetadata.sourceFingerprint,
      },
    });
  }

  const entities: FhirProvenance['entity'] = [];
  if (chain.terminalRecord?.documentId) {
    entities.push({
      role: 'source',
      what: {
        reference: `DocumentReference/${chain.terminalRecord.documentId}`,
        type: 'DocumentReference',
      },
    });
  }

  return {
    resourceType: 'Provenance',
    id: `prov-${targetRef.reference.replace('/', '-')}`,
    target: [targetRef],
    recorded: chain.rootSource.createdAt || '2026-09-06T00:00:00Z',
    agent: [
      {
        type: { text: chain.rootSource.provenanceSource || 'system_generated' },
        who: { display: chain.rootSource.provenanceSource || 'MediKiosk Engine' },
      },
    ],
    entity: entities.length > 0 ? entities : undefined,
    extension: extensions,
  };
}
