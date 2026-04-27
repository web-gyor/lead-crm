// src/pages/FollowUps.tsx
import { useState, useEffect, useCallback } from "react";
import {
  Phone, MessageCircle, Calendar, CheckCircle2,
  Search, User, BookOpen, RefreshCw, Filter, X, CalendarCheck,
} from "lucide-react";
import { apiGet, apiPut } from "../utils/api";
import toast from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "Follow-up",      label: "Follow-up"  },
  { value: "Interested",     label: "Interested" },
  { value: "Converted",      label: "Converted"  },
  { value: "Lost",           label: "Lost"       },
  { value: "Not Interested", label: "Rejected"   },
] as const;

const FINAL_STATUSES = ["Converted", "Lost", "Not Interested", "Closed"];

const SECTIONS = [
  { id: "overdue",  label: "Overdue",   emoji: "🔴", color: "text-red-600",    bg: "bg-red-50 dark:bg-red-900/20",      border: "border-red-200 dark:border-red-800",      dot: "bg-red-500"    },
  { id: "today",    label: "Due Today", emoji: "🟡", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800", dot: "bg-orange-500" },
  { id: "upcoming", label: "Upcoming",  emoji: "🔵", color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20",    border: "border-blue-200 dark:border-blue-800",    dot: "bg-blue-500"   },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];
type Section   = (typeof SECTIONS)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusBucket(dateStr?: string): SectionId {
  if (!dateStr) return "upcoming";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "upcoming";
  d.setHours(0, 0, 0, 0);
  if (d < today) return "overdue";
  if (d.getTime() === today.getTime()) return "today";
  return "upcoming";
}

function fmtDate(dateStr?: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

// ─── Lead Card ────────────────────────────────────────────────────────────────

interface LeadCardProps {
  lead: any;
  section: Section;
  processingId: any;
  onMarkDone: (leadId: any) => void;
  onOpenNote: (lead: any) => void;
  onReschedule: (leadId: any, date: string) => void;
  onStatusChange: (leadId: any, status: string) => void;
}

function LeadCard({ lead, section, processingId, onMarkDone, onOpenNote, onReschedule, onStatusChange }: LeadCardProps) {
  const leadId      = lead.id ?? lead.lead_id;
  const isProcessing = processingId === leadId;
  const bucket      = section.id;

  const borderCls =
    bucket === "overdue" ? "border-red-100 dark:border-red-900/40"
    : bucket === "today" ? "border-orange-100 dark:border-orange-900/40"
    : "border-gray-100 dark:border-gray-800";

  const avatarCls =
    bucket === "overdue" ? "bg-red-100 text-red-600"
    : bucket === "today" ? "bg-orange-100 text-orange-600"
    : "bg-blue-100 text-blue-600";

  const dateCls =
    bucket === "overdue" ? "bg-red-50 text-red-600"
    : bucket === "today" ? "bg-orange-50 text-orange-600"
    : "bg-blue-50 text-blue-600";

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-sm hover:shadow-md transition-all ${borderCls}`}>
      {bucket === "overdue" && <div className="h-1 bg-gradient-to-r from-red-500 to-red-400 rounded-t-2xl" />}
      {bucket === "today"   && <div className="h-1 bg-gradient-to-r from-orange-500 to-yellow-400 rounded-t-2xl" />}

      <div className="p-3 sm:p-4">
        {/* Name + date */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm uppercase shrink-0 ${avatarCls}`}>
              {lead.full_name?.charAt(0) ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">
                {lead.full_name}
              </p>
              <p className="text-[9px] font-bold text-gray-400 uppercase truncate">
                {lead.interested_course || "General Enquiry"}
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-xl shrink-0 text-[10px] font-black uppercase ${dateCls}`}>
            <Calendar size={10} />
            {fmtDate(lead.next_follow_up_date)}
          </div>
        </div>

        {/* Phone + counselor */}
        <div className="flex items-center justify-between mb-3">
          <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:underline">
            <Phone size={11} /> {lead.phone}
          </a>
          {lead.assigned_user_name && (
            <div className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase">
              <User size={9} /> {lead.assigned_user_name}
            </div>
          )}
        </div>

        {/* Note preview */}
        {(lead.counselor_remarks || lead.last_feedback) && (
          <div className="mb-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="text-[10px] text-gray-500 italic truncate">
              "{lead.counselor_remarks || lead.last_feedback}"
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onMarkDone(leadId)}
            disabled={isProcessing}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all active:scale-95 flex-1 justify-center ${
              isProcessing
                ? "bg-gray-200 text-gray-400 cursor-wait"
                : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20"
            }`}
          >
            {isProcessing ? (
              <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing</>
            ) : (
              <><CheckCircle2 size={13} /> Done</>
            )}
          </button>

          <button
            type="button"
            onClick={() => onOpenNote(lead)}
            className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all"
            title="Add note"
          >
            <BookOpen size={14} />
          </button>

          {/* Reschedule */}
          <div className="relative">
            <input
              type="date"
              id={`date-${leadId}`}
              className="absolute opacity-0 w-0 h-0"
              onChange={(e) => onReschedule(leadId, e.target.value)}
            />
            <button
              type="button"
              onClick={() => (document.getElementById(`date-${leadId}`) as HTMLInputElement)?.showPicker?.()}
              className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-xl hover:bg-orange-100 transition-all"
              title="Reschedule"
            >
              <Calendar size={14} />
            </button>
          </div>

          <a
            href={`https://wa.me/91${lead.phone?.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"
            title="WhatsApp"
          >
            <MessageCircle size={14} />
          </a>

          <select
            value={lead.lead_status || "Follow-up"}
            onChange={(e) => onStatusChange(leadId, e.target.value)}
            className="flex-1 min-w-[90px] px-2 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-black uppercase outline-none cursor-pointer dark:text-white"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Note Modal ───────────────────────────────────────────────────────────────

function NoteModal({ lead, onClose, onSave }: { lead: any; onClose: () => void; onSave: (text: string) => void }) {
  const [text, setText] = useState(
    (lead.counselor_remarks || lead.last_feedback || "").toString().trim()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <div className="p-5">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Call Notes</h2>
            <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
              <X size={16} />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase mb-4">{lead.full_name}</p>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter notes about this interaction…"
            rows={4}
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-blue-400 resize-none transition-all dark:text-white"
          />
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-gray-500 font-bold text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave(text.trim())}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/20"
            >
              Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FollowUps() {
  const [leads,         setLeads]         = useState<any[]>([]);
  const [staff,         setStaff]         = useState<any[]>([]);
  const [sources,       setSources]       = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [processingId,  setProcessingId]  = useState<any>(null);
  const [noteLead,      setNoteLead]      = useState<any>(null);
  const [showFilters,   setShowFilters]   = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("overdue");

  const [searchTerm,   setSearchTerm]   = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [userFilter,   setUserFilter]   = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  // ── Data ──────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [leadsRes, staffRes, sourcesRes] = await Promise.all([
        apiGet("/api/leads?status=all&limit=500"),
        apiGet("/api/users").catch(() => []),
        apiGet("/api/lead-sources").catch(() => []),
      ]);

      const allLeads = Array.isArray(leadsRes?.data) ? leadsRes.data
        : Array.isArray(leadsRes) ? leadsRes : [];

      // Include leads with a follow-up date that are not in a final status, or explicitly Follow-up
      const active = allLeads.filter((l: any) => {
        const status  = (l.lead_status ?? "").trim();
        const hasDate = !!l.next_follow_up_date;
        return (hasDate && !FINAL_STATUSES.includes(status)) || status === "Follow-up";
      });

      setLeads(active);
      setStaff(Array.isArray(staffRes) ? staffRes : staffRes?.data ?? staffRes?.users ?? []);
      setSources(Array.isArray(sourcesRes) ? sourcesRes : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load follow-ups");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filteredLeads = leads.filter((l) =>
    ((l.full_name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) || (l.phone ?? "").includes(searchTerm)) &&
    (!courseFilter || l.interested_course === courseFilter) &&
    (!userFilter   || l.assigned_user_name === userFilter) &&
    (!sourceFilter || l.lead_source_name === sourceFilter)
  );

  const hasFilters = !!(searchTerm || courseFilter || userFilter || sourceFilter);
  const clearFilters = () => { setSearchTerm(""); setCourseFilter(""); setUserFilter(""); setSourceFilter(""); };

  const getBucketLeads = (sectionId: SectionId) =>
    filteredLeads.filter((l) => getStatusBucket(l.next_follow_up_date) === sectionId);

  const uniqueCourses = [...new Set(leads.map((l) => l.interested_course).filter(Boolean))].sort();

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleMarkDone = async (leadId: any) => {
    const lead   = leads.find((l) => (l.id ?? l.lead_id) === leadId);
    if (!lead) return;
    const status = (lead.lead_status ?? "").trim();

    if (status === "Follow-up") {
      toast.error("Change the status first before marking as done");
      return;
    }

    setProcessingId(leadId);
    try {
      await apiPut(`/api/leads/${leadId}`, {
        lead_status:         status,
        next_follow_up_date: null,
        last_follow_up_date: new Date().toISOString().split("T")[0],
      });
      setLeads((prev) => prev.filter((l) => (l.id ?? l.lead_id) !== leadId));
      toast.success("Marked as done");
    } catch {
      toast.error("Failed to update lead");
    } finally {
      setProcessingId(null);
    }
  };

  const handleStatusChange = async (leadId: any, newStatus: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id ?? l.lead_id) === leadId ? { ...l, lead_status: newStatus } : l)
    );
    try {
      await apiPut(`/api/leads/${leadId}`, { lead_status: newStatus });
      toast.success("Status updated");
    } catch {
      toast.error("Status update failed");
      fetchData(true);
    }
  };

  const handleNoteSave = async (text: string) => {
    if (!noteLead) return;
    const leadId = noteLead.id ?? noteLead.lead_id;
    try {
      await apiPut(`/api/leads/${leadId}`, { counselor_remarks: text });
      setLeads((prev) =>
        prev.map((l) => (l.id ?? l.lead_id) === leadId ? { ...l, counselor_remarks: text } : l)
      );
      setNoteLead(null);
      toast.success("Note saved");
    } catch {
      toast.error("Save failed");
    }
  };

  const handleReschedule = async (leadId: any, newDate: string) => {
    if (!newDate) return;
    try {
      await apiPut(`/api/leads/${leadId}`, { next_follow_up_date: newDate });
      toast.success("Rescheduled");
      fetchData(true);
    } catch {
      toast.error("Reschedule failed");
    }
  };

  const handleMarkAllDone = async () => {
    if (!filteredLeads.length) return;
    if (!window.confirm(`Mark all ${filteredLeads.length} follow-ups as done?`)) return;
    setLoading(true);
    try {
      await Promise.all(
        filteredLeads.map((l) =>
          apiPut(`/api/leads/${l.id ?? l.lead_id}`, {
            next_follow_up_date: null,
            last_follow_up_date: new Date().toISOString().split("T")[0],
          })
        )
      );
      toast.success(`${filteredLeads.length} follow-ups cleared`);
      fetchData();
    } catch {
      toast.error("Some updates failed");
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pb-8">

      {/* ── Header ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
                <CalendarCheck size={16} className="text-white" />
              </span>
              Follow-up Manager
            </h1>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">
              Daily Engagement Schedule
            </p>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {SECTIONS.map((s) => {
                const count = getBucketLeads(s.id).length;
                return count > 0 ? (
                  <span key={s.id} className={`text-[9px] font-black uppercase flex items-center gap-1 ${s.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {count} {s.label}
                  </span>
                ) : null;
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => { setRefreshing(true); fetchData(true); }}
              aria-label="Refresh"
              className={`p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-blue-600 transition-all ${refreshing ? "animate-spin" : ""}`}
            >
              <RefreshCw size={15} />
            </button>

            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black uppercase transition-all ${
                showFilters || hasFilters
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700"
              }`}
            >
              <Filter size={13} />
              <span className="hidden sm:inline">Filters</span>
              {hasFilters && (
                <span className="w-4 h-4 rounded-full bg-white text-blue-600 text-[9px] font-black flex items-center justify-center">!</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleMarkAllDone}
              disabled={filteredLeads.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase transition-all active:scale-95 disabled:opacity-40 shadow-sm shadow-emerald-500/20"
            >
              <CheckCircle2 size={13} />
              <span className="hidden sm:inline">Mark All</span>
              <span className="bg-emerald-400 px-1.5 py-0.5 rounded-full text-[9px]">{filteredLeads.length}</span>
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="px-4 sm:px-5 pb-4 pt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-gray-100 dark:border-gray-800">
            <div className="relative col-span-2 sm:col-span-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
              <input
                type="text"
                placeholder="Name or phone…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:border-blue-400 transition-all"
              />
            </div>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="px-2 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-[10px] font-black uppercase text-gray-500 outline-none"
            >
              <option value="">All Counselors</option>
              {staff.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-2 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-[10px] font-black uppercase text-gray-500 outline-none"
            >
              <option value="">All Courses</option>
              {uniqueCourses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex gap-2">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="flex-1 px-2 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-[10px] font-black uppercase text-gray-500 outline-none"
              >
                <option value="">All Sources</option>
                {sources.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
              {hasFilters && (
                <button type="button" onClick={clearFilters} className="px-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile: Section tabs ── */}
      <div className="lg:hidden flex bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        {SECTIONS.map((s) => {
          const count    = getBucketLeads(s.id).length;
          const isActive = activeSection === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 border-b-2 transition-all ${
                isActive ? `border-current ${s.color}` : "border-transparent text-gray-400"
              }`}
            >
              <span className="text-base">{s.emoji}</span>
              <span className="text-[9px] font-black uppercase tracking-widest">{s.label}</span>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                isActive ? `${s.bg} ${s.color}` : "bg-gray-100 text-gray-400"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">Loading follow-ups…</p>
        </div>
      ) : (
        <>
          {/* Desktop: 3-column grid */}
          <div className="hidden lg:grid grid-cols-3 gap-5">
            {SECTIONS.map((section) => {
              const bucketLeads = getBucketLeads(section.id);
              return (
                <div key={section.id} className="space-y-3">
                  <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border ${section.border} ${section.bg}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">{section.emoji}</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${section.color}`}>
                        {section.label}
                      </span>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full bg-white dark:bg-gray-900 ${section.color} shadow-sm`}>
                      {bucketLeads.length}
                    </span>
                  </div>

                  {bucketLeads.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
                      <span className="text-3xl block mb-2">{section.emoji}</span>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-300">All clear</p>
                    </div>
                  ) : (
                    bucketLeads.map((lead) => (
                      <LeadCard
                        key={lead.id ?? lead.lead_id}
                        lead={lead}
                        section={section}
                        processingId={processingId}
                        onMarkDone={handleMarkDone}
                        onOpenNote={setNoteLead}
                        onReschedule={handleReschedule}
                        onStatusChange={handleStatusChange}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile: active section only */}
          <div className="lg:hidden space-y-3">
            {(() => {
              const section     = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0];
              const bucketLeads = getBucketLeads(section.id);
              return bucketLeads.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900">
                  <span className="text-4xl block mb-2">{section.emoji}</span>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">All clear here</p>
                </div>
              ) : (
                bucketLeads.map((lead) => (
                  <LeadCard
                    key={lead.id ?? lead.lead_id}
                    lead={lead}
                    section={section}
                    processingId={processingId}
                    onMarkDone={handleMarkDone}
                    onOpenNote={setNoteLead}
                    onReschedule={handleReschedule}
                    onStatusChange={handleStatusChange}
                  />
                ))
              );
            })()}
          </div>
        </>
      )}

      {/* ── Note Modal ── */}
      {noteLead && (
        <NoteModal
          lead={noteLead}
          onClose={() => setNoteLead(null)}
          onSave={handleNoteSave}
        />
      )}
    </div>
  );
}