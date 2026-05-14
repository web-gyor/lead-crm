// src/pages/Communication.tsx
import { useState, useEffect, useCallback } from "react";
import {
  Phone, MessageSquare, Users, StickyNote,
  Zap, Search, ChevronRight, ShieldCheck,
  Trash2, ChevronLeft, UserCircle2, Send, X,
} from "lucide-react";
import { apiGet, apiPost, apiDelete } from "../utils/api";
import toast from "react-hot-toast";
import DeleteModal from "../components/DeleteModal";

// ─── Constants ────────────────────────────────────────────────────────────────

// dot+badge pattern matching every other page in the system
const STATUS_CONFIG: Record<string, { dot: string; badge: string }> = {
  "New":              { dot: "bg-blue-500",    badge: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800" },
  "Contacted":        { dot: "bg-amber-500",   badge: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800" },
  "Interested":       { dot: "bg-indigo-500",  badge: "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-800" },
  "Follow-up":        { dot: "bg-orange-500",  badge: "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800" },
  "Follow-up Needed": { dot: "bg-orange-500",  badge: "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800" },
  "Converted":        { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800" },
  "Lost":             { dot: "bg-rose-500",    badge: "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800" },
  "Not Interested":   { dot: "bg-gray-400",    badge: "bg-gray-100 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700" },
};
const getStatusCfg = (s?: string) =>
  STATUS_CONFIG[s ?? ""] ?? { dot: "bg-gray-400", badge: "bg-gray-100 text-gray-500 border border-gray-200" };

const LOG_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  Call:     { icon: Phone,         color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-900/20",       label: "📞 Call"     },
  WhatsApp: { icon: MessageSquare, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20", label: "💬 WhatsApp" },
  Meeting:  { icon: Users,         color: "text-purple-600",  bg: "bg-purple-50 dark:bg-purple-900/20",   label: "🤝 Meeting"  },
  Note:     { icon: StickyNote,    color: "text-orange-500",  bg: "bg-orange-50 dark:bg-orange-900/20",   label: "📝 Note"     },
};

const STATUS_FILTER_OPTIONS = ["all", "New", "Contacted", "Interested", "Follow-up", "Converted", "Lost", "Not Interested"];

const AVATAR_COLORS = [
  "bg-blue-600","bg-violet-600","bg-rose-600","bg-emerald-600",
  "bg-amber-600","bg-cyan-600","bg-pink-600","bg-indigo-600",
];
const avatarColor = (name: string) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];


// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString("en-GB");
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: number;
  full_name: string;
  phone?: string;
  lead_status?: string;
  interested_course?: string;
  assigned_user_name?: string;
}

interface LogEntry {
  id: number;
  type: string;
  summary: string;
  user_name?: string;
  created_at: string;
}

// ─── Interaction Hub ──────────────────────────────────────────────────────────

interface InteractionHubProps {
  lead: Lead;
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onNewLog: () => void;
  onBack: () => void;
}

function InteractionHub({ lead, leads, onSelectLead, onNewLog, onBack }: InteractionHubProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [newNote, setNewNote] = useState("");
  const [logType, setLogType] = useState("Call");
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
const [recordingFeatureEnabled, setRecordingFeatureEnabled] = useState(false);
const [useRecording, setUseRecording] = useState(false);


  const fetchLogs = useCallback(async (silent = false) => {
    if (!lead?.id) return;
    if (!silent) setLogsLoading(true);
    try {
      const data = await apiGet(`/api/communication-logs/${lead.id}`);
      setLogs(data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  }, [lead?.id]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

useEffect(() => {
  const checkSettings = async () => {
    try {
      const data = await apiGet("/api/settings");

      const enabled =
  Number(data?.is_call_recording_enabled) === 1 ||
  Number(data?.data?.is_call_recording_enabled) === 1;

    setRecordingFeatureEnabled(enabled);

      // Optional:
      // Auto-enable toggle if admin enabled globally
      if (enabled) {
        setUseRecording(true);
      }

    } catch (err) {
      console.error("Settings fetch failed", err);
    }
  };

  checkSettings();
}, []);

const bridgeEnabled =
  recordingFeatureEnabled &&
  useRecording &&
  !!lead?.phone;

const handleBridgeCall = async (e: React.MouseEvent) => {

  if (!bridgeEnabled) return;

  e.preventDefault();

  const loadingToast = toast.loading(
    "Initiating secure call bridge..."
  );

  try {

   const res = await apiPost(
  "/api/telephony/call/initiate",
  {
    leadId: lead.id,
    recordCall: useRecording
  }
);
    if (res?.success) {

      toast.success(
        "Connecting! Your phone will ring now.",
        { id: loadingToast }
      );

      fetchLogs(true);

    } else {

      toast.error(
        "Bridge unavailable. Opening normal dialer...",
        { id: loadingToast }
      );

      window.location.href = `tel:${lead.phone}`;
    }

  } catch (err: any) {

    toast.error(
      "Bridge failed. Opening normal dialer...",
      { id: loadingToast }
    );

    window.location.href = `tel:${lead.phone}`;
  }
};
  // ✅ FIX: Optimistic Update to prevent table from going empty
  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead?.id || !newNote.trim()) return;

    const tempNote = newNote.trim();
    const tempType = logType;
    
    // 1. Create a fake temporary log for instant UI feedback
    const tempLog: LogEntry = {
      id: Date.now(),
      type: tempType,
      summary: tempNote,
      user_name: "Saving...",
      created_at: new Date().toISOString()
    };

    setLoading(true);
    setNewNote(""); // Clear input immediately
    setLogs(prev => [tempLog, ...prev]); // Push to top of list instantly

    try {
      await apiPost("/api/communication-logs", { 
        lead_id: lead.id, 
        type: tempType, 
        summary: tempNote 
      });
      toast.success("Interaction logged");
      fetchLogs(true); // Silent refresh in background
      onNewLog();
    } catch {
      toast.error("Save failed");
      fetchLogs(); // Revert on failure
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await apiDelete(`/api/communication-logs/${deleteId}`);
      toast.success("Log entry removed");
      fetchLogs();
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete entry");
    } finally {
      setIsDeleting(false);
    }
  };

  const { dot, badge } = getStatusCfg(lead?.lead_status);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">

      {/* ── Mobile top bar ── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 lg:hidden">
        <button type="button" onClick={onBack}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          aria-label="Back">
          <ChevronLeft size={18} className="text-gray-600 dark:text-gray-400" />
        </button>
        <select value={lead?.id}
          onChange={(e) => {
            const found = leads.find(l => l.id === parseInt(e.target.value));
            if (found) onSelectLead(found);
          }}
          className="flex-1 bg-transparent text-sm font-black uppercase tracking-tight outline-none dark:text-white">
          {leads.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
        </select>
      </div>

      {/* ── Lead identity strip ── */}
      <div className="shrink-0 border-b border-gray-100 dark:border-gray-800 px-4 sm:px-5 py-4 space-y-3">

        {/* Avatar + name + status */}
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl ${avatarColor(lead?.full_name || "")}
            flex items-center justify-center font-black text-white text-sm uppercase shrink-0
            shadow-md`}>
            {lead?.full_name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">
                {lead?.full_name}
              </h2>
              {/* status dot+badge */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide shrink-0 ${badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
                {lead?.lead_status}
              </span>
            </div>
            <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider mt-0.5">
              {lead?.interested_course || "General Enquiry"} · #{lead?.id}
            </p>
          </div>
        </div>

{/* ── Call Recording Toggle ── */}
<div className={`rounded-xl border overflow-hidden mb-3 transition-all ${
    useRecording
    ? "border-red-200 dark:border-red-900/40"
    : "border-gray-100 dark:border-gray-800"
}`}>
  
  {/* Toggle row */}
  <div className="flex items-center justify-between px-3 py-2.5 bg-white dark:bg-gray-900">
    <div className="flex items-center gap-2.5">
      {/* Animated dot — red and pulsing when ON */}
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
          useRecording
          ? "bg-red-500 animate-pulse"
          : "bg-gray-300 dark:bg-gray-600"
      }`} />
      <div>
        <p className="text-[11px] font-black uppercase tracking-tight text-gray-800 dark:text-white">
          Call Recording
        </p>
        <p className="text-[9px] font-medium text-gray-400 uppercase tracking-widest">
          {useRecording? "On — calls will be logged" : "Off — calls won't be recorded"}
        </p>
      </div>
    </div>

    {/* Toggle switch */}
<button
  disabled={!recordingFeatureEnabled}
  onClick={() => setUseRecording(prev => !prev)}
 className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
    useRecording
      ? "bg-blue-600"
      : "bg-gray-200 dark:bg-gray-700"
  }`}
  aria-label="Toggle call recording"
>
  <span
    className={`${
      useRecording
        ? "translate-x-5"
        : "translate-x-1"
    } inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform`}
  />
</button>
  </div>

  {/* Live banner — only visible when recording is ON */}
  {useRecording && (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/10 border-t border-red-100 dark:border-red-900/30">
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
      </span>
      <p className="text-[9px] font-black uppercase tracking-widest text-red-500">
        Recording active — bridge calls will be logged
      </p>
    </div>
  )}
</div>

  {/* Quick action row - Forced 3 Columns */}
{/* Recording Warning */}
{!recordingFeatureEnabled && (
  <div className="mb-3 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/30">
    <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">
      Recording unavailable — enable from settings
    </p>
  </div>
)}

{/* Quick action row */}
<div className="grid grid-cols-3 gap-2 mt-3">

  {/* Column 1: Call */}
  <a
    href={`tel:${lead?.phone}`}
    onClick={handleBridgeCall}
    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border shadow-sm ${
      useRecording
        ? "bg-blue-600 text-white border-blue-700 hover:bg-blue-700 active:scale-95"
        : "bg-blue-50 dark:bg-blue-900/10 text-blue-600 border-blue-100 dark:border-blue-800 hover:bg-blue-100"
    }`}
  >
    {useRecording ? (
      <>
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
        </span>
        <span className="truncate">Rec</span>
      </>
    ) : (
      <>
        <Phone size={12} strokeWidth={3} className="shrink-0" />
        <span>Call</span>
      </>
    )}
  </a>

  {/* Column 2: WA */}
  <a 
    href={`https://wa.me/91${lead?.phone?.replace(/\D/g, "")}`}
    target="_blank" 
    rel="noreferrer"
    className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-50 dark:bg-emerald-900/10
      text-emerald-600 border border-emerald-100 dark:border-emerald-800 rounded-xl text-[10px] 
      font-black uppercase tracking-tight hover:bg-emerald-100 transition-all active:scale-95 shadow-sm"
  >
    <MessageSquare size={12} strokeWidth={3} className="shrink-0" /> 
    <span>WA</span>
  </a>

  {/* Column 3: Staff (Placeholder if no assigned user to keep 3 cols) */}
  <div className="flex items-center justify-center gap-1.5 py-2.5 bg-indigo-50
    dark:bg-indigo-900/10 text-indigo-600 border border-indigo-100 dark:border-indigo-800 
    rounded-xl text-[10px] font-black uppercase tracking-tight shadow-sm">
    {lead?.assigned_user_name ? (
      <>
        <ShieldCheck size={12} strokeWidth={3} className="shrink-0" />
        <span className="truncate">{lead.assigned_user_name.split(" ")[0]}</span>
      </>
    ) : (
      <>
        <UserCircle2 size={12} strokeWidth={3} className="shrink-0" />
        <span>Staff</span>
      </>
    )}
  </div>
</div></div>

      {/* ── Log form ── */}
      <div className="shrink-0 px-4 sm:px-5 py-3 bg-gray-50/60 dark:bg-gray-800/40
        border-b border-gray-100 dark:border-gray-800">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
          Log Interaction
        </p>

        {/* Type selector pills — same pill-group pattern as other pages */}
        <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg mb-2.5">
          {Object.entries(LOG_CONFIG).map(([type, conf]) => (
            <button key={type} type="button" onClick={() => setLogType(type)}
              className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wide rounded-md transition-all ${
                logType === type
                  ? `bg-white dark:bg-gray-700 ${conf.color} shadow-sm`
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}>
              {type}
            </button>
          ))}
        </div>

        <form onSubmit={handleAddLog} className="flex gap-2">
          <textarea value={newNote} onChange={e => setNewNote(e.target.value)}
            placeholder={`${logType} summary…`}
            rows={2}
            className="flex-1 px-3 py-2 text-xs font-medium rounded-xl border border-gray-200
              dark:border-gray-700 dark:bg-gray-900 dark:text-white outline-none
              focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 resize-none transition-all
              placeholder:text-gray-400"
          />
          <button type="submit" disabled={loading || !newNote.trim()}
            className="px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl
              font-black uppercase text-[10px] disabled:opacity-40 transition-all
              active:scale-95 flex items-center gap-1.5 shrink-0 shadow-md shadow-blue-600/20">
            {loading
              ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Send size={13} />}
          </button>
        </form>
      </div>

      {/* ── Timeline ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
        {logsLoading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Loading…</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2">
            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <StickyNote size={20} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">No interactions yet</p>
            <p className="text-[9px] text-gray-300 dark:text-gray-600">Log the first interaction above</p>
          </div>
        ) : (
          logs.map(log => {
            const conf = LOG_CONFIG[log.type] ?? LOG_CONFIG["Note"];
            const Icon = conf.icon;
            return (
              <div key={log.id} className="flex gap-2.5 group">
                {/* Icon dot */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                  mt-0.5 ${conf.bg} ${conf.color}`}>
                  <Icon size={13} />
                </div>

                {/* Bubble */}
                <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-2xl rounded-tl-sm
                  px-3.5 py-3 min-w-0 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5
                        rounded-md ${conf.bg} ${conf.color}`}>
                        {log.type}
                      </span>
                      <span className="text-[9px] text-gray-400 truncate">
                        {log.user_name || "Staff"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[9px] text-gray-400 whitespace-nowrap">
                        {timeAgo(log.created_at)}
                      </span>
                      <button type="button"
                        onClick={e => { e.stopPropagation(); setDeleteId(log.id); }}
                        className="p-1 text-gray-300 dark:text-gray-600 hover:text-rose-500
                          hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all
                          opacity-0 group-hover:opacity-100">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed">
                    {log.summary}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <DeleteModal
        isOpen={deleteId !== null}
        title="Delete Log Entry?"
        message="This interaction will be permanently removed from the lead's timeline."
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CommunicationPage() {
  const [leads,        setLeads]        = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchTerm,   setSearchTerm]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading,      setLoading]      = useState(true);
const [totalCount,  setTotalCount]  = useState(0);
  const fetchLeads = useCallback(async () => {
    try {
      const res: any = await apiGet("/api/leads?status=all&limit=300");
      setLeads(
        Array.isArray(res?.data) ? res.data
        : Array.isArray(res)     ? res
        : []
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const filteredLeads = leads.filter(l => {
    const matchSearch = l.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || l.phone?.includes(searchTerm);
    const matchStatus = statusFilter === "all" || l.lead_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCounts = leads.reduce<Record<string, number>>((acc, l) => {
    if (l.lead_status) acc[l.lead_status] = (acc[l.lead_status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]
      bg-white dark:bg-gray-900 lg:-m-6 overflow-hidden">

      {/* ══════════════════════════════════════════════════════
          LEAD LIST PANEL
      ══════════════════════════════════════════════════════ */}
      <div className={`flex flex-col border-r border-gray-100 dark:border-gray-800
        w-full lg:w-[320px] xl:w-[360px] shrink-0
        ${selectedLead ? "hidden lg:flex" : "flex"}`}>

        {/* Header */}
        <div className="shrink-0 px-4 sm:px-5 pt-4 pb-3
          border-b border-gray-100 dark:border-gray-800 space-y-3">

          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-black text-gray-900 dark:text-white tracking-tight
              flex items-center gap-2">
              <span className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center
                shadow-md shadow-blue-600/20 shrink-0">
                <Zap size={13} className="text-white" />
              </span>
              Comm Hub
            </h1>
            <span className="text-[9px] font-bold px-2 py-1 rounded-full
              bg-blue-50 dark:bg-blue-900/20 text-blue-600
              border border-blue-100 dark:border-blue-800 uppercase tracking-wide">
              {totalCount} 
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input type="text" placeholder="Name or phone…" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-gray-50 dark:bg-gray-800
                border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium
                outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10
                transition-all dark:text-white placeholder:text-gray-400" />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>

       
         {/* Status filter pills */}
           <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {STATUS_FILTER_OPTIONS.map(s => {
              const cfg    = getStatusCfg(s === "all" ? undefined : s);
              const active = statusFilter === s;
              return (
                <button key={s} type="button" onClick={() => setStatusFilter(s)}
                  className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full
  text-[9px] font-semibold uppercase tracking-wide transition-all border whitespace-nowrap ${
                    active
                      ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100"
                      : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300"}`}>
                  {s !== "all" && (
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? "bg-white dark:bg-gray-900" : cfg.dot}`} />
                  )}
                  {s === "all" ? "All" : s.replace("Follow-up Needed", "Follow-up")}
                  {s !== "all" && statusCounts[s] ? ` ${statusCounts[s]}` : ""}
                </button>
              );
            })}
          </div>
        </div>


        {/* Lead rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">Loading…</span>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <UserCircle2 size={32} className="text-gray-200 dark:text-gray-700" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                No results
              </p>
            </div>
          ) : (
            filteredLeads.map(lead => {
              const isSelected = selectedLead?.id === lead.id;
              const { dot, badge } = getStatusCfg(lead.lead_status);
              return (
                <div key={lead.id} onClick={() => setSelectedLead(lead)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-900/20 border-r-2 border-r-blue-600"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}>

                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center
                    font-black text-sm uppercase shrink-0 transition-all ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : `${avatarColor(lead.full_name)} text-white`}`}>
                    {lead.full_name?.[0]}
                  </div>

                  {/* Name + status */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-black uppercase truncate mb-0.5 ${
                      isSelected ? "text-blue-700 dark:text-blue-400" : "text-gray-800 dark:text-white"}`}>
                      {lead.full_name}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {/* dot+badge status inline */}
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5
                        rounded-full text-[8px] font-semibold uppercase ${badge}`}>
                        <span className={`w-1 h-1 rounded-full ${dot} shrink-0`} />
                        {lead.lead_status?.replace("Follow-up Needed", "Follow-up")}
                      </span>
                      <span className="text-[9px] text-gray-400 tabular-nums truncate">
                        {lead.phone}
                      </span>
                    </div>
                  </div>

                  <ChevronRight size={13} className={`shrink-0 transition-all ${
                    isSelected ? "text-blue-600 translate-x-0.5" : "text-gray-300"}`} />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          INTERACTION HUB PANEL
      ══════════════════════════════════════════════════════ */}
      <div className={`flex-1 min-w-0 h-full overflow-hidden
        ${selectedLead ? "flex flex-col" : "hidden lg:flex lg:flex-col"}`}>
        {selectedLead ? (
          <InteractionHub
            lead={selectedLead}
            leads={leads}
            onSelectLead={setSelectedLead}
            onNewLog={fetchLeads}
            onBack={() => setSelectedLead(null)}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center
            bg-gray-50/50 dark:bg-gray-900 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20
              flex items-center justify-center">
              <MessageSquare size={24} className="text-blue-300 dark:text-blue-700" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Select a lead
            </p>
            <p className="text-[10px] text-gray-300 dark:text-gray-600 text-center max-w-[200px]">
              Choose from the list to view communication history
            </p>
          </div>
        )}
      </div>
    </div>
  );
}