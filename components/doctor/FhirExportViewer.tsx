'use client';

/**
 * Task #32 — Physician Interoperability FHIR Export Viewer
 * MediKiosk Doctor Portal Component
 * 
 * Displays FHIR R4 Bundle metadata, resource count breakdown, JSON preview,
 * and secure JSON export download actions for clinicians.
 */

import React, { useState, useEffect } from 'react';
import type { FhirExportResult } from '@/lib/clinical/fhir/types';

interface FhirExportViewerProps {
  patientId: string;
  encounterId?: string;
  onClose?: () => void;
}

export const FhirExportViewer: React.FC<FhirExportViewerProps> = ({
  patientId,
  encounterId,
  onClose,
}) => {
  const [exportData, setExportData] = useState<FhirExportResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchFhirBundle() {
      setLoading(true);
      setError(null);

      try {
        let url = `/api/patients/${encodeURIComponent(patientId)}/fhir?includeDocuments=true&includeProvenance=true`;
        if (encounterId) url += `&encounterId=${encodeURIComponent(encounterId)}`;

        const res = await fetch(url);
        const json = await res.json();

        if (!isMounted) return;

        if (!json.success) {
          setError(json.error || json.errorCode || 'Failed to generate FHIR Bundle');
        } else {
          setExportData(json.data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Network error fetching FHIR Bundle');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchFhirBundle();

    return () => {
      isMounted = false;
    };
  }, [patientId, encounterId]);

  const handleDownloadJson = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData.bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fhir-r4-bundle-${patientId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg p-5 max-w-3xl w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧩</span>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              FHIR R4 Clinical Bundle Export
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Interoperability Standard (FHIR v{exportData?.fhirVersion || '4.0.1'})
            </p>
          </div>
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
          Generating FHIR R4 collection bundle...
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300 text-sm">
          <strong>FHIR Export Error:</strong> {error}
        </div>
      )}

      {/* Export Data */}
      {exportData && !loading && (
        <div className="space-y-5">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded border border-gray-200 dark:border-gray-700 text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">FHIR Version</div>
              <div className="text-base font-bold text-indigo-600 dark:text-indigo-400">{exportData.fhirVersion}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded border border-gray-200 dark:border-gray-700 text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">Bundle Type</div>
              <div className="text-base font-bold text-gray-800 dark:text-gray-200">{exportData.bundle.type}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded border border-gray-200 dark:border-gray-700 text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Entries</div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{exportData.bundle.entry.length}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded border border-gray-200 dark:border-gray-700 text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">Export Timestamp</div>
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1">
                {new Date(exportData.bundle.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Resource Counts Breakdown */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Resource Breakdown
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(exportData.resourceCounts).map(([type, count]) => (
                <span
                  key={type}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5"
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  {type}: <strong>{count}</strong>
                </span>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-4 flex-wrap gap-3">
            <button
              onClick={() => setShowJson(!showJson)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded border border-gray-300 dark:border-gray-600 transition"
            >
              {showJson ? 'Hide FHIR JSON' : 'View FHIR JSON'}
            </button>
            <button
              onClick={handleDownloadJson}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow transition flex items-center gap-1.5"
            >
              <span>📥</span> Download FHIR R4 Bundle (.json)
            </button>
          </div>

          {/* JSON Preview */}
          {showJson && (
            <div className="mt-3">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono max-h-96 overflow-y-auto border border-gray-800">
                {JSON.stringify(exportData.bundle, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
