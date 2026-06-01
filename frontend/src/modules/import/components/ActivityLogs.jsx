import React from 'react';
import { Download } from 'lucide-react';

export function ActivityLogs({ logs = [] }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
      <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Operational Audit Trail</h3>
          <p className="text-[10px] font-medium text-slate-400 mt-0.5">Real-time recording of lead distribution flow triggers</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer">
          <Download size={12} /> Export Audit CSV
        </button>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <p className="text-center py-12 text-xs text-slate-400 font-medium">No distribution engine logs recorded yet</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="flex items-start justify-between p-3 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/50 text-[11px]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                    log.status === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40'
                  }`}>
                    {log.status}
                  </span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{log.action}</p>
                </div>
                <p className="text-slate-400 text-[10px] font-medium">{log.notes}</p>
              </div>
              <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-4">{log.timestamp}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}