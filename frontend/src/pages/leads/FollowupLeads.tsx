// src/pages/leads/FollowupLeads.tsx
import { useState, useEffect, useCallback } from "react";
import {
  Search, Trash2, Download, Phone, MessageCircle,
  Edit3, X, Calendar, Clock, Globe, Zap, AlertCircle, UserCheck,
} from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../utils/api";
import toast from "react-hot-toast";
import PaginationFooter from "../../components/leads/PaginationFooter";
import LeadEditModal from "../../components/leads/LeadEditModal";
import DeleteModal from "../../components/DeleteModal";

// ─── Constants ────────────────────────────────────────────────────────────────

const LEAD_STATUS = "Follow-up";

const RANGE_BTNS = [
  { id: "today",      label: "Today",      icon: <Zap size={11} />      },
  { id: "this_week",  label: "This Week",  icon: <Clock size={11} />     },
  { id: "this_month", label: "This Month", icon: <Calendar size={11} />  },
  { id: "this_year",  label: "This Year",  icon: <Calendar size={11} />  },
  { id: "all",        label: "All Time",   icon: <Globe size={11} />     },
] as const;

const BULK_STATUS_OPTIONS = [
  { value: "Converted",      label: "🎓 Enrolled (Won)"     },
  { value: "Interested",     label: "⭐ Back to Interested"  },
  { value: "Lost",           label: "❌ Mark as Lost"        },
  { value: "Not Interested", label: "🚫 Mark as Rejected"    },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type BulkMode = "assign" | "edit" | "delete";

interface Filters {
  search: string;
  sourceId: string;
  counselorId: string;
  range: string;
  startDate: string;
  endDate: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRangeDates(range: string): { startDate: string; endDate: string } | null {
  if (range === "all" || range === "custom") return null;
  const today = new Date(); today.setHours(23, 59, 59, 999);
  const start = new Date(); start.setHours(0, 0, 0, 0);
  if (range === "this_week") {
    const d = start.getDay();
    start.setDate(start.getDate() - d + (d === 0 ? -6 : 1));
  } else if (range === "this_month") {
    start.setDate(1);
  } else if (range === "this_year") {
    start.setMonth(0, 1);
  }
  return { startDate: start.toISOString().split("T")[0], endDate: today.toISOString().split("T")[0] };
}

function fmtDate(iso?: string) {
  if (!iso || iso === "0000-00-00") return null;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function getFollowUpStatus(dateStr?: string): "overdue" | "today" | "upcoming" | null {
  if (!dateStr || dateStr === "0000-00-00") return null;
  const todayStr = new Date().toLocaleDateString("en-CA");
  const fuStr    = new Date(dateStr).toLocaleDateString("en-CA");
  if (fuStr < todayStr)  return "overdue";
  if (fuStr === todayStr) return "today";
  return "upcoming";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  "WHATSAPP":        "bg-green-50 text-green-600 border-green-200",
  "WALK-IN":         "bg-orange-50 text-orange-600 border-orange-200",
  "PHONE CALL":      "bg-blue-50 text-blue-600 border-blue-200",
  "WEBSITE INQUIRY": "bg-indigo-50 text-indigo-600 border-indigo-200",
  "REFERRAL":        "bg-purple-50 text-purple-600 border-purple-200",
  "SOCIAL MEDIA":    "bg-pink-50 text-pink-600 border-pink-200",
  "META ADS":        "bg-blue-600 text-white border-blue-700",
  "GOOGLE ADS":      "bg-emerald-50 text-emerald-700 border-emerald-200",
  "BULK IMPORT":     "bg-slate-100 text-slate-700 border-slate-300",
  "UNKNOWN":         "bg-gray-100 text-gray-500 border-gray-200",
};

function SourceBadge({ lead, sources }: { lead: any; sources: any[] }) {
  const src  = sources.find((s) => Number(s.id) === Number(lead.lead_source_id));
  const name = (src?.name || lead.lead_source_name || "UNKNOWN").toUpperCase();
  const cls  = SOURCE_COLORS[name] ?? "bg-slate-50 text-slate-500 border-slate-200";
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border shadow-sm ${cls}`}>
      {name}
    </span>
  );
}

function FollowUpCell({ dateStr, onSetDate }: { dateStr?: string; onSetDate: () => void }) {
  const status  = getFollowUpStatus(dateStr);
  const display = fmtDate(dateStr);

  if (!display) {
    return (
      <button type="button" onClick={onSetDate}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded text-[9px] font-black text-orange-600 uppercase transition-all hover:bg-orange-100">
        <AlertCircle size={11} /> Set Date
      </button>
    );
  }

  const cls =
    status === "overdue" ? "text-red-600 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded"
    : status === "today" ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded"
    : "text-orange-700 dark:text-orange-400";

  const icon =
    status === "overdue" ? <Calendar size={11} className="text-red-500 shrink-0" />
    : status === "today"  ? <Calendar size={11} className="text-blue-500 shrink-0" />
    : <Calendar size={11} className="text-orange-500 shrink-0" />;

  const label =
    status === "overdue" ? "⚠ Overdue"
    : status === "today"  ? "📅 Today"
    : null;

  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <div>
        <span className={`text-[11px] font-bold ${cls}`}>{display}</span>
        {label && <p className="text-[8px] font-black uppercase tracking-tighter mt-0.5 text-inherit opacity-80">{label}</p>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FollowupLeads() {

  // ── State ────────────────────────────────────────────────────────────────

  const [leads,         setLeads]         = useState<any[]>([]);
  const [counselors,    setCounselors]    = useState<any[]>([]);
  const [sourceOptions, setSourceOptions] = useState<any[]>([]);
  const [dbCourses,     setDbCourses]     = useState<any[]>([]);

  const [loading,     setLoading]     = useState(false);
  const [totalCount,  setTotalCount]  = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const [filters, setFilters] = useState<Filters>({
    search: "", sourceId: "", counselorId: "", range: "all", startDate: "", endDate: "",
  });

  const [selectedLeads,     setSelectedLeads]     = useState<number[]>([]);
  const [bulkMode,           setBulkMode]           = useState<BulkMode>("assign");
  const [targetCounselorId,  setTargetCounselorId]  = useState("");
  const [isBulkLoading,      setIsBulkLoading]      = useState(false);
  const [bulkSourceId,       setBulkSourceId]       = useState("");
  const [bulkStatus,         setBulkStatus]         = useState("");

  const [showEditForm, setShowEditForm] = useState(false);
  const [editingLead,  setEditingLead]  = useState<any>(null);
  const [editStatus,   setEditStatus]   = useState(LEAD_STATUS);

  const [deleteId,            setDeleteId]            = useState<number | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isDeleting,          setIsDeleting]          = useState(false);

  const isAdmin = JSON.parse(localStorage.getItem("user") || "{}")?.role?.toLowerCase() === "admin";

  // ── Derived ──────────────────────────────────────────────────────────────

  const hasActiveFilters = !!(
    filters.search || filters.sourceId || filters.counselorId ||
    filters.range !== "all" || filters.startDate || filters.endDate
  );
  const activeRangeId = (filters.startDate || filters.endDate) ? "custom" : filters.range;
  const allSelected   = selectedLeads.length === leads.length && leads.length > 0;
  const noneSelected  = selectedLeads.length === 0;

  const overdueCount = leads.filter((l) => getFollowUpStatus(l.next_follow_up_date) === "overdue").length;
  const todayCount   = leads.filter((l) => getFollowUpStatus(l.next_follow_up_date) === "today").length;

  // ── Filter helpers ────────────────────────────────────────────────────────

  const updateFilters = (patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: "", sourceId: "", counselorId: "", range: "all", startDate: "", endDate: "" });
    setCurrentPage(1);
  };

  const toggleSelect = (id: number) =>
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const toggleSelectAll = () =>
    setSelectedLeads(allSelected ? [] : leads.map((l) => l.id));

  // ── Load master data (ONE effect, counselors role-filtered) ───────────────

  useEffect(() => {
    const fetchMasters = async () => {
      const [usersRes, sourcesRes, coursesRes] = await Promise.allSettled([
        apiGet("/api/users"),
        apiGet("/api/lead-sources"),
        apiGet("/api/courses"),
      ]);

      if (usersRes.status === "fulfilled") {
        const all = Array.isArray(usersRes.value)
          ? usersRes.value
          : (usersRes.value?.data ?? []);
        setCounselors(all.filter((u: any) => u.role?.toLowerCase() === "counselor"));
      }
      if (sourcesRes.status === "fulfilled") {
        const d = sourcesRes.value;
        setSourceOptions(Array.isArray(d) ? d : (d?.data ?? []));
      }
      if (coursesRes.status === "fulfilled") {
        const d = coursesRes.value;
        setDbCourses(Array.isArray(d) ? d : (d?.data ?? []));
      }
    };
    fetchMasters();
  }, []);

  // ── Load leads ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page:   String(currentPage),
        limit:  String(rowsPerPage),
        search: filters.search,
        status: LEAD_STATUS,
      };
      if (filters.sourceId)    params.source_id        = filters.sourceId;
      if (filters.counselorId) params.assigned_user_id = filters.counselorId;

      const dates = filters.range === "custom"
        ? { startDate: filters.startDate, endDate: filters.endDate }
        : getRangeDates(filters.range);
      if (dates?.startDate) params.startDate = dates.startDate;
      if (dates?.endDate)   params.endDate   = dates.endDate;

      const res = await apiGet(`/api/leads?${new URLSearchParams(params)}`);
      if (res) {
        setLeads(Array.isArray(res.data) ? res.data : []);
        setTotalPages(res.pagination?.totalPages ?? 1);
        setTotalCount(res.pagination?.totalItems  ?? 0);
      } else {
        setLeads([]);
        setTotalCount(0);
      }
    } catch {
      toast.error("Failed to load follow-ups");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, rowsPerPage, filters]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Single assign ─────────────────────────────────────────────────────────

  const handleTransferLead = async (leadId: number, newUserId: string) => {
    const userId = newUserId === "" || newUserId === "0" ? null : parseInt(newUserId);
    try {
      await apiPut(`/api/leads/${leadId}`, { assigned_user_id: userId, lead_status: LEAD_STATUS });
      toast.success("Lead assigned");
      loadData();
    } catch {
      toast.error("Assignment failed");
    }
  };

  // ── Bulk assign ───────────────────────────────────────────────────────────

  const handleBulkAssign = async () => {
    if (noneSelected)       return toast.error("Select at least one lead");
    if (!targetCounselorId) return toast.error("Choose a counselor to assign");
    setIsBulkLoading(true);
    try {
      await apiPut("/api/leads/bulk-assign", {
        leadIds:          selectedLeads,
        assigned_user_id: parseInt(targetCounselorId),
        lead_status:      LEAD_STATUS,
      });
      toast.success(`${selectedLeads.length} lead(s) assigned`);
      setSelectedLeads([]);
      setTargetCounselorId("");
      loadData();
    } catch {
      toast.error("Bulk assignment failed");
    } finally {
      setIsBulkLoading(false);
    }
  };

  // ── Bulk edit ─────────────────────────────────────────────────────────────

  const handleBulkUpdate = async () => {
    if (noneSelected)                 return toast.error("Select leads first");
    if (!bulkSourceId && !bulkStatus) return toast.error("Choose a source or status to update");
    const toastId = toast.loading(`Updating ${selectedLeads.length} leads…`);
    try {
      const payload: Record<string, any> = { leadIds: selectedLeads };
      if (bulkSourceId) payload.lead_source_id = Number(bulkSourceId);
      if (bulkStatus)   payload.lead_status    = bulkStatus;
      await apiPut("/api/leads/bulk-update", payload);
      toast.success(`${selectedLeads.length} leads updated`, { id: toastId });
      setSelectedLeads([]);
      setBulkSourceId("");
      setBulkStatus("");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Bulk update failed", { id: toastId });
    }
  };

  // ── Single delete ─────────────────────────────────────────────────────────

  const confirmSingleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    const toastId = toast.loading("Removing…");
    try {
      await apiDelete(`/api/leads/${deleteId}`);
      toast.success("Lead removed", { id: toastId });
      setDeleteId(null);
      loadData();
    } catch {
      toast.error("Delete failed", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Bulk delete ───────────────────────────────────────────────────────────

  const handleBulkDelete = async () => {
    if (noneSelected) return;
    setIsDeleting(true);
    const toastId = toast.loading(`Deleting ${selectedLeads.length} leads…`);
    try {
      const res = await apiPost("/api/leads/bulk-delete", { ids: selectedLeads });
      if (res?.success) {
        toast.success(`${selectedLeads.length} leads deleted`, { id: toastId });
        setSelectedLeads([]);
        setShowBulkDeleteModal(false);
        loadData();
      } else {
        toast.error(res?.message ?? "Bulk delete failed", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Bulk delete error", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Single edit ───────────────────────────────────────────────────────────

  const openEdit = (lead: any) => {
    setEditingLead(lead);
    setEditStatus(lead.lead_status || LEAD_STATUS);
    setShowEditForm(true);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingLead) return;
    const fd  = new FormData(e.currentTarget);
    const raw = Object.fromEntries(fd.entries()) as Record<string, string>;
    try {
      await apiPut(`/api/leads/${editingLead.id}`, {
        ...editingLead, ...raw,
        lead_status:         raw.lead_status || LEAD_STATUS,
        lead_source_id:      Number(raw.lead_source_id || editingLead.lead_source_id),
        next_follow_up_date: raw.next_follow_up_date || editingLead.next_follow_up_date || null,
      });
      toast.success("Follow-up updated");
      setShowEditForm(false);
      setEditingLead(null);
      loadData();
    } catch {
      toast.error("Update failed");
    }
  };

  // ── Export ────────────────────────────────────────────────────────────────

  const handleExport = () => {
    const headers = ["ID", "Name", "Phone", "City", "Source", "Follow-up Date", "Status", "Assigned", "Notes"];
    const csv = [
      headers.join(","),
      ...leads.map((l) => [
        l.id, `"${l.full_name}"`, l.phone, `"${l.city || ""}"`,
        `"${l.lead_source_name || ""}"`, l.next_follow_up_date || "",
        l.lead_status || "", `"${l.assigned_user_name || "Unassigned"}"`,
        `"${(l.counselor_remarks || "").replace(/"/g, '""')}"`,
      ].join(","))
    ].join("\n");
    const link = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })),
      download: `followup_leads_${new Date().toISOString().split("T")[0]}.csv`,
    });
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pb-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <Calendar size={16} className="text-white" />
            </span>
            Follow-up Repository
          </h1>
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-1 flex items-center gap-3">
            Scheduled Interactions Pipeline
            {overdueCount > 0 && (
              <span className="text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full border border-red-100 dark:border-red-800">
                ⚠ {overdueCount} Overdue
              </span>
            )}
            {todayCount > 0 && (
              <span className="text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800">
                📅 {todayCount} Today
              </span>
            )}
            {hasActiveFilters && <span className="text-orange-600">· Filters active</span>}
          </p>
        </div>
        <button type="button" onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-xl text-[10px] font-black tracking-widest hover:bg-amber-600 transition-all shadow-lg self-start shrink-0">
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* ── Bulk Action Bar ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-3 sm:p-2">
        <div className="flex flex-wrap items-center gap-3">

          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 text-xs font-bold shrink-0">
            {(["assign", "edit", "delete"] as BulkMode[]).map((m) => (
              <button key={m} type="button"
                onClick={() => { setBulkMode(m); setSelectedLeads([]); }}
                className={`px-3 sm:px-4 py-2 rounded-lg transition-all capitalize ${
                  bulkMode === m
                    ? `bg-white dark:bg-gray-700 shadow-sm font-black ${m === "assign" ? "text-amber-600" : m === "edit" ? "text-amber-600" : "text-red-600"}`
                    : "text-gray-500"
                }`}>
                {m === "assign" ? "Assign" : m === "edit" ? "Bulk Edit" : "Delete"}
              </button>
            ))}
          </div>

          {selectedLeads.length > 0 && (
            <span className="text-[10px] font-black text-amber-700 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1.5 rounded-full border border-amber-200 dark:border-amber-800 shrink-0">
              {selectedLeads.length} selected
            </span>
          )}

          {/* ASSIGN */}
          {isAdmin && bulkMode === "assign" && selectedLeads.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-xl border border-amber-100 dark:border-amber-800">
              <UserCheck size={14} className="text-amber-600 shrink-0" />
              <select value={targetCounselorId} onChange={(e) => setTargetCounselorId(e.target.value)}
                className="bg-transparent text-xs font-black text-amber-700 dark:text-amber-300 outline-none min-w-[140px] cursor-pointer">
                <option value="">Choose counselor…</option>
                {counselors.map((c) => (
                  <option key={c.id ?? c.user_id} value={c.id ?? c.user_id}>{c.name ?? c.full_name}</option>
                ))}
              </select>
              <button type="button" onClick={handleBulkAssign}
                disabled={!targetCounselorId || isBulkLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest disabled:opacity-50 transition-all active:scale-95 shrink-0">
                {isBulkLoading ? "…" : `Confirm (${selectedLeads.length})`}
              </button>
            </div>
          )}

          {/* BULK EDIT */}
          {isAdmin && bulkMode === "edit" && selectedLeads.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 bg-amber-50 dark:bg-amber-900/10 px-3 py-2 rounded-xl border border-amber-100 dark:border-amber-800">
              <select value={bulkSourceId} onChange={(e) => setBulkSourceId(e.target.value)}
                className="px-3 py-1.5 border border-amber-200 rounded-lg text-xs font-bold bg-white dark:bg-gray-800 dark:text-white outline-none min-w-[140px]">
                <option value="">Update Source…</option>
                {sourceOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}
                className="px-3 py-1.5 border border-amber-200 rounded-lg text-xs font-bold bg-white dark:bg-gray-800 dark:text-white outline-none min-w-[160px]">
                <option value="">Update Status…</option>
                {BULK_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button type="button" onClick={handleBulkUpdate}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shrink-0">
                Apply ({selectedLeads.length})
              </button>
            </div>
          )}

          {/* DELETE */}
          {isAdmin && bulkMode === "delete" && selectedLeads.length > 0 && (
            <button type="button" onClick={() => setShowBulkDeleteModal(true)} disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 disabled:opacity-50">
              <Trash2 size={13} /> Delete ({selectedLeads.length})
            </button>
          )}

          {hasActiveFilters && (
            <button type="button" onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase text-red-600 border border-red-200 bg-red-50 dark:bg-red-900/10 rounded-xl hover:bg-red-100 transition-all ml-auto">
              <X size={12} /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white -mt-3 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-3 sm:p-2">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input type="text" placeholder="Search follow-ups…"
              value={filters.search} onChange={(e) => updateFilters({ search: e.target.value })}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-amber-400 transition-all" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Source */}
            <select value={filters.sourceId} onChange={(e) => updateFilters({ sourceId: e.target.value })}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white text-xs font-medium outline-none">
              <option value="">All Sources</option>
              {sourceOptions.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
            </select>

            {/* Counselor */}
            <select value={filters.counselorId} onChange={(e) => updateFilters({ counselorId: e.target.value })}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white text-xs font-medium outline-none">
              <option value="">All Counselors</option>
              <option value="unassigned">Unassigned</option>
              {counselors.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>

            {/* Range */}
            <div className="flex flex-wrap gap-1.5">
              {RANGE_BTNS.map((r) => (
                <button key={r.id} type="button"
                  onClick={() => updateFilters({ range: r.id, startDate: "", endDate: "" })}
                  className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                    activeRangeId === r.id
                      ? "bg-amber-600 border-amber-600 text-white shadow-sm"
                      : "bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"
                  }`}>
                  <span className={activeRangeId === r.id ? "text-white" : "text-amber-500"}>{r.icon}</span>
                  {r.label}
                </button>
              ))}
            </div>

            {/* Custom date */}
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all ${
              filters.startDate || filters.endDate ? "bg-amber-50 border-amber-300" : "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"
            }`}>
              <Calendar size={12} className="text-gray-400 shrink-0" />
              <input type="date" value={filters.startDate}
                onChange={(e) => updateFilters({ range: "custom", startDate: e.target.value })}
                className="bg-transparent text-[11px] font-bold text-gray-700 dark:text-gray-300 outline-none w-[82px]" />
              <span className="text-gray-400 text-[10px]">–</span>
              <input type="date" value={filters.endDate}
                onChange={(e) => updateFilters({ range: "custom", endDate: e.target.value })}
                className="bg-transparent text-[11px] font-bold text-gray-700 dark:text-gray-300 outline-none w-[82px]" />
              {(filters.startDate || filters.endDate) && (
                <button type="button" onClick={() => updateFilters({ range: "all", startDate: "", endDate: "" })} className="text-red-400 hover:text-red-600">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════
          DESKTOP TABLE
      ════════════════════════════════════ */}
      <div className="hidden -mt-3 sm:block bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[920px]">
            <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-3 py-4 w-8 text-center"><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-3.5 h-3.5 accent-amber-600" aria-label="Select all" /></th>
                <th className="px-2 py-4 w-8 text-center">#</th>
                <th className="px-4 py-4">Entry Date</th>
                <th className="px-4 py-4">Name</th>
                <th className="px-4 py-4">Phone</th>
                <th className="px-4 py-4">Batch/Edu</th>
                <th className="px-4 py-4">City</th>
                <th className="px-4 py-4">Source</th>
                <th className="px-4 py-4 text-amber-600">Follow-up Date</th>
                {isAdmin && <th className="px-4 py-4 text-amber-600">Assigned To</th>}
                <th className="px-4 py-4">Notes</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 12 : 11} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <div className="w-5 h-5 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Syncing schedule…</span>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={isAdmin ? 12 : 11} className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">📭 No follow-ups found</td></tr>
              ) : leads.map((lead, index) => {
                const fuStatus = getFollowUpStatus(lead.next_follow_up_date);
                return (
                  <tr key={lead.id} className={`text-sm transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/30 ${
                    fuStatus === "overdue" ? "bg-red-50/30 dark:bg-red-900/10"
                    : fuStatus === "today" ? "bg-blue-50/20 dark:bg-blue-900/10"
                    : selectedLeads.includes(lead.id) ? "bg-amber-50/30 dark:bg-amber-900/10"
                    : ""
                  }`}>
                    <td className="px-3 py-1.5 text-center align-middle"><input type="checkbox" checked={selectedLeads.includes(lead.id)} onChange={() => toggleSelect(lead.id)} className="w-3.5 h-3.5 accent-amber-600" /></td>
                    <td className="px-2 py-1.5 text-[11px] text-gray-400 text-center align-middle tabular-nums">{(currentPage - 1) * rowsPerPage + index + 1}</td>
                    <td className="px-4 py-1.5 whitespace-nowrap align-middle">
                      <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{fmtDate(lead.created_at) ?? "—"}</p>
                      <p className="text-[8px] text-gray-400 uppercase tracking-tighter">Initial Entry</p>
                    </td>
                    <td className="px-4 py-1.5 font-bold  text-[12px] text-gray-800 dark:text-white align-middle truncate max-w-[130px]">{lead.full_name}</td>
                    <td className="px-4 py-1.5 tabular-nums font-bold text-gray-700 dark:text-gray-200 text-[11px] align-middle whitespace-nowrap">
                     {lead.phone ? (lead.phone.startsWith("+") ? lead.phone : `+91 ${lead.phone}`) : "—"} </td>
                          <td className="px-4 py-2 align-middle">
                    <div className="flex flex-col">
                      {/* Qualification - Primary */}
                      <span className="text-blue-600 dark:text-blue-400 uppercase text-[10px] font-black tracking-tight leading-none">
                        {lead.qualification || "—"}
                      </span>
                      
                      {/* Year of Passing - Secondary */}
                      {lead.year_of_passing && (
                        <span className="text-gray-400 dark:text-gray-500 text-[9px] font-bold mt-0.5">
                          Class of {lead.year_of_passing}
                        </span>
                      )}
                    </div>
                  </td>
                    <td className="px-4 py-1.5 text-gray-500  text-[10px] font-bold align-middle">{lead.city || "—"}</td>
                    <td className="px-4 py-1.5 align-middle whitespace-nowrap"><SourceBadge lead={lead} sources={sourceOptions} /></td>
                    <td className="px-4 py-1.5 align-middle whitespace-nowrap">
                      <FollowUpCell dateStr={lead.next_follow_up_date} onSetDate={() => openEdit(lead)} />
                    </td>
                    {isAdmin && (
                      <td className="px-3 py-1.5 align-middle min-w-[130px]">
                        <select value={lead.assigned_user_id || ""} onChange={(e) => handleTransferLead(lead.id, e.target.value)}
                          className="w-full h-7 text-[9px] font-black text-amber-700 bg-amber-50 dark:bg-amber-900/20 px-1.5 rounded-lg uppercase border border-amber-100 dark:border-amber-800 outline-none cursor-pointer">
                          <option value="">Assign…</option>
                          {counselors.map((c) => <option key={c.id} value={c.id}>{c.name ?? c.full_name}</option>)}
                        </select>
                      </td>
                    )}
                    <td className="px-4 py-1.5 text-[10px] text-gray-400 italic truncate max-w-[110px] align-middle">{lead.counselor_remarks || "—"}</td>
                    <td className="px-4 py-1.5 text-right align-middle whitespace-nowrap">
                      <div className="flex justify-end items-center gap-2">
                        <button type="button" onClick={() => openEdit(lead)} className="text-amber-500 hover:bg-amber-50 p-1.5 rounded-lg transition-all" aria-label="Edit"><Edit3 size={14} /></button>
                        <a href={`tel:${lead.phone}`} aria-label="Call" className="text-gray-400 hover:text-blue-600 p-1 transition-colors"><Phone size={13} /></a>
                        <a href={`https://wa.me/91${lead.phone?.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="text-gray-400 hover:text-emerald-500 p-1 transition-colors"><MessageCircle size={13} /></a>
                        {isAdmin && <button type="button" onClick={() => setDeleteId(lead.id)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all" aria-label="Delete"><Trash2 size={13} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <PaginationFooter currentPage={currentPage} totalPages={totalPages} totalCount={totalCount} rowsPerPage={rowsPerPage} setRowsPerPage={setRowsPerPage} setCurrentPage={setCurrentPage} />
      </div>

      {/* ════════════════════════════════════
          MOBILE CARDS
      ════════════════════════════════════ */}
      <div className="sm:hidden space-y-3">
        {leads.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 cursor-pointer">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-4 h-4 accent-amber-600 rounded" />
              Select All ({leads.length})
            </label>
            {selectedLeads.length > 0 && (
              <span className="text-[10px] font-black text-amber-700 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full border border-amber-200">
                {selectedLeads.length} selected
              </span>
            )}
          </div>
        )}
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">📡 Syncing schedule…</div>
        ) : leads.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">📭 No follow-ups found</div>
        ) : (
          <>
            {leads.map((lead, index) => {
              const fuStatus = getFollowUpStatus(lead.next_follow_up_date);
              const fuDate   = fmtDate(lead.next_follow_up_date);
              const cardBorder =
                fuStatus === "overdue" ? "border-red-200 dark:border-red-800"
                : fuStatus === "today" ? "border-blue-200 dark:border-blue-800"
                : selectedLeads.includes(lead.id) ? "border-amber-300 ring-1 ring-amber-200 dark:border-amber-700"
                : "border-gray-200 dark:border-gray-800";

              return (
                <div key={lead.id} className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-sm overflow-hidden ${cardBorder}`}>
                  {fuStatus === "overdue" && <div className="h-1 bg-gradient-to-r from-red-500 to-red-400" />}
                  {fuStatus === "today"   && <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-400" />}

                  <div className="flex items-start gap-2.5 p-3 border-b border-gray-100 dark:border-gray-800">
                    <input type="checkbox" checked={selectedLeads.includes(lead.id)} onChange={() => toggleSelect(lead.id)} className="w-4 h-4 accent-amber-600 rounded mt-0.5 shrink-0" />
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${
                      fuStatus === "overdue" ? "bg-red-100 text-red-700"
                      : fuStatus === "today" ? "bg-blue-100 text-blue-700"
                      : "bg-amber-100 text-amber-700"
                    }`}>
                      {(currentPage - 1) * rowsPerPage + index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white text-sm truncate uppercase">{lead.full_name}</p>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${
                        fuStatus === "overdue" ? "text-red-500" : fuStatus === "today" ? "text-blue-500" : "text-amber-500"
                      }`}>
                        {fuDate
                          ? `📅 ${fuDate}${fuStatus === "overdue" ? " · OVERDUE" : fuStatus === "today" ? " · TODAY" : ""}`
                          : "⚠ No date set"}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {lead.assigned_user_name ? (
                        <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-100 uppercase">{lead.assigned_user_name}</span>
                      ) : (
                        <span className="text-[9px] font-black text-orange-500 bg-orange-50 px-2 py-1 rounded-full border border-orange-100 uppercase">Waiting</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-2">
                    <div><p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Phone</p><p className="text-xs font-bold text-gray-700 dark:text-gray-300 tabular-nums">{lead.phone || "—"}</p></div>
                    <div><p className="text-[9px] font-black uppercase tracking-widest text-gray-400">City</p><p className="text-xs text-gray-600 dark:text-gray-400 uppercase">{lead.city || "—"}</p></div>
                    <div><p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Source</p><SourceBadge lead={lead} sources={sourceOptions} /></div>
                    <div><p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Entry Date</p><p className="text-xs text-gray-600 dark:text-gray-400">{fmtDate(lead.created_at) ?? "—"}</p></div>
                    {lead.qualification && (
                      <div><p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Education</p><p className="text-xs text-blue-600 font-bold uppercase">{lead.qualification}</p></div>
                    )}
                    {lead.counselor_remarks && (
                      <div className="col-span-2"><p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Notes</p><p className="text-[11px] text-gray-500 italic truncate">{lead.counselor_remarks}</p></div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                      <select value={lead.assigned_user_id || ""} onChange={(e) => handleTransferLead(lead.id, e.target.value)}
                        className="w-full text-xs font-black text-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-xl border border-amber-100 dark:border-amber-800 outline-none">
                        <option value="">Assign Counselor…</option>
                        {counselors.map((c) => <option key={c.id} value={c.id}>{c.name ?? c.full_name}</option>)}
                      </select>
                    </div>
                  )}

                  <div className={`flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-gray-800 ${
                    fuStatus === "overdue" ? "bg-red-50/40 dark:bg-red-900/10" : "bg-gray-50 dark:bg-gray-800/60"
                  }`}>
                    <div className="flex items-center gap-3">
                      <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600"><Phone size={12} /> Call</a>
                      <a href={`https://wa.me/91${lead.phone?.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[11px] font-bold text-green-600"><MessageCircle size={12} /> WA</a>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => openEdit(lead)} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-xl" aria-label="Edit"><Edit3 size={14} /></button>
                      {isAdmin && <button type="button" onClick={() => setDeleteId(lead.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl" aria-label="Delete"><Trash2 size={14} /></button>}
                    </div>
                  </div>
                </div>
              );
            })}
            <PaginationFooter currentPage={currentPage} totalPages={totalPages} totalCount={totalCount} rowsPerPage={rowsPerPage} setRowsPerPage={setRowsPerPage} setCurrentPage={setCurrentPage} mobile />
          </>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {showEditForm && editingLead && (
        <LeadEditModal editingLead={editingLead} status={editStatus} setStatus={setEditStatus}
          sourceOptions={sourceOptions} dbCourses={dbCourses}
          onClose={() => { setShowEditForm(false); setEditingLead(null); }}
          onSubmit={handleEditSubmit} />
      )}

      {/* ── Delete Modal ── */}
      <DeleteModal
        isOpen={deleteId !== null || showBulkDeleteModal}
        title={showBulkDeleteModal ? `Delete ${selectedLeads.length} Follow-ups?` : "Remove Follow-up Lead?"}
        message={showBulkDeleteModal
          ? `This will permanently remove all ${selectedLeads.length} selected follow-up leads. This cannot be undone.`
          : "This will permanently remove this lead record. This cannot be undone."}
        onClose={() => { setDeleteId(null); setShowBulkDeleteModal(false); }}
        onConfirm={showBulkDeleteModal ? handleBulkDelete : confirmSingleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}