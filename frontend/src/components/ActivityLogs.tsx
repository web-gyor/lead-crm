// src/pages/ActivityLogsPage.tsx
import { useEffect, useState, useMemo, useCallback } from "react";
import { apiGet, apiPost } from "../utils/api";
import {
  User, MessageSquare, ArrowRightLeft, ShieldCheck,
  RefreshCw, Activity, Download, Archive, Lock,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: number;
  user_name?: string;
  action_type?: string;
  description?: string;
  created_at?: string;
  student_name?: string;
  lead_id?: number;
}

type ActionType = "STATUS_UPDATE" | "NOTE_ADDED" | "ASSIGNED" | "LEAD_CREATED";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const ACTION_CONFIG: Record<ActionType, { label: string; color: string; icon: React.ReactNode }> = {
  STATUS_UPDATE: {
    label: "Status Update",
    color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    icon: <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />,
  },
  NOTE_ADDED: {
    label: "Note Added",
    color: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    icon: <MessageSquare className="w-3.5 h-3.5 text-green-500" />,
  },
  ASSIGNED: {
    label: "Assigned",
    color: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    icon: <User className="w-3.5 h-3.5 text-purple-500" />,
  },
  LEAD_CREATED: {
    label: "Lead Created",
    color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    icon: <Activity className="w-3.5 h-3.5 text-emerald-500" />,
  },
};

const DEFAULT_ACTION = {
  label: "Other",
  color: "bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  icon: <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />,
};

function getActionConfig(type?: string) {
  return ACTION_CONFIG[(type?.toUpperCase() as ActionType)] ?? { ...DEFAULT_ACTION, label: type || "Other" };
}

