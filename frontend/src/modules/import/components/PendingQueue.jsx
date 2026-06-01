import React from 'react';
import { AlertCircle, RefreshCw, Trash2, UserPlus } from 'lucide-react';

export function PendingQueue({ pendingLeads = [], loading, onRouteSingle, onDeleteSingle }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Central Pending Queue</h3>
          <p className="text-[10px] font-medium text-slate-400 mt-0.5">Leads blocked from automated routing logic paths</p>
        </div>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-[800px] text-[11px]">
          <thead>
            <tr className="bg-slate-50/60 dark:bg-slate-800/50 text-[9px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <th className="px-4 py-3">Lead Name</th>
              <th className="px-4 py-3">Destination Nation</th>
              <th className="px-4 py-3">Course Target</th>
              <th className="px-4 py-3">Source Stream</th>
              <th className="px-4 py-3">Blockage Factor</th>
              <th className="px-4 py-3 text-right pr-6">Manual Override</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-600 dark:text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 animate-pulse">Syncing unassigned datagrid structures...</td>
              </tr>
            ) : pendingLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">Queue completely clear. All imports assigned successfully.</td>
              </tr>
            ) : (
              pendingLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{lead.full_name}</td>
                  <td className="px-4 py-3 text-emerald-600 font-bold">{lead.country || "—"}</td>
                  <td className="px-4 py-3 text-blue-600 font-bold">{lead.interested_course || "—"}</td>
                  <td className="px-4 py-3">{lead.lead_source || "Manual Batch"}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-rose-600">
                      <AlertCircle size={12} /> Rule Mismatch Fallback
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right pr-6">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onRouteSingle(lead.id)} title="Retry Assignment" className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer">
                        <RefreshCw size={13} />
                      </button>
                      <button onClick={() => onDeleteSingle(lead.id)} title="Purge Record" className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}