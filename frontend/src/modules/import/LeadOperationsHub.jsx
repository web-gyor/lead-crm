import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; 
import { 
  Zap, RefreshCw, Layers, FileSpreadsheet, Send, 
  Loader2, ChevronRight, Activity, Users, ShieldCheck, Clock 
} from 'lucide-react';

import { apiGet, apiPost } from '../../utils/api';
import BulkImport from './BulkImport';
import LeadDistribution from './LeadDistribution';

// 🎯 SWAPPED: Connected your centralized hook notification framework engine
import { useToast } from "../../hooks/useToast";

// ─── REUSABLE CORE INTERFACE WORKSPACE MODULE CHIPS ──────────────────────────
function MetricChip({ label, value, icon, badgeBg = "bg-blue-50 dark:bg-blue-950/40", badgeColor = "text-blue-600 dark:text-blue-400" }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 flex items-center justify-between transition-all duration-200 hover:shadow-xs">
      <div className="space-y-1.5 min-w-0">
        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 select-none">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{value}</span>
        </div>
      </div>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${badgeBg} ${badgeColor}`}>
        {icon}
      </div>
    </div>
  );
}

export default function LeadOperationsHub() {
  const { activeTab: routeTab } = useParams();
  const navigate = useNavigate();
  const activeTab = routeTab || 'import';

  // 🎯 INJECT UNIFIED MODERN HOOK PRIVILEGES
  const { addToast } = useToast();

  // ─── STATE HOOKS INFRASTRUCTURE ───────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [distributing, setDistributing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeCounselors, setActiveCounselors] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState("");

  const fetchHubData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // 🎯 FIXED PATHS: Pointing straight to the consolidated root paths
      const [pendingData, rulesData] = await Promise.all([
        apiGet("/api/distribution/pending-count"),
        apiGet("/api/distribution") // 👈 Changed from "/api/distribution/rules"
      ]);
      
      setPendingCount(pendingData?.count || 0);
      
      // Safely read the standard object data envelope sent by the backend
      const finalRulesArray = rulesData?.success ? rulesData.data : (Array.isArray(rulesData) ? rulesData : []);
      
      if (Array.isArray(finalRulesArray)) {
        const activeCount = finalRulesArray.filter(r => r.is_active && r.role !== "Manager").length;
        setActiveCounselors(activeCount);
      }
      
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncTime(time);
    } catch (err) {
      console.error("Central Command Matrix integration synchronization failure:", err);
      addToast("Central operational metrics telemetry sync drop-off detected", "info");
    } finally {
      setLoading(false);
    }
  }, [addToast]);
  
  useEffect(() => { 
    fetchHubData(); 
  }, [fetchHubData]);

  const handleGlobalRouteExecution = async () => {
    if (pendingCount === 0 || distributing) return;
    setDistributing(true);
    addToast("Firing active distribution engine allocation loops...", "info");
    try {
      const res = await apiPost("/api/distribution/run-pending", {});
      if (res.success) { 
        addToast(`Successfully distributed ${res.count} pending leads across active rules pools!`, "success");
        fetchHubData(true); 
      }
    } catch (err) { 
      addToast("Automation distribution vector pipeline exception", "error"); 
    } finally {
      setDistributing(false);
    }
  };

  return (
    <div className="space-y-4 pb-12 text-sm text-slate-900 dark:text-slate-100 font-normal antialiased">
      {/* 🎯 REMOVED: Deleted redundant global `<Toaster/>` context module chip layer layout wrapper node */}

      {/* FIXED HUB HEADER DECK */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4 select-none w-full shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
            <Zap size={14} className="text-white" fill="currentColor" />
          </div>
          <div>
            <nav className="flex items-center gap-1 text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">
              <span>CRM Hub</span>
              <ChevronRight size={10} strokeWidth={3} className="text-slate-300" />
              <span className="text-slate-600 dark:text-slate-400">Lead Workspace</span>
            </nav>
            <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide leading-none">
              Lead Operations Workspace
            </h1>
            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1.5 leading-none flex items-center gap-1.5">
              <span>Admissions Pipeline</span>
              <span className="inline-block w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
              <span>Last synced: {lastSyncTime || "Checking..."}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button 
            type="button" 
            onClick={() => fetchHubData(true)} 
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-white rounded-xl transition-all cursor-pointer shadow-none"
            title="Refresh State Matrix"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-blue-500" : ""} />
          </button>
          
          <button 
            type="button" 
            disabled={pendingCount === 0 || distributing} 
            onClick={handleGlobalRouteExecution} 
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-xs disabled:opacity-40 cursor-pointer"
          >
            {distributing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} strokeWidth={3} />}
            <span>Inject Queue ({pendingCount})</span>
          </button>
        </div>
      </header>

      {/* SYSTEM ENGINE DECK STRIP */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricChip 
          label="Pending Queue" 
          value={pendingCount === 0 ? "0 Leads" : `${pendingCount} Leads`} 
          icon={<Clock size={15} className={pendingCount > 0 ? "animate-pulse" : ""} />}
          badgeBg={pendingCount > 0 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-slate-50 dark:bg-slate-800/60"}
          badgeColor={pendingCount > 0 ? "text-amber-500" : "text-slate-400"}
        />
        <MetricChip 
          label="Auto Routing" 
          value={pendingCount > 0 ? "Active Load" : "Synced Log"} 
          icon={<Activity size={15} />}
          badgeBg={pendingCount > 0 ? "bg-blue-50 dark:bg-blue-950/30" : "bg-emerald-50 dark:bg-emerald-950/30"}
          badgeColor={pendingCount > 0 ? "text-blue-500" : "text-emerald-500"}
        />
        <MetricChip 
          label="Active Counselors" 
          value={`${activeCounselors} Rule Nodes`} 
          icon={<Users size={15} />}
          badgeBg="bg-emerald-50 dark:bg-emerald-950/30"
          badgeColor="text-emerald-500"
        />
        <MetricChip 
          label="Engine Status" 
          value="Operational" 
          icon={<ShieldCheck size={15} />}
          badgeBg="bg-blue-50 dark:bg-blue-950/30"
          badgeColor="text-blue-500"
        />
      </section>

      {/* PREVIOUS TAB SIZE DESIGN SYSTEM CHANNELS */}
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3 overflow-x-auto select-none" style={{ scrollbarWidth: 'none' }}>
        {[
          { id: 'import', label: 'Import Center', desc: 'CSV/XLSX validation pipeline', icon: <FileSpreadsheet size={14} /> },
          { id: 'distribution', label: 'Distribution Engine', desc: 'Assignment automation rules', icon: <Layers size={14} /> }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id} 
              type="button" 
              onClick={() => navigate(`/leads/operations-hub/${tab.id}`)} 
              className={`flex flex-col items-start px-5 py-2.5 rounded-xl border transition-all duration-150 cursor-pointer shrink-0 text-left min-w-[190px] ${
                isActive 
                  ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900 shadow-md shadow-slate-900/10' 
                  : 'bg-white border-slate-100 text-slate-500 dark:bg-slate-900 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide">
                {tab.icon}
                <span>{tab.label}</span>
              </div>
              <span className={`text-[10px] font-medium mt-0.5 tracking-tight ${isActive ? 'text-slate-300 dark:text-slate-500' : 'text-slate-400'}`}>
                {tab.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* FLAT INJECTION CANVAS */}
      <main className="w-full opacity-100 transition-opacity duration-75">
        {activeTab === 'import' && (
          <BulkImport 
            onImportSuccess={() => fetchHubData(true)} 
            isEmbedded={true} 
          />
        )}
        {activeTab === 'distribution' && (
          <LeadDistribution />
        )}
      </main>
    </div>
  );
}