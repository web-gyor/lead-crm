import React from 'react';
import { Trash2, UserCheck, Edit3, X, CheckSquare, RotateCcw } from 'lucide-react';

interface LeadBulkToolbarProps {
  selectedLeads: number[];
  setSelectedLeads: (ids: number[]) => void;
  bulkMode: "assign" | "edit" | "delete" | "restore"; // Added restore literal type
  setBulkMode: (mode: "assign" | "edit" | "delete" | "restore") => void;
  targetCounselorId: string;
  setTargetCounselorId: (id: string) => void;
  bulkSourceId: string;
  setBulkSourceId: (id: string) => void;
  bulkStatus: string;
  setBulkStatus: (status: string) => void;
  counselors: any[];
  sourceOptions: any[];
  statusOptions: readonly { readonly value: string; readonly label: string }[];
  handleBulkAssign: () => void;
  handleBulkUpdate: () => void;
  setShowBulkDeleteModal: (show: boolean) => void;
  isBulkLoading: boolean;
  // CORE LANE INTERCEPTOR PROP INJECTED
  activeStatus: string;
  handleBulkRestore?: () => void; // Optional handler method callback for cold storage tracks
}

export const LeadBulkToolbar = React.memo(({
  selectedLeads,
  setSelectedLeads,
  bulkMode,
  setBulkMode,
  targetCounselorId,
  setTargetCounselorId,
  bulkSourceId,
  setBulkSourceId,
  bulkStatus,
  setBulkStatus,
  counselors,
  sourceOptions,
  statusOptions,
  handleBulkAssign,
  handleBulkUpdate,
  setShowBulkDeleteModal,
  isBulkLoading,
  activeStatus,
  handleBulkRestore
}: LeadBulkToolbarProps) => {
  
  // Reset or initialize matching mode blocks natively when shifting to cold storage views
  React.useEffect(() => {
    if (activeStatus === "Cold Storage" && bulkMode !== "restore" && bulkMode !== "delete") {
      setBulkMode("restore");
    } else if (activeStatus !== "Cold Storage" && bulkMode === "restore") {
      setBulkMode("assign");
    }
  }, [activeStatus, bulkMode, setBulkMode]);

  if (selectedLeads.length === 0) return null;

  // Dynamically tailor operations configuration list based on current active tab context
  const operationalModes = activeStatus === "Cold Storage"
    ? (["restore", "delete"] as const)
    : (["assign", "edit", "delete"] as const);

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-2 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition-all duration-200 animate-slide-down mt-2">
      
      {/* LEFT SIDE: Active Checked Selection Indicator & Mode Segmented Chips */}
      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-1 rounded-lg border border-blue-100/50 dark:border-blue-900/30">
          <CheckSquare size={13} className="shrink-0" />
          <span className="font-semibold">{selectedLeads.length} checked</span>
        </div>

        {/* Minimal Sub-Segment Workspace Adaptive Controller */}
        <div className="flex bg-slate-200/50 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200/20">
          {operationalModes.map((mode) => {
            const isActive = bulkMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setBulkMode(mode)}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium text-[11px] uppercase tracking-wider ${
                  isActive
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-3xs font-semibold"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {mode === "assign" ? "Assign" : mode === "edit" ? "Edit" : mode === "restore" ? "Restore" : "Delete"}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* RIGHT SIDE: Dynamic Parameter Selectors and Transaction Triggers */}
      <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
        {bulkMode === "assign" && activeStatus !== "Cold Storage" && (
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <select
              value={targetCounselorId}
              onChange={(e) => setTargetCounselorId(e.target.value)}
              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer min-w-[140px] focus:border-blue-500"
            >
              <option value="">Choose counselor...</option>
              {counselors.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleBulkAssign}
              disabled={isBulkLoading || !targetCounselorId}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              Apply
            </button>
          </div>
        )}

        {bulkMode === "edit" && activeStatus !== "Cold Storage" && (
          <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
            <select
              value={bulkSourceId}
              onChange={(e) => setBulkSourceId(e.target.value)}
              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer min-w-[120px] focus:border-blue-500"
            >
              <option value="">Source...</option>
              {sourceOptions.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer min-w-[120px] focus:border-blue-500"
            >
              <option value="">Status...</option>
              {statusOptions.filter(o => o.value !== "all").map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleBulkUpdate}
              disabled={isBulkLoading || (!bulkSourceId && !bulkStatus)}
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              Update
            </button>
          </div>
        )}

        {/* NEW: CONTEXTUAL COLD STORAGE RESTORATION ACTION EXECUTOR */}
        {bulkMode === "restore" && activeStatus === "Cold Storage" && (
          <button
            type="button"
            onClick={handleBulkRestore}
            disabled={isBulkLoading}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all shadow-xs active:scale-98"
          >
            <RotateCcw size={12} />
            <span>{isBulkLoading ? "Processing..." : "Restore Selected"}</span>
          </button>
        )}

        {bulkMode === "delete" && (
          <button
            type="button"
            onClick={() => setShowBulkDeleteModal(true)}
            className="flex items-center gap-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all shadow-xs"
          >
            <Trash2 size={12} />
            <span>Delete Selected</span>
          </button>
        )}

        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block" />

        <button
          type="button"
          onClick={() => setSelectedLeads([])}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
});

LeadBulkToolbar.displayName = 'LeadBulkToolbar';