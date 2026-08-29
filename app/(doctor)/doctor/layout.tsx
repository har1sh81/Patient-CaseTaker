import * as React from 'react';
import { Activity } from 'lucide-react';

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-slate-900 text-white h-14 px-6 flex items-center justify-between shrink-0 shadow-md z-20">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center font-black text-lg shadow-sm border border-blue-500">
            MK
          </div>
          <div>
            <h1 className="text-base font-bold leading-none tracking-wide text-gray-100">MEDIKIOSK</h1>
            <p className="text-[10px] uppercase text-blue-300 font-medium tracking-wider">Doctor Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="flex items-center text-slate-300">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
            System Online
          </div>
          <div className="h-6 w-px bg-slate-700 mx-2"></div>
          <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
            <div className="w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
              <Activity className="w-4 h-4 text-slate-400" />
            </div>
            Dr. Demo User
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {children}
      </main>
    </div>
  );
}
