/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Clock, FileText, Activity, Layers } from 'lucide-react';
import { Spinner } from '../../../components/ui/spinner';
import { IntakeSession } from '../../../types';

interface DoctorCase {
  session: IntakeSession;
  patient: any;
  departmentMode: string;
  chiefComplaint: string;
  attentionFlagsCount: number;
  priority: number;
  documentCount: number;
  hasAbdm: boolean;
  conflictCount: number;
  handoffAt: string;
}

export default function DoctorQueuePage() {
  const router = useRouter();
  const [filter, setFilter] = React.useState('All');
  
  const [cases, setCases] = React.useState<DoctorCase[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const fetchCases = async () => {
      try {
        const res = await fetch('/api/doctor/cases');
        if (!res.ok) throw new Error('Failed to fetch cases');
        const data = await res.json();
        if (mounted) {
          setCases(data.cases || []);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) setError(err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchCases();
    const interval = setInterval(fetchCases, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <h2 className="text-2xl font-bold mb-2">Error loading case queue</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  const filteredCases = cases.filter((c: DoctorCase) => {
    if (filter === 'All') return true;
    if (filter === 'Attention Required') return c.attentionFlagsCount > 0;
    if (filter === 'No Attention') return c.attentionFlagsCount === 0;
    if (filter === 'AYUSH') return c.departmentMode === 'ayush';
    if (filter === 'General Medicine') return c.departmentMode === 'standard';
    return true;
  });

  const getPriorityBadge = (priority: number) => {
    if (priority === 3) return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-md border border-red-200">CRITICAL</span>;
    if (priority === 2) return <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-bold rounded-md border border-orange-200">HIGH</span>;
    if (priority === 1) return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-md border border-yellow-200">MEDIUM</span>;
    return <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-md border border-gray-200">ROUTINE</span>;
  };

  const filters = ['All', 'Attention Required', 'No Attention', 'AYUSH', 'General Medicine'];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto w-full px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Case Queue</h1>
            <p className="text-slate-500 mt-1">Patients ready for clinical review</p>
          </div>
          
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === f 
                    ? 'bg-slate-900 text-white shadow' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Spinner className="w-10 h-10 text-slate-400" />
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center shadow-sm">
            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No cases found</h3>
            <p className="text-slate-500">There are currently no cases matching this filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCases.map((c: DoctorCase) => (
              <div 
                key={c.session.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col"
                onClick={() => router.push(`/doctor/patient/${c.session.id}`)}
              >
                <div className={`h-1 w-full ${c.priority >= 2 ? 'bg-red-500' : c.priority === 1 ? 'bg-orange-400' : 'bg-blue-500'}`}></div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 leading-tight">
                        {c.patient?.demographics?.fullName || 'Unknown Patient'}
                      </h2>
                      <div className="text-sm text-slate-500 mt-0.5">
                        {c.patient?.demographics?.age ? `${c.patient.demographics.age}y` : 'Age unknown'} • {c.patient?.demographics?.gender || 'Unknown gender'}
                      </div>
                    </div>
                    {getPriorityBadge(c.priority)}
                  </div>
                  
                  <div className="mb-5 flex-1">
                    <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider mb-1">Current Complaint</p>
                    <p className="text-slate-800 text-sm font-medium line-clamp-2">
                      {c.chiefComplaint}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-5">
                    {c.attentionFlagsCount > 0 && (
                      <span className="flex items-center text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded border border-red-100">
                        <AlertTriangle className="w-3 h-3 mr-1" /> {c.attentionFlagsCount} Attention
                      </span>
                    )}
                    {c.conflictCount > 0 && (
                      <span className="flex items-center text-xs font-medium text-orange-700 bg-orange-50 px-2 py-1 rounded border border-orange-100">
                        <Layers className="w-3 h-3 mr-1" /> {c.conflictCount} Conflict(s)
                      </span>
                    )}
                    {c.documentCount > 0 && (
                      <span className="flex items-center text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                        <FileText className="w-3 h-3 mr-1" /> {c.documentCount} Docs
                      </span>
                    )}
                    {c.hasAbdm && (
                      <span className="flex items-center text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded border border-green-100">
                        🏥 ABDM
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                    <div className="flex items-center text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      Waiting {Math.floor((new Date().getTime() - new Date(c.handoffAt || new Date()).getTime()) / 60000)} min
                    </div>
                    <button className="text-blue-600 text-sm font-semibold hover:text-blue-800">
                      OPEN CASE →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