function formatTimestamp(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PaginationButton({
  onClick, disabled, active, children, title,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  const base = "flex items-center justify-center w-8 h-8 rounded-lg text-[11px] font-black transition-all";
  const cls = disabled
    ? `${base} bg-gray-50 dark:bg-gray-800 text-gray-300 cursor-not-allowed border border-gray-100 dark:border-gray-700`
    : active
    ? `${base} bg-blue-600 text-white shadow-sm`
    : `${base} bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 hover:border-blue-400 hover:text-blue-600`;

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls} title={title}>
      {children}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ActivityLogsPage() {
  const [logs, setLogs]           = useState<LogEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [search, setSearch]       = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState<number>(20);

  // ── Data ──────────────────────────────────────────────────────────────────

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet("/api/activity/global");
      const raw = res?.data ?? (Array.isArray(res) ? res : []);
      setLogs(raw);
      setPage(1);
    } catch (err) {
      console.error("Failed to load activity logs:", err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [search, typeFilter, pageSize]);

  // ── Filtering & Pagination ────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = logs;
    if (typeFilter !== "all") {
      result = result.filter((l) => l.action_type?.toUpperCase() === typeFilter);
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.user_name?.toLowerCase().includes(term) ||
          l.student_name?.toLowerCase().includes(term) ||
          l.description?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [logs, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const startIdx   = (safePage - 1) * pageSize;
  const paginated  = filtered.slice(startIdx, startIdx + pageSize);

  const pageNumbers = useMemo(() => {
    const delta = 2;
    const range: number[] = [];
    for (
      let i = Math.max(1, safePage - delta);
      i <= Math.min(totalPages, safePage + delta);
      i++
    ) range.push(i);
    return range;
  }, [safePage, totalPages]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleExport = () => {
    const token = localStorage.getItem("token");
    fetch("/api/activity/export", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a   = Object.assign(document.createElement("a"), {
          href: url, download: "activity_logs.csv",
        });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch((err) => console.error("Export failed:", err));
  };

  const handleArchive = async () => {
    if (!window.confirm("Archive all logs older than 12 months? This cannot be undone.")) return;
    setArchiving(true);
    try {
      const res: any = await apiPost("/api/activity/archive", {});
      alert(`✅ ${res?.message ?? "Archive complete"}`);
      fetchLogs();
    } catch {
      alert("❌ Archive failed. Please try again.");
    } finally {
      setArchiving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pb-12 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
              <Activity size={16} className="text-white" />
            </span>
            Activity Logs
          </h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">
            {filtered.length} Events · Full Audit Trail
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchLogs}
            aria-label="Refresh logs"
            className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 hover:text-blue-600 transition-colors shadow-sm"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-black text-gray-600 dark:text-gray-300 hover:text-emerald-600 hover:border-emerald-300 transition-all shadow-sm uppercase tracking-widest"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>

          <button
            type="button"
            onClick={handleArchive}
            disabled={archiving}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-black text-gray-600 dark:text-gray-300 hover:text-orange-500 hover:border-orange-300 transition-all shadow-sm uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Archive size={13} />
            <span className="hidden sm:inline">{archiving ? "Archiving…" : "Archive Old"}</span>
            <span className="sm:hidden">{archiving ? "…" : "Archive"}</span>
          </button>
        </div>
      </div>

      {/* ── Read-only notice ── */}
      <div className="flex items-start sm:items-center gap-2.5 px-4 py-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-2xl">
        <Lock size={13} className="text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
        <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest leading-relaxed">
          Read-Only Audit Trail — Logs cannot be edited or deleted.
        </p>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by staff, lead or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 pr-9 text-xs font-bold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-gray-700 dark:text-gray-300 placeholder:text-gray-400 placeholder:font-normal transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 text-xs font-bold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-gray-700 dark:text-gray-300 transition-all sm:w-44"
        >
          <option value="all">All Types</option>
          <option value="STATUS_UPDATE">Status Update</option>
          <option value="NOTE_ADDED">Note Added</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="LEAD_CREATED">Lead Created</option>
        </select>
      </div>

      {/* ── Log list ── */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Loading Audit Trail…
            </p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
              No activity found
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {paginated.map((log) => {
              const cfg = getActionConfig(log.action_type);
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 sm:gap-4 px-4 sm:px-6 py-4 hover:bg-blue-50/10 dark:hover:bg-blue-900/5 transition-colors group"
                >
                  {/* Icon */}
                  <div className="mt-0.5 w-7 h-7 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center shrink-0 group-hover:border-blue-300 transition-colors">
                    {cfg.icon}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                      <span className="text-[11px] font-black text-gray-900 dark:text-white">
                        {log.user_name || "System"}
                      </span>
                      {log.student_name && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">→</span>
                          <span className="text-[10px] font-bold text-blue-600 truncate max-w-[120px] sm:max-w-none">
                            {log.student_name}
                          </span>
                        </>
                      )}
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                      {log.description}
                    </p>
                    {/* Timestamp shown inline on mobile */}
                    <p className="sm:hidden text-[9px] font-black text-gray-400 uppercase tracking-tight mt-1.5">
                      {formatTimestamp(log.created_at)}
                      {log.lead_id && (
                        <span className="ml-2 text-gray-300">· Lead #{log.lead_id}</span>
                      )}
                    </p>
                  </div>

                  {/* Timestamp — right column on desktop only */}
                  <div className="hidden sm:block shrink-0 text-right">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-tight whitespace-nowrap">
                      {formatTimestamp(log.created_at)}
                    </span>
                    {log.lead_id && (
                      <p className="text-[8px] text-gray-300 dark:text-gray-600 font-bold mt-0.5">
                        Lead #{log.lead_id}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination footer ── */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 sm:px-6 py-4 border-t border-gray-50 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">

            {/* Range + page-size selector */}
            <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                {startIdx + 1}–{Math.min(startIdx + pageSize, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black text-gray-400 uppercase">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="text-[10px] font-black bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 outline-none focus:border-blue-500 transition-all"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Page buttons */}
            <div className="flex items-center gap-1">
              <PaginationButton onClick={() => setPage(1)} disabled={safePage === 1} title="First">
                <ChevronsLeft size={13} />
              </PaginationButton>
              <PaginationButton onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} title="Previous">
                <ChevronLeft size={13} />
              </PaginationButton>

              {pageNumbers[0] > 1 && (
                <>
                  <PaginationButton onClick={() => setPage(1)}>1</PaginationButton>
                  {pageNumbers[0] > 2 && (
                    <span className="w-8 h-8 flex items-center justify-center text-[11px] text-gray-400">…</span>
                  )}
                </>
              )}

              {pageNumbers.map((n) => (
                <PaginationButton key={n} onClick={() => setPage(n)} active={n === safePage}>
                  {n}
                </PaginationButton>
              ))}

              {pageNumbers[pageNumbers.length - 1] < totalPages && (
                <>
                  {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                    <span className="w-8 h-8 flex items-center justify-center text-[11px] text-gray-400">…</span>
                  )}
                  <PaginationButton onClick={() => setPage(totalPages)}>{totalPages}</PaginationButton>
                </>
              )}

              <PaginationButton onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} title="Next">
                <ChevronRight size={13} />
              </PaginationButton>
              <PaginationButton onClick={() => setPage(totalPages)} disabled={safePage === totalPages} title="Last">
                <ChevronsRight size={13} />
              </PaginationButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}