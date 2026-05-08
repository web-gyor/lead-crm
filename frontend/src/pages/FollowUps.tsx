// src/pages/FollowUps.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Phone, MessageCircle, Calendar, CheckCircle2,
  Search, User, BookOpen, RefreshCw, Filter, X, CalendarCheck,
} from "lucide-react";
import { apiGet, apiPut } from "../utils/api";
import toast from "react-hot-toast";
import { Toaster } from 'react-hot-toast';
// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "Follow-up",      label: "Follow-up"  },
  { value: "Interested",     label: "Interested" },
  { value: "Converted",      label: "Converted"  },
  { value: "Lost",           label: "Lost"       },
  { value: "Not Interested", label: "Rejected"   },
] as const;

const FINAL_STATUSES = new Set(["Converted", "Lost", "Not Interested", "Closed"]);

const SECTIONS = [
  { id: "overdue",  label: "Overdue",   emoji: "🔴", color: "text-red-600",    bg: "bg-red-50 dark:bg-red-900/20",      border: "border-red-200 dark:border-red-800",      dot: "bg-red-500"    },
  { id: "today",    label: "Due Today", emoji: "🟡", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800", dot: "bg-orange-500" },
  { id: "upcoming", label: "Upcoming",  emoji: "🔵", color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20",    border: "border-blue-200 dark:border-blue-800",    dot: "bg-blue-500"   },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];
type Section   = (typeof SECTIONS)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLocalDate() {
  const now = new Date();

  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 60 * 60000);

  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, "0");
  const d = String(ist.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function getLocalDateIST() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 60 * 60000);

  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, "0");
  const d = String(ist.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}
function getStatusBucket(dateStr?: string | null): "overdue" | "today" | "upcoming" {
  if (!dateStr) return "upcoming";
 
  // Extract plain YYYY-MM-DD regardless of whether it's a string or Date object
  const raw = dateStr instanceof Date
    ? dateStr.toISOString().split("T")[0]   // get the UTC date string first
    : String(dateStr).split("T")[0].trim(); // strip any time component
 
  // Parse as LOCAL date — split into parts, avoid new Date(string) UTC trap
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return "upcoming";
 
  // Local midnight for the follow-up date
  const followUpLocal = new Date(y, m - 1, d); // months are 0-indexed
 
  // Local midnight for today
  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
 
  if (followUpLocal < todayLocal) return "overdue";
  if (followUpLocal.getTime() === todayLocal.getTime()) return "today";
  return "upcoming";
}
function fmtDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
 
  // Same pattern — extract YYYY-MM-DD string first
  const raw = dateStr instanceof Date
    ? dateStr.toISOString().split("T")[0]
    : String(dateStr).split("T")[0].trim();
 
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return "—";
 
  // new Date(y, m-1, d) = local midnight = correct local date
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
  // Returns "06 May" for 2026-05-06 ✓ (same as Leads.tsx)
}
function normaliseLead(l: any, sourceMap: Map<number, string>): any {
  return {
    ...l,
    assigned_user_name:
      l.assigned_user_name || l.counselor_name || l.user_name || "Unassigned",
    
    lead_source_name:
      l.lead_source_name ||
      l.source_name ||
      sourceMap.get(Number(l.lead_source_id)) ||
      "Unknown Source",
  };
}


const sameId = (a: any, b: any) => Number(a) === Number(b);



// ─── Lead Card ────────────────────────────────────────────────────────────────

interface LeadCardProps {
  lead:           any;
  section:        Section;
  processingId:   any;
  onMarkDone:     (id: any) => void;
  onOpenNote:     (lead: any) => void;
  onReschedule:   (id: any, date: string) => void;
  onStatusChange: (id: any, status: string) => void;
}

