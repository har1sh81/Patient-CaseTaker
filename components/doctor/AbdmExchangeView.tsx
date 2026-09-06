'use client';

/**
 * Task #33 — ABDM Exchange Component for Physician Portal
 * MediKiosk Clinical Architecture
 * 
 * Displays ABDM integration state, environment mode banner, consent status,
 * purpose limitation, SHA-256 bundle hash, request status, and exchange history.
 */

import React, { useState, useEffect } from 'react';
import type { AbdmEnvironment, AbdmExchangeStatus, AbdmPurpose, AbdmExchangeRecord } from '@/lib/clinical/abdm/types';

interface AbdmExchangeViewProps {
  patientId: string;
  encounterId?: string;
}

export function AbdmExchangeView({ patientId, encounterId }: AbdmExchangeViewProps) {
  const [environment, setEnvironment] = useState<AbdmEnvironment>('mock');
  const [purpose, setPurpose] = useState<AbdmPurpose>('consultation');
  const [forceResubmit, setForceResubmit] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [exchanges, setExchanges] = useState<AbdmExchangeRecord[]>([]);
  const [activeExchange, setActiveExchange] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consentGranted, setConsentGranted] = useState<boolean | null>(null);

  // Check consent status on load
  useEffect(() => {
    async function checkConsent() {
      try {
        const res = await fetch(`/api/patients/consent/check?patientId=${patientId}&permissionKey=share_health_records`);
        const json = await res.json();
        setConsentGranted(json.success && json.data?.accepted === true);
      } catch {
        setConsentGranted(false);
      }
    }
    if (patientId) checkConsent();
  }, [patientId]);

  // Load exchange history
  const loadHistory = async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}/abdm/exchanges${encounterId ? `?encounterId=${encounterId}` : ''}`);
      const json = await res.json();
      if (json.success && json.data?.exchanges) {
        setExchanges(json.data.exchanges);
      }
    } catch (err: any) {
      console.error('Failed to fetch ABDM exchange history:', err);
    }
  };

  useEffect(() => {
    if (patientId) loadHistory();
  }, [patientId, encounterId]);

  // Handle ABDM exchange submission
  const handleExchangeSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/abdm/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encounterId,
          purpose,
          environment,
          forceResubmit,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'ABDM exchange submission failed');
      } else {
        setActiveExchange(json.data);
        await loadHistory();
      }
    } catch (err: any) {
      setError(err.message || 'Network error during exchange submission');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (st: AbdmExchangeStatus) => {
    switch (st) {
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'submitted':
      case 'accepted':
      case 'processing': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'consent_pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'rejected':
      case 'failed': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>🇮🇳 ABDM Health Record Exchange</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-medium">
              FHIR R4 4.0.1
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Secure digital health record interoperability boundary via ABDM Gateway.
          </p>
        </div>

        {/* Environment Badge */}
        <div className="flex items-center gap-2">
          {environment === 'mock' && (
            <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>DEMO / MOCK — NOT A LIVE ABDM TRANSACTION</span>
            </div>
          )}
          {environment === 'sandbox' && (
            <div className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-300 text-blue-900 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>ABDM SANDBOX</span>
            </div>
          )}
          {environment === 'production' && (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>ABDM PRODUCTION</span>
            </div>
          )}
        </div>
      </div>

      {/* Consent Warning */}
      {consentGranted === false && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
          <span className="text-base">⚠️</span>
          <div>
            <p className="font-bold">Patient Consent Required</p>
            <p className="mt-0.5">
              Patient consent <code className="bg-rose-100 px-1 py-0.5 rounded">share_health_records</code> is not active. Record exchange is restricted.
            </p>
          </div>
        </div>
      )}

      {/* Controls Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Exchange Purpose</label>
          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as AbdmPurpose)}
            className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="consultation">Consultation</option>
            <option value="treatment">Treatment</option>
            <option value="continuity_of_care">Continuity of Care</option>
            <option value="record_access">Record Access</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Target Environment</label>
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as AbdmEnvironment)}
            className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="mock">Mock / Demo (Default)</option>
            <option value="sandbox">ABDM Sandbox</option>
            <option value="production">ABDM Production</option>
          </select>
        </div>

        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-2 mb-2 cursor-pointer text-xs text-slate-600">
            <input
              type="checkbox"
              checked={forceResubmit}
              onChange={(e) => setForceResubmit(e.target.checked)}
              className="rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
            />
            <span>Force Resubmit (Bypass Idempotency)</span>
          </label>
          <button
            onClick={handleExchangeSubmit}
            disabled={loading || consentGranted === false}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold text-xs py-2 px-4 rounded-lg transition-colors shadow-xs"
          >
            {loading ? 'Preparing FHIR & Exchanging...' : 'Submit ABDM Health Record'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Active Submission Result */}
      {activeExchange && (
        <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-indigo-400">Exchange Result</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${getStatusColor(activeExchange.status)}`}>
              {activeExchange.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
            <div><span className="text-slate-500">Request ID:</span> {activeExchange.requestId}</div>
            <div><span className="text-slate-500">FHIR Version:</span> {activeExchange.fhirVersion}</div>
            <div className="sm:col-span-2 overflow-hidden text-ellipsis">
              <span className="text-slate-500">SHA-256 Bundle Hash:</span> {activeExchange.bundleHash}
            </div>
          </div>

          <p className="text-emerald-400 font-sans text-xs italic">{activeExchange.message}</p>
        </div>
      )}

      {/* History Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">ABDM Exchange History</h4>
        {exchanges.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No prior ABDM exchange records found for this patient.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Request ID</th>
                  <th className="py-2 px-3">Purpose</th>
                  <th className="py-2 px-3">Environment</th>
                  <th className="py-2 px-3">SHA-256 Bundle Hash</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exchanges.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50 text-slate-700">
                    <td className="py-2 px-3 text-slate-500">{new Date(ex.requested_at).toLocaleString()}</td>
                    <td className="py-2 px-3 font-mono font-medium text-slate-900">{ex.request_id}</td>
                    <td className="py-2 px-3 capitalize">{ex.purpose.replace(/_/g, ' ')}</td>
                    <td className="py-2 px-3 uppercase text-[10px] font-bold text-slate-500">{ex.environment}</td>
                    <td className="py-2 px-3 font-mono text-[10px] text-slate-500">{ex.bundle_hash.substring(0, 16)}...</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${getStatusColor(ex.status)}`}>
                        {ex.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
