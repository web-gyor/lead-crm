import React, { useState, useRef } from "react";
import { Search, X, Zap, ChevronRight, UserCircle2 } from "lucide-react";
import { STATUS_FILTER_OPTIONS } from "../../constants/statusConfig";
import { getStatusCfg, getAvatarColor } from "../../utils/communicationHelpers";

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
export const EmptyState = React.memo(function EmptyState({
  title,
  message,
  icon: Icon,
}: {
  title: string;
  message: string;
  icon: React.ComponentType<any>;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2 select-none animate-in fade-in duration-100">
      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center">
        <Icon size={18} className="text-slate-300 dark:text-slate-600" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</p>
      <p className="text-[9px] text-slate-400 dark:text-slate-500 text-center max-w-[180px] font-medium leading-normal">{message}</p>
    </div>
  );
});

// ─── LOADING SKELETON ─────────────────────────────────────────────────────────
export const LoadingSkeleton = React.memo(function LoadingSkeleton({
  type = "list",
}: {
  type?: "list" | "timeline";
}) {
  if (type === "timeline") {
    return (
      <div className="space-y-4 py-4 select-none animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0" />
            <div className="flex-1 bg-slate-50 dark:bg-slate-800 h-16 rounded-2xl rounded-tl-sm border border-slate-100 dark:border-slate-700" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center py-20 gap-2 text-slate-400 select-none animate-pulse">
      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Loading Matrices...</span>
    </div>
  );
});

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
export const StatusBadge = React.memo(function StatusBadge({
  status,
}: {
  status?: string;
}) {
  const { dot, badge } = getStatusCfg(status);
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase select-none tracking-wider shrink-0 ${badge}`}
    >
      <span className={`w-1 h-1 rounded-full ${dot} shrink-0`} />
      {status?.replace("Follow-up Needed", "Follow-up")}
    </span>
  );
});

// ─── LEAD LIST PANEL ──────────────────────────────────────────────────────────
interface Lead {
  id: number;
  full_name: string;
  phone?: string;
  email?: string;
  lead_status?: string;
  interested_course?: string;
}

interface LeadListPanelProps {
  leads: Lead[];
  filteredLeads: Lead[];
  selectedLead: Lead | null;
  onSelectLead: (lead: Lead) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusCounts: Record<string, number>;
  loading: boolean;
}

export const LeadListPanel = React.memo(function LeadListPanel({
  leads,
  filteredLeads,
  selectedLead,
  onSelectLead,
  statusFilter,
  setStatusFilter,
  searchTerm,
  setSearchTerm,
  statusCounts,
  loading,
}: LeadListPanelProps) {
  return (
    <div
      className={`flex flex-col border-r border-slate-100 dark:border-slate-800/80
        w-full lg:w-[320px] xl:w-[360px] shrink-0 h-full min-w-0 min-h-0 overflow-hidden text-sm font-normal antialiased
        ${selectedLead ? "hidden lg:flex" : "flex"}`}
    >
      {/* ── HEADER DECK ── */}
      {/* Adjusted padding from px-5 to px-6 to blend natively with the app layout structure */}
      <div className="shrink-0 px-6 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800/80 space-y-3.5 w-full overflow-hidden select-none">

        {/* Brand layout title alignment trail row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-600/10 shrink-0">
              <Zap size={13} className="text-white" fill="currentColor" />
            </div>
            <div className="min-w-0">
              {/* Synchronized path breadcrumbs */}
              <nav className="flex items-center gap-1 text-[9px] text-slate-400 font-black uppercase tracking-wider mb-0.5">
                <span>CRM Hub</span>
                <ChevronRight size={8} strokeWidth={3} className="text-slate-300" />
                <span className="text-slate-600 dark:text-slate-400">Comm Hub</span>
              </nav>
              {/* Scaled explicit text-sm font-black title layer */}
              <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide leading-none truncate">
                Communications Hub
              </h1>
            </div>
          </div>
          
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 uppercase tracking-wider shrink-0 whitespace-nowrap">
            {leads.length} Nodes
          </span>
        </div>

        {/* Input Text Filter Signature search field */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
          <input
            type="text"
            placeholder="Search name or phone number…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all dark:text-white placeholder:text-slate-400 placeholder:font-normal"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Horizontal Overflow Category Filter Strip Selection Track */}
        <div
          className="w-full comm-hub-status-strip"
          style={{
            overflowX: "auto",
            overflowY: "hidden",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          onMouseDown={(e) => {
            const el = e.currentTarget;
            const startX = e.pageX - el.offsetLeft;
            const scrollLeft = el.scrollLeft;
            const onMove = (ev: MouseEvent) => {
              el.scrollLeft = scrollLeft - (ev.pageX - el.offsetLeft - startX);
            };
            const onUp = () => {
              window.removeEventListener("mousemove", onMove);
              window.removeEventListener("mouseup", onUp);
            };
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
          }}
        >
          {/* Added a subtle matching start gap padding inside the horizontal strip layout context */}
          <div
            className="flex items-center gap-1.5 select-none py-px pl-0.5"
            style={{ width: "max-content", flexWrap: "nowrap" }}
          >
            {STATUS_FILTER_OPTIONS.map((s) => {
              const cfg = getStatusCfg(s === "all" ? undefined : s);
              const active = statusFilter === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  style={{ flexShrink: 0 }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                    text-[9px] font-black uppercase tracking-wider whitespace-nowrap
                    border transition-all cursor-pointer
                    ${active
                      ? "bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900 shadow-xs"
                      : "bg-slate-50 border-slate-200/60 text-slate-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                >
                  {s !== "all" && (
                    <span
                      className={`w-1 h-1 rounded-full shrink-0 ${
                        active ? "bg-white dark:bg-slate-900" : cfg.dot
                      }`}
                    />
                  )}
                  <span>{s === "all" ? "All Channels" : s.replace("Follow-up Needed", "Follow-up")}</span>
                  {s !== "all" && statusCounts[s] ? (
                    <span className="opacity-60 ml-0.5 font-mono text-[9px]">
                      {statusCounts[s]}
                    </span>
                  ) : null}
                </button>
              );
            })}
            {/* Extended padding width block to keep trailing elements neatly structured away from edges */}
            <div style={{ width: "24px", flexShrink: 0 }} />
          </div>
        </div>

        <style>{`
          .comm-hub-status-strip::-webkit-scrollbar { display: none !important; }
        `}</style>
      </div>

      {/* ── LEAD WORKSPACE INDEX LIST PANEL AREA ── */}
      <div
        className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/40"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {loading ? (
          <LoadingSkeleton type="list" />
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 select-none">
            <UserCircle2 size={24} className="text-slate-200 dark:text-slate-800" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              No matching pipelines
            </p>
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const isSelected = selectedLead?.id === lead.id;
            return (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className={`flex items-center gap-3 px-6 py-3.5 cursor-pointer transition-all ${
                  isSelected
                    ? "bg-blue-50/60 dark:bg-blue-950/20 border-r-2 border-r-blue-600"
                    : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs uppercase shrink-0 transition-all ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                      : `${getAvatarColor(lead.full_name || "")} text-white`
                  }`}
                >
                  {lead.full_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-[11px] font-black uppercase truncate mb-0.5 ${
                      isSelected
                        ? "text-blue-700 dark:text-blue-400"
                        : "text-slate-800 dark:text-white"
                    }`}
                  >
                    {lead.full_name}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={lead.lead_status} />
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono truncate">
                      {lead.phone}
                    </span>
                  </div>
                </div>
                <ChevronRight
                  size={12}
                  className={`shrink-0 transition-all ${
                    isSelected
                      ? "text-blue-600 translate-x-0.5"
                      : "text-slate-300 dark:text-slate-700"
                  }`}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});