import { useState, useEffect, useCallback } from "react";
import {
  Phone, Headphones, User, Star, Search,
  Clock, Calendar, RefreshCw, Mic, MicOff,
  ChevronLeft, ChevronRight, Trash2,
} from "lucide-react";
import { apiGet, apiPut } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CallLog {
  id: number;
  lead_name: string | null;
  user_name: string | null;
  direction: "inbound" | "outbound";
  duration: number;
  recording_url: string | null;
  call_status: string;
  admin_feedback: string | null;
  created_at: string;
}

interface Pagination {
  total: number;
  totalPages: number;
  page: number;
}

interface Counselor {
  id: number;
  name: string;
}

interface Filters {
  page: number;
  search: string;
  counselorId: string;
  selectedDate: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns today's date in YYYY-MM-DD using the LOCAL timezone, not UTC */
const getLocalToday = (): string => {
  const date   = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .split("T")[0];
};

const formatDuration = (secs: number): string => {
  if (!secs) return "0s";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed:  "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    missed:     "bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400",
    busy:       "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    no_answer:  "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${map[status] ?? map.no_answer}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function DirectionBadge({ direction }: { direction: "inbound" | "outbound" }) {
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
      direction === "inbound"
        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        : "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
    }`}>
      {direction === "inbound" ? <Phone size={9} /> : <Phone size={9} className="rotate-[135deg]" />}
      {direction}
    </span>
  );
}

function FeedbackSection({
  call,
  isAdmin,
  editingId,
  feedbackText,
  onEdit,
  onCancel,
  onTextChange,
  onSave,
}: {
  call: CallLog;
  isAdmin: boolean;
  editingId: number | null;
  feedbackText: string;
  onEdit: (id: number, existing: string) => void;
  onCancel: () => void;
  onTextChange: (v: string) => void;
  onSave: (id: number) => void;
}) {
  const isEditing = editingId === call.id;

  return (
    <div className="mt-3 p-3 bg-gray-50/80 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
      <div className="flex items-center gap-1.5 mb-2">
        <Star size={11} className={call.admin_feedback ? "text-amber-400" : "text-gray-300"} fill={call.admin_feedback ? "currentColor" : "none"} />
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Performance Review</p>
      </div>

      {isAdmin ? (
        isEditing ? (
          <div className="space-y-2">
            <textarea
              value={feedbackText}
              onChange={(e) => onTextChange(e.target.value)}
              className="w-full p-2.5 text-[11px] font-medium border border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-900 dark:text-white outline-none focus:border-blue-400 transition-colors resize-none"
              placeholder="Write performance feedback..."
              rows={2}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => onSave(call.id)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors">
                Save
              </button>
              <button onClick={onCancel}
                className="text-gray-400 hover:text-gray-600 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-start gap-3">
            <p className="text-[11px] text-gray-500 dark:text-gray-400 italic leading-relaxed flex-1">
              {call.admin_feedback || "No feedback yet — tap Edit to add."}
            </p>
            <button
              onClick={() => onEdit(call.id, call.admin_feedback ?? "")}
              className="shrink-0 px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-blue-600 text-[9px] font-black uppercase tracking-widest shadow-sm hover:border-blue-300 transition-colors"
            >
              {call.admin_feedback ? "Edit" : "Add"}
            </button>
          </div>
        )
      ) : (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium italic">
          {call.admin_feedback || "Awaiting supervisor review..."}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CallTracker() {
  const { user } = useAuth();
  const isAdmin  = user?.role === "Admin";

  const [calls, setCalls]           = useState<CallLog[]>([]);
  const [loading, setLoading]       = useState(true);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, totalPages: 1, page: 1 });

  // Feedback editing state
  const [editingLogId, setEditingLogId]   = useState<number | null>(null);
  const [feedbackText, setFeedbackText]   = useState("");

  // Filters — selectedDate defaults to local today (not UTC)
  const [filters, setFilters] = useState<Filters>({
    page:         1,
    search:       "",
    counselorId:  "",
    selectedDate: getLocalToday(),
  });
const [searchInput, setSearchInput] = useState(filters.search);
  // ─── Fetch calls ──────────────────────────────────────────────────────────

  const fetchCalls = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        localDate:   filters.selectedDate,
        counselorId: filters.counselorId,
        search:      filters.search,
        page:        String(filters.page),
        limit:       "20",
      });

      const res = await apiGet(`/api/telephony/logs?${params.toString()}`);

      if (res?.success) {
        setCalls(res.data ?? []);
        setPagination(res.pagination ?? { total: 0, totalPages: 1, page: 1 });
      } else {
        toast.error("Failed to load call logs");
      }
    } catch (err) {
      console.error("CALL_FETCH_ERROR:", err);
      toast.error("Failed to load call logs");
    } finally {
      setLoading(false);
    }
}, [
  filters.selectedDate,
  filters.counselorId,
  filters.search,
  filters.page,
]);

  // ─── Load staff dropdown (admin only, once) ───────────────────────────────
  useEffect(() => {
  const timer = setTimeout(() => {
    setFilter("search", searchInput);
  }, 400);

  return () => clearTimeout(timer);
}, [searchInput]);

useEffect(() => {
  if (!isAdmin) return;

  apiGet("/api/staff-performance/dropdown")
    .then((res) => {
      const data = res?.success ? res.data : Array.isArray(res) ? res : [];
      setCounselors(data);
    })
    .catch(() => {
      apiGet("/api/users").then((res) =>
        setCounselors(res?.data ?? res ?? [])
      );
    });
}, [isAdmin]);

  // ─── Re-fetch when filters change ────────────────────────────────────────

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // ─── Filter helpers ───────────────────────────────────────────────────────

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value, ...(key !== "page" ? { page: 1 } : {}) }));
  };

  // ─── Feedback ─────────────────────────────────────────────────────────────

  const handleEditFeedback = (id: number, existing: string) => {
    setEditingLogId(id);
    setFeedbackText(existing);
  };

  const handleSaveFeedback = async (id: number) => {
    try {
      await apiPut("/api/telephony/feedback", { logId: id, feedback: feedbackText });
      toast.success("Feedback saved");
      setEditingLogId(null);
      setFeedbackText("");
      fetchCalls();
    } catch {
      toast.error("Failed to save feedback");
    }
  };

  // ─── Clear old logs ───────────────────────────────────────────────────────

  const handleClearLogs = async () => {
    if (!window.confirm("Delete all previous month call logs?\n\nOnly current month logs will be kept.")) return;
    try {
      const res = await apiPut("/api/telephony/clear-old-logs");
      if (res?.success) {
        toast.success("Previous month logs cleared");
        fetchCalls();
      } else {
        toast.error("Failed to clear logs");
      }
    } catch {
      toast.error("Cleanup failed");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-12 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20 shrink-0">
            <Headphones size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Call Tracker
            </h1>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-0.5">
              {pagination.total} Records · Quality Assurance & Logs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={handleClearLogs}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700 hover:text-red-500 hover:border-red-200 dark:hover:border-red-800 shadow-sm"
            >
              <Trash2 size={12} /> Clear Logs
            </button>
          )}
          <button
            onClick={fetchCalls}
            disabled={loading}
            className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 hover:text-blue-600 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
        <div className={`grid gap-3 ${isAdmin ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
  type="text"
  placeholder="Search lead or agent..."
  value={searchInput}
  onChange={(e) => setSearchInput(e.target.value)}
  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 dark:text-white outline-none focus:border-blue-400 transition-colors"
/>
          </div>

          {/* Date */}
          <input
            type="date"
            value={filters.selectedDate}
            onChange={(e) => setFilter("selectedDate", e.target.value)}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 dark:text-white outline-none focus:border-blue-400 transition-colors"
          />

          {/* Staff filter — admin only */}
          {isAdmin && (
            <select
              value={filters.counselorId}
              onChange={(e) => setFilter("counselorId", e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 dark:text-white outline-none focus:border-blue-400 transition-colors"
            >
              <option value="">All Staff</option>
              {counselors.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── Call Cards ── */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Fetching call records...</p>
          </div>

        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 dark:bg-gray-800/40 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
            <div className="w-14 h-14 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center shadow-sm mb-3">
              <Phone size={22} className="text-gray-200" />
            </div>
            <p className="text-[11px] font-black uppercase text-gray-400 tracking-widest">No Call Logs Found</p>
            <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">Try a different date or search term</p>
          </div>

        ) : (
          calls.map((call) => (
            <div
              key={call.id}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm transition-all hover:border-blue-200 dark:hover:border-blue-900/50"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                {/* Lead + Agent */}
                <div className="flex items-center gap-3 lg:w-1/4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                    <User size={18} className="text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black dark:text-white uppercase truncate tracking-tight">
                      {call.lead_name ?? "Unknown Lead"}
                    </p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest truncate">
                      {call.user_name ?? "Unassigned"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <DirectionBadge direction={call.direction} />
                      <StatusBadge status={call.call_status} />
                    </div>
                  </div>
                </div>

                {/* Recording */}
                <div className="flex-1 max-w-md bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3 py-2 border border-gray-100 dark:border-gray-700">
                  {call.recording_url ? (
                    <div className="flex items-center gap-2">
                      <Mic size={12} className="text-blue-400 shrink-0" />
                      <audio controls preload="none" className="w-full h-8">
                        <source src={call.recording_url} type="audio/mpeg" />
                      </audio>
                    </div>
                  ) : (
                    <div className="h-8 flex items-center justify-center gap-2">
                      <MicOff size={12} className="text-gray-300" />
                      <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                        No Recording
                      </span>
                    </div>
                  )}
                </div>

                {/* Duration + Date */}
                <div className="flex items-center gap-4 lg:flex-col lg:items-end shrink-0">
                  <div className="flex items-center gap-1 text-[11px] font-black dark:text-white uppercase tracking-tight">
                    <Clock size={11} className="text-blue-500" />
                    {formatDuration(call.duration)}
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold uppercase">
                    <Calendar size={10} />
                  {call.created_at
  ? new Date(call.created_at).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  : "-"}
                  </div>
                </div>
              </div>

              {/* Feedback */}
              <FeedbackSection
                call={call}
                isAdmin={isAdmin}
                editingId={editingLogId}
                feedbackText={feedbackText}
                onEdit={handleEditFeedback}
                onCancel={() => { setEditingLogId(null); setFeedbackText(""); }}
                onTextChange={setFeedbackText}
                onSave={handleSaveFeedback}
              />
            </div>
          ))
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter("page", filters.page - 1)}
              disabled={filters.page <= 1}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors bg-white dark:bg-gray-900"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => setFilter("page", filters.page + 1)}
              disabled={filters.page >= pagination.totalPages}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors bg-white dark:bg-gray-900"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}