function LeadCard({ lead, section, processingId, onMarkDone, onOpenNote, onReschedule, onStatusChange }: LeadCardProps) {
  const leadId       = Number(lead.id ?? lead.lead_id);
  const isProcessing = sameId(processingId, leadId);
  const bucket       = section.id;

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

  // Source display — normalised in parent, just read the field
  const displaySource = lead.lead_source_name || "";

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-sm hover:shadow-md transition-all ${borderCls}`}>
      {bucket === "overdue" && <div className="h-1 bg-gradient-to-r from-red-500 to-red-400 rounded-t-2xl" />}
      {bucket === "today"   && <div className="h-1 bg-gradient-to-r from-orange-500 to-yellow-400 rounded-t-2xl" />}

      <div className="p-3 sm:p-4">
        {/* Name + date */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm uppercase shrink-0 ${avatarCls}`}>
              {lead.full_name?.charAt(0) ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">
                {lead.full_name}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                {lead.interested_course && (
                  <span className="text-[9px] font-bold text-gray-400 uppercase truncate">
                    {lead.interested_course}
                  </span>
                )}
               
              </div>
            </div>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-xl shrink-0 text-[10px] font-black uppercase ${dateCls}`}>
            <Calendar size={10} />
            {fmtDate(lead.next_follow_up_date)}
          </div>
        </div>

        {/* Phone + counsellor */}
        <div className="flex items-center justify-between mb-3">
          <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:underline">
            <Phone size={11} /> {lead.phone}
          </a>
           {displaySource && (
                  <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded-md uppercase shrink-0">
                    {displaySource}
                  </span>
                )}
          {lead.assigned_user_name && (
            <div className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase">
              <User size={9} /> {lead.assigned_user_name}
            </div>
          )}
        </div>

        {/* Remarks */}
        {(lead.counselor_remarks || lead.last_feedback) && (
          <div className="mb-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="text-[10px] text-gray-500 italic truncate">
              "{lead.counselor_remarks || lead.last_feedback}"
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => onMarkDone(leadId)} disabled={isProcessing}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all active:scale-95 flex-1 justify-center ${
              isProcessing
                ? "bg-gray-200 text-gray-400 cursor-wait"
                : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20"}`}>
            {isProcessing
              ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing</>
              : <><CheckCircle2 size={13} /> Done</>}
          </button>

          <button type="button" onClick={() => onOpenNote(lead)}
            className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all" title="Add note">
            <BookOpen size={14} />
          </button>

          {/* Reschedule overlay */}
          <div className="relative">
            <button type="button" aria-hidden="true"
              className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-xl hover:bg-orange-100 transition-all" title="Reschedule">
              <Calendar size={14} />
            </button>
            <input type="date" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => {
  const selectedDate = e.target.value;

  if (!selectedDate) return;

  console.log("📅 Selected:", selectedDate); // DEBUG

  onReschedule(leadId, selectedDate);
}} />
          </div>

          <a href={`https://wa.me/91${lead.phone?.replace(/\D/g, "")}`}
            target="_blank" rel="noreferrer"
            className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all" title="WhatsApp">
            <MessageCircle size={14} />
          </a>

          <select value={lead.lead_status || "Follow-up"} onChange={(e) => onStatusChange(leadId, e.target.value)}
            className="flex-1 min-w-[90px] px-2 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-black uppercase outline-none cursor-pointer dark:text-white">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Note Modal ───────────────────────────────────────────────────────────────

