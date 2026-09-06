'use client';

/**
 * Task #31 — Physician Provenance Traceability Viewer
 * MediKiosk Doctor Portal Component
 * 
 * Renders the multi-hop clinical provenance chain for any patient record item.
 * Clearly demarcates:
 * 1. Source Evidence (raw OCR, transcripts, scans)
 * 2. Derived Information (extracted facts, labs, procedures)
 * 3. AI-Generated (summaries, draft notes)
 */

import React, { useState, useEffect } from 'react';
import type { ProvenanceChain, ProvenanceReference } from '@/lib/clinical/provenance/types';

interface ProvenanceViewerProps {
  patientId: string;
  sourceType: string;
  sourceId: string;
  onClose?: () => void;
}

export const ProvenanceViewer: React.FC<ProvenanceViewerProps> = ({
  patientId,
  sourceType,
  sourceId,
  onClose,
}) => {
  const [chain, setChain] = useState<ProvenanceChain | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchProvenance() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/clinical/provenance/${encodeURIComponent(sourceType)}/${encodeURIComponent(sourceId)}?patientId=${encodeURIComponent(patientId)}`);
        const json = await res.json();

        if (!isMounted) return;

        if (!json.success) {
          setError(json.error || json.errorCode || 'Failed to load provenance chain');
        } else {
          setChain(json.data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Network error fetching provenance');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProvenance();

    return () => {
      isMounted = false;
    };
  }, [patientId, sourceType, sourceId]);

  const getNodeCategoryBadge = (node: ProvenanceReference) => {
    const st = node.sourceType.toLowerCase();
    const ps = (node.provenanceSource || '').toLowerCase();

    if (st.includes('ai') || ps.includes('ai')) {
      return (
        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-300">
          🤖 AI-Generated
        </span>
      );
    }

    if (st.includes('document') || st.includes('ocr') || st.includes('transcript') || st.includes('scanned')) {
      return (
        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300">
          📄 Source Evidence
        </span>
      );
    }

    return (
      <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-300">
        ⚙️ Derived Information
      </span>
    );
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'doctor_verified':
      case 'verified':
        return <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-medium dark:bg-green-950 dark:text-green-300">✓ Doctor Verified</span>;
      case 'patient_reported':
        return <span className="text-xs px-2 py-0.5 rounded bg-sky-100 text-sky-700 font-medium dark:bg-sky-950 dark:text-sky-300">👤 Patient Reported</span>;
      case 'rejected':
        return <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium dark:bg-red-950 dark:text-red-300">✗ Rejected</span>;
      default:
        return <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-medium dark:bg-amber-950 dark:text-amber-300">⚠️ Unverified</span>;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg p-5 max-w-3xl w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔗</span>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Clinical Provenance Trace
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold px-2"
          >
            ×
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400 animate-pulse">
          Resolving multi-hop provenance chain...
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300 text-sm">
          <strong>Provenance Lookup Error:</strong> {error}
        </div>
      )}

      {/* Chain Data */}
      {chain && !loading && (
        <div className="space-y-6">
          {/* Warnings Banner */}
          {chain.warnings.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded text-amber-800 dark:text-amber-200 text-xs">
              <strong>Provenance Warnings:</strong> {chain.warnings.join(', ')}
            </div>
          )}

          {/* AI Summary Trace Notice */}
          {chain.aiTraceMetadata && (
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded text-xs space-y-1">
              <div className="font-semibold text-purple-900 dark:text-purple-200">
                🤖 AI Summary Provenance Trace
              </div>
              <div className="text-purple-800 dark:text-purple-300 flex flex-wrap gap-x-4">
                <span><strong>Model:</strong> {chain.aiTraceMetadata.modelProvider} ({chain.aiTraceMetadata.modelName})</span>
                <span><strong>Prompt Version:</strong> {chain.aiTraceMetadata.promptVersion}</span>
                <span><strong>Synthesis Fingerprint:</strong> {chain.aiTraceMetadata.sourceFingerprint?.substring(0, 12)}...</span>
              </div>
            </div>
          )}

          {/* Provenance Chain Graph Visualizer */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Lineage Chain ({chain.nodes.length} Nodes)
            </h4>

            <div className="relative border-l-2 border-indigo-300 dark:border-indigo-800 ml-3 pl-4 space-y-6">
              {chain.nodes.map((node, index) => (
                <div key={`${node.sourceType}-${node.sourceId}-${index}`} className="relative group">
                  {/* Timeline node marker */}
                  <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white dark:border-gray-900" />

                  <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-md border border-gray-200 dark:border-gray-700/80 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {getNodeCategoryBadge(node)}
                        <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                          {node.documentName || node.sourceType}
                        </span>
                      </div>
                      {getVerificationBadge(node.verificationStatus)}
                    </div>

                    {/* Source Snippet */}
                    {node.sourceText && (
                      <div className="bg-white dark:bg-gray-900 p-2.5 rounded border border-gray-200 dark:border-gray-800 font-mono text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        "{node.sourceText}"
                      </div>
                    )}

                    {/* Metadata Footer */}
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1 flex-wrap gap-2">
                      <div className="flex gap-3">
                        {node.pageNumber !== undefined && node.pageNumber !== null && (
                          <span><strong>Page:</strong> {node.pageNumber}</span>
                        )}
                        {node.extractionStage && (
                          <span><strong>Stage:</strong> {node.extractionStage}</span>
                        )}
                        {node.createdAt && (
                          <span><strong>Date:</strong> {new Date(node.createdAt).toLocaleDateString()}</span>
                        )}
                      </div>

                      {/* Secure Document Link */}
                      {node.secureDocumentUrl && (
                        <a
                          href={node.secureDocumentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1"
                        >
                          View Document ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
