import React, { useState } from 'react';
import { Database, CloudLightning, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { apiPut } from '../../../utils/api';
import { useToast } from '../../../hooks/useToast';

export const Backup: React.FC = () => {
  const { addToast } = useToast();
  const [triggering, setTriggering] = useState(false);
  const [lastManualBackup, setLastManualBackup] = useState<string>("Never triggered in current session");

const handleManualBackup = async () => {
    if (triggering) return;
    try {
      setTriggering(true);
      console.log("[FRONTEND API TRIGGER]: Dispatching payload directly to back-end routes...");
      
      // 🎯 DIAGNOSTIC: Capture the exact raw payload returned from your server
      const response = await apiPut("/settings/backup/trigger", {});
      console.log("[FRONTEND API SUCCESS RESPONSE]:", response);
      
      const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastManualBackup(`Successful snapshot created at ${timeString}`);
      addToast("Database cluster snapshot exported cleanly!", "success");
    } catch (err: any) {
      // 🎯 FORCE LOG: This lets you read the exact mechanical problem inside your browser inspector
      console.error("[FRONTEND API FAULT RUNTIME]: Detailed error layout object:", err);
      console.error("[FRONTEND API RESPONSE DATA]:", err?.response?.data);
      
      // Extract the genuine backend reason or fall back to an identifiable trace string
      const realServerMessage = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Unknown Network Route Error";
      
      addToast(`System Sync Halted: ${realServerMessage}`, "error");
    } finally {
      setTriggering(false);
    }
  };
  return (
    <div className="space-y-6 animate-in fade-in duration-300 select-none">
      
      {/* Primary Action Panel Card */}
      <div className="border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 rounded-2xl space-y-5 shadow-3xs">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800 pb-2">
          Infrastructure Datastore Backups
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/40 p-4 border border-slate-100 dark:border-slate-800/60 rounded-xl">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Database size={14} className="text-blue-500" /> Live MySQL Database Node
            </h4>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Generates a compressed database dump matrix (.sql.gz)
            </p>
          </div>
          
          <button
            onClick={handleManualBackup}
            disabled={triggering}
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 dark:bg-blue-500 disabled:opacity-60 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-3xs hover:opacity-90 active:scale-98 transition-all shrink-0"
          >
            <RefreshCw size={12} className={`stroke-[2.5] ${triggering ? 'animate-spin' : ''}`} />
            {triggering ? 'Compiling Snapshot...' : 'Trigger Manual Backup'}
          </button>
        </div>

        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight pl-1">
          Status Trace: <span className="text-slate-600 dark:text-slate-300">{lastManualBackup}</span>
        </p>
      </div>

      {/* Cloud Nodes Perimeter Status Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Node A: Automated Scheduling */}
        <div className="border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 rounded-xl flex items-start gap-3 shadow-3xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/10 shrink-0">
            <CheckCircle2 size={16} className="stroke-[2.2]" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Cron Daemon Status</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Automated Interval Active</p>
            <p className="text-[9px] text-slate-400 font-medium pt-1 leading-relaxed">
              System is scheduled to execute an incremental dump routine automatically every day at 02:00 AM.
            </p>
          </div>
        </div>

        {/* Node B: Cloud Storage Target */}
        <div className="border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 rounded-xl flex items-start gap-3 shadow-3xs">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/10 shrink-0">
            <CloudLightning size={16} className="stroke-[2.2]" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">S3 Storage Gateway</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Object Storage Node Active</p>
            <p className="text-[9px] text-slate-400 font-medium pt-1 leading-relaxed">
              Files are streamed instantly out of local servers to your external cloud buckets to ensure complete isolation.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};