function NoteModal({ lead, onClose, onSave }: { lead: any; onClose: () => void; onSave: (t: string) => void }) {
  const [text, setText] = useState((lead.counselor_remarks || lead.last_feedback || "").toString().trim());
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <div className="p-5">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Call Notes</h2>
            <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><X size={16} /></button>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase mb-4">{lead.full_name}</p>
          <textarea autoFocus value={text} onChange={e => setText(e.target.value)}
            placeholder="Enter notes about this interaction…" rows={4}
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-blue-400 resize-none transition-all dark:text-white" />
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-gray-500 font-bold text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all">Cancel</button>
            <button type="button" onClick={() => onSave(text.trim())} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/20">Save Note</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarkAllConfirm({ count, onConfirm, onCancel }: { count: number; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center border border-gray-100 dark:border-gray-800">
        <div className="mx-auto w-11 h-11 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 size={20} className="text-emerald-600" />
        </div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Mark All Done?</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">Clear follow-up dates for {count} lead{count !== 1 ? "s" : ""} in the current view.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

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
  const [showConfirm,   setShowConfirm]   = useState(false);

  const optimisticState = useRef<Map<number, { patch: Record<string, any>; until: number }>>(new Map());
const isUpdating = useRef(false);
  const [searchTerm,   setSearchTerm]   = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  // Staff filter stores the user ID as string (avoids name-matching issues)
  const [userFilter,   setUserFilter]   = useState("");
  // Source filter stores source ID as string
  const [sourceFilter, setSourceFilter] = useState("");

  // ── Build a sourceMap: id → name for client-side lookup ──────────────────
  // Used when the API hasn't had the JOIN fix applied yet
const uniqueCourses = useMemo(() => {
  const set = new Set<string>();

  leads.forEach(l => {
    const course = (l.interested_course || "").toString().trim();

    if (
      course &&
      course.toLowerCase() !== "null" &&
      course.toLowerCase() !== "undefined"
    ) {
      set.add(course.toUpperCase());
    }
  });

  return Array.from(set).sort();
}, [leads]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
const fetchData = useCallback(async (silent = false) => {
  if (silent && isUpdating.current) return;

  if (!silent) setLoading(true);
  else setRefreshing(true);

  try {
const localDate = getLocalDate();

    const [fuRes, staffRes, sourcesRes] = await Promise.all([
      apiGet(`/api/followups?localDate=${localDate}`),
      apiGet("/api/users").catch(() => ({ data: [] })),
      apiGet("/api/lead-sources").catch(() => ({ data: [] })),
    ]);

    console.log("RAW COURSES FROM LEADS:");
leads.forEach(l => {
  console.log(l.id, l.interested_course);
});

    const rawLeads = fuRes?.leads || (Array.isArray(fuRes) ? fuRes : []);
    const rawSources = Array.isArray(sourcesRes) ? sourcesRes : (sourcesRes?.data || []);

    // Build sourceMap safely
    const sm = new Map<number, string>();
    rawSources.forEach((s: any) => {
      const id = Number(s?.id ?? s?.source_id);
      const name = (s?.name || s?.source_name || "").trim();
      if (!isNaN(id) && name) sm.set(id, name);
    });

    const normalized = rawLeads.map((l: any) => {
  const cleanDate = l.next_follow_up_date
    ? String(l.next_follow_up_date).split("T")[0]
    : null;

  return normaliseLead({ ...l, next_follow_up_date: cleanDate }, sm);
});

    // Optimistic merge
    const now = Date.now();
    const merged = normalized.map((l: any) => {
      const id = Number(l.id ?? l.lead_id);
      const entry = optimisticState.current.get(id);
      if (entry && entry.until > now) {
        return { ...l, ...entry.patch };
      }
      return l;
    });

    setLeads(merged);
   const rawStaff = Array.isArray(staffRes)
  ? staffRes
  : (staffRes?.data || []);

// ONLY counselors
const filteredStaff = rawStaff.filter((s: any) =>
  (s.role || "").toLowerCase() === "counselor"
);

setStaff(filteredStaff);
    setSources(rawSources);

  } catch (err: any) {
    console.error("🔥 Fetch Error Details:", err);
    console.error("Error Message:", err.message);
    toast.error("Failed to load follow-ups");
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, []);
  useEffect(() => { fetchData(); }, [fetchData]);

 useEffect(() => {
  console.log("=== DATE BUCKET DEBUG ===");
  leads.forEach((l, i) => {
    const date = l.next_follow_up_date;
    const bucket = getStatusBucket(date);
    console.log(`#${i+1} | Date: ${date} | Bucket: ${bucket}`);
  });
  console.log("Total Leads:", leads.length);
}, [leads]);

 

  // ── Filter ────────────────────────────────────────────────────────────────
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      // Search by name or phone
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (
          !(l.full_name ?? "").toLowerCase().includes(q) &&
          !(l.phone ?? "").includes(q)
        ) return false;
      }

      // Course — exact match on trimmed string
      if (courseFilter && (l.interested_course ?? "").trim() !== courseFilter) return false;

      // Staff — compare by user ID (stored as string in select value)
      // This avoids name-matching issues (e.g. "Anil" vs "Anil Kumar")
      if (userFilter && String(l.assigned_user_id) !== userFilter) return false;

      // Source — compare by source ID (stored as string in select value)
      if (sourceFilter && String(l.lead_source_id) !== sourceFilter) return false;

      return true;
    });
  }, [leads, searchTerm, courseFilter, userFilter, sourceFilter]);

  const hasFilters = !!(searchTerm || courseFilter || userFilter || sourceFilter);
  const clearFilters = () => { setSearchTerm(""); setCourseFilter(""); setUserFilter(""); setSourceFilter(""); };

  const getBucketLeads = useCallback((sid: SectionId) =>
    filteredLeads.filter(l => getStatusBucket(l.next_follow_up_date) === sid),
  [filteredLeads]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleMarkDone = async (leadId: any) => {
    const nId  = Number(leadId);
    const lead = leads.find(l => sameId(l.id ?? l.lead_id, nId));
    if (!lead) return;
    const status = (lead.lead_status ?? "").trim();
    if (status === "Follow-up") { toast.error("Change the status first before marking as done"); return; }
    setProcessingId(nId);
    try {
      await apiPut(`/api/leads/${nId}`, {
        lead_status: status, next_follow_up_date: null,
        last_follow_up_date: new Date().toISOString().split("T")[0],
      });
      setLeads(prev => prev.filter(l => !sameId(l.id ?? l.lead_id, nId)));
      toast.success("Marked as done");
    } catch { toast.error("Failed to update lead"); }
    finally { setProcessingId(null); }
  };

const handleStatusChange = async (leadId: any, newStatus: string) => {
  const nId = Number(leadId);
 
  if (FINAL_STATUSES.has(newStatus)) {
    setLeads(prev => prev.filter(l => !sameId(l.id ?? l.lead_id, nId)));
  } else {
    // Lock for 15s to survive any background refreshes
    optimisticState.current.set(nId, {
      patch: { lead_status: newStatus },
      until: Date.now() + 15_000,
    });
    setLeads(prev => prev.map(l =>
      sameId(l.id ?? l.lead_id, nId) ? { ...l, lead_status: newStatus } : l
    ));
  }
 
  isUpdating.current = true;
  try {
    await apiPut(`/api/leads/${nId}`, { lead_status: newStatus });
    if (!FINAL_STATUSES.has(newStatus)) toast.success("Status updated");
  } catch {
    optimisticState.current.delete(nId);
    toast.error("Update failed");
    fetchData(true);
  } finally {
    isUpdating.current = false;
  }
};

const handleReschedule = async (leadId: any, newDate: string) => {
  if (!newDate) return;
  const nId = Number(leadId);
 
  // Optimistic update — card moves to new bucket immediately
  const patch = { next_follow_up_date: newDate };
  optimisticState.current.set(nId, { patch, until: Date.now() + 30_000 }); // 30s lock
  setLeads(prev => prev.map(l =>
    sameId(l.id ?? l.lead_id, nId) ? { ...l, ...patch } : l
  ));
 
  isUpdating.current = true;
  try {
    await apiPut(`/api/leads/${nId}`, patch);
    toast.success(`Rescheduled → ${newDate}`);
    // Single refresh after a short delay — let the server settle
    setTimeout(() => fetchData(true), 800);
  } catch {
    toast.error("Reschedule failed");
    optimisticState.current.delete(nId);
    fetchData(true);
  } finally {
    isUpdating.current = false;
  }
};
const handleNoteSave = async (text: string) => {
  if (!noteLead) return;

  const nId = Number(noteLead.id ?? noteLead.lead_id);

  // ✅ LOCK UI
  isUpdating.current = true;

  optimisticState.current.set(nId, {
    patch: { counselor_remarks: text },
    until: Date.now() + 10000,
  });

  try {
    await apiPut(`/api/leads/${nId}`, { counselor_remarks: text });

    setLeads(prev =>
      prev.map(l =>
        sameId(l.id ?? l.lead_id, nId)
          ? { ...l, counselor_remarks: text }
          : l
      )
    );

    setNoteLead(null);
    toast.success("Note saved");
  } catch {
setTimeout(() => {
  optimisticState.current.delete(nId);
}, 5000);
    toast.error("Save failed");
  } finally {
    isUpdating.current = false;
  }
};

  const handleMarkAllDone = async () => {
    setShowConfirm(false);
    if (!filteredLeads.length) return;
    setLoading(true);
    try {
      await Promise.allSettled(
        filteredLeads.map(l =>
          apiPut(`/api/leads/${Number(l.id ?? l.lead_id)}`, {
            next_follow_up_date: null,
            last_follow_up_date: new Date().toISOString().split("T")[0],
          })
        )
      );
      toast.success(`${filteredLeads.length} follow-ups cleared`);
      fetchData();
    } catch { toast.error("Some updates failed"); setLoading(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pb-8">
<Toaster position="top-right" reverseOrder={false} />
      {/* ── Header + Filters ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
                <CalendarCheck size={16} className="text-white" />
              </span>
              Follow-up Manager
            </h1>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Daily Engagement Schedule</p>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {SECTIONS.map(s => {
                const count = getBucketLeads(s.id).length;
                return count > 0 ? (
                  <span key={s.id} className={`text-[9px] font-black uppercase flex items-center gap-1 ${s.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {count} {s.label}
                  </span>
                ) : null;
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => { setRefreshing(true); fetchData(true); }} aria-label="Refresh"
              className={`p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-blue-600 transition-all ${refreshing ? "animate-spin" : ""}`}>
              <RefreshCw size={15} />
            </button>

            <button type="button" onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black uppercase transition-all ${
                showFilters || hasFilters
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700"}`}>
              <Filter size={13} />
              <span className="hidden sm:inline">Filters</span>
              {hasFilters && <span className="w-4 h-4 rounded-full bg-white text-blue-600 text-[9px] font-black flex items-center justify-center">!</span>}
            </button>

            <button type="button" onClick={() => setShowConfirm(true)} disabled={filteredLeads.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase transition-all active:scale-95 disabled:opacity-40 shadow-sm shadow-emerald-500/20">
              <CheckCircle2 size={13} />
              <span className="hidden sm:inline">Mark All</span>
              <span className="bg-emerald-400 px-1.5 py-0.5 rounded-full text-[9px]">{filteredLeads.length}</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="px-4 sm:px-5 pb-4 pt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-gray-100 dark:border-gray-800">
            {/* Search */}
            <div className="relative col-span-2 sm:col-span-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
              <input type="text" placeholder="Name or phone…" value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:border-blue-400 transition-all" />
            </div>

            {/* Staff — value = user ID string, avoids name-matching bugs */}
            <select value={userFilter} onChange={e => setUserFilter(e.target.value)}
              className="px-2 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-[10px] font-black uppercase text-gray-500 outline-none">
              <option value="">All Counselors</option>
              {staff.map((s: any) => {
                const id   = String(s.id ?? "");
                const name = s.name || s.full_name || "";
                return id && name ? <option key={id} value={id}>{name}</option> : null;
              })}
            </select>

            {/* Course */}
            <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}
              className="px-2 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-[10px] font-black uppercase text-gray-500 outline-none">
              <option value="">All Courses</option>
              {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Source — value = source ID string */}
            <div className="flex gap-2">
              <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
                className="flex-1 px-2 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-[10px] font-black uppercase text-gray-500 outline-none">
                <option value="">All Sources</option>
                {sources.map((s: any) => {
                  const id   = String(s.id ?? s.source_id ?? "");
                  const name = s.name || s.source_name || "";
                  return id && name ? <option key={id} value={id}>{name}</option> : null;
                })}
              </select>
              {hasFilters && (
                <button type="button" onClick={clearFilters}
                  className="px-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile section tabs ─────────────────────────────────────────── */}
      <div className="lg:hidden flex bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        {SECTIONS.map(s => {
          const count    = getBucketLeads(s.id).length;
          const isActive = activeSection === s.id;
          return (
            <button key={s.id} type="button" onClick={() => setActiveSection(s.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 border-b-2 transition-all ${isActive ? `border-current ${s.color}` : "border-transparent text-gray-400"}`}>
              <span className="text-base">{s.emoji}</span>
              <span className="text-[9px] font-black uppercase tracking-widest">{s.label}</span>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isActive ? `${s.bg} ${s.color}` : "bg-gray-100 text-gray-400"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Board ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">Loading follow-ups…</p>
        </div>
      ) : (
        <>
          {/* Desktop — 3 columns */}
          <div className="hidden lg:grid grid-cols-3 gap-5">
            {SECTIONS.map(section => {
              const bucketLeads = getBucketLeads(section.id);
              return (
                <div key={section.id} className="space-y-3">
                  <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border ${section.border} ${section.bg}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">{section.emoji}</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${section.color}`}>{section.label}</span>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full bg-white dark:bg-gray-900 ${section.color} shadow-sm`}>{bucketLeads.length}</span>
                  </div>
                  {bucketLeads.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
                      <span className="text-3xl block mb-2">{section.emoji}</span>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-300">All clear</p>
                    </div>
                  ) : (
                    bucketLeads.map(lead => (
                      <LeadCard key={lead.id ?? lead.lead_id} lead={lead} section={section}
                        processingId={processingId}
                        onMarkDone={handleMarkDone} onOpenNote={setNoteLead}
                        onReschedule={handleReschedule} onStatusChange={handleStatusChange} />
                    ))
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile — single active section */}
          <div className="lg:hidden space-y-3">
            {(() => {
              const section     = SECTIONS.find(s => s.id === activeSection) ?? SECTIONS[0];
              const bucketLeads = getBucketLeads(section.id);
              return bucketLeads.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900">
                  <span className="text-4xl block mb-2">{section.emoji}</span>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">All clear here</p>
                </div>
              ) : (
                bucketLeads.map(lead => (
                  <LeadCard key={lead.id ?? lead.lead_id} lead={lead} section={section}
                    processingId={processingId}
                    onMarkDone={handleMarkDone} onOpenNote={setNoteLead}
                    onReschedule={handleReschedule} onStatusChange={handleStatusChange} />
                ))
              );
            })()}
          </div>
        </>
      )}

      {noteLead    && <NoteModal lead={noteLead} onClose={() => setNoteLead(null)} onSave={handleNoteSave} />}
      {showConfirm && <MarkAllConfirm count={filteredLeads.length} onConfirm={handleMarkAllDone} onCancel={() => setShowConfirm(false)} />}
    </div>
  );
}