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

const STATUS_COLORS: Record<string, string> = {
  "New":               "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
  "Contacted":         "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
  "Interested":        "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20",
  "Follow-up Needed":  "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
  "Converted":         "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
  "Lost":              "text-red-500 bg-red-50 dark:bg-red-900/20",
  "Not Interested":    "text-gray-500 bg-gray-100 dark:bg-gray-800",
};

const LOG_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  Call:     { icon: Phone,         color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-900/20",    label: "📞 Call"     },
  WhatsApp: { icon: MessageSquare, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20", label: "💬 WhatsApp" },
  Meeting:  { icon: Users,         color: "text-purple-600",  bg: "bg-purple-50 dark:bg-purple-900/20",  label: "🤝 Meeting"  },
  Note:     { icon: StickyNote,    color: "text-orange-500",  bg: "bg-orange-50 dark:bg-orange-900/20",  label: "📝 Note"     },
};

const STATUS_FILTER_OPTIONS = ["all", "New", "Contacted", "Interested", "Follow-up Needed", "Converted"];

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
  const [logs,        setLogs]        = useState<LogEntry[]>([]);
  const [newNote,     setNewNote]     = useState("");
  const [logType,     setLogType]     = useState("Call");
  const [loading,     setLoading]     = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [deleteId,    setDeleteId]    = useState<number | null>(null);
  const [isDeleting,  setIsDeleting]  = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!lead?.id) return;
    setLogsLoading(true);
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

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead?.id) return;
    if (!newNote.trim()) return void toast.error("Enter a summary");
    setLoading(true);
    try {
      await apiPost("/api/communication-logs", { lead_id: lead.id, type: logType, summary: newNote });
      setNewNote("");
      toast.success("Interaction logged");
      fetchLogs();
      onNewLog();
    } catch {
      toast.error("Save failed");
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

  const statusCls = STATUS_COLORS[lead?.lead_status ?? ""] || "text-gray-500 bg-gray-100";

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">

      {/* ── Mobile top bar ── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 lg:hidden">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          aria-label="Back"
        >
          <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <select
          value={lead?.id}
          onChange={(e) => {
            const found = leads.find((l) => l.id === parseInt(e.target.value));
            if (found) onSelectLead(found);
          }}
          className="flex-1 bg-transparent text-sm font-black uppercase tracking-tight outline-none dark:text-white"
        >
          {leads.map((l) => (
            <option key={l.id} value={l.id}>{l.full_name}</option>
          ))}
        </select>
      </div>

      {/* ── Lead info ── */}
      <div className="shrink-0 border-b border-gray-100 dark:border-gray-800 px-4 sm:px-6 py-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-white text-base uppercase shrink-0 shadow-lg shadow-blue-600/20">
              {lead?.full_name?.charAt(0)}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                {lead?.full_name}
              </h2>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">
                {lead?.interested_course || "General Enquiry"}
              </p>
            </div>
          </div>
          <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase shrink-0 ${statusCls}`}>
            {lead?.lead_status}
          </span>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2">
          <a href={`tel:${lead?.phone}`} className="flex flex-col items-center gap-1 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 transition-all">
            <Phone size={15} className="text-blue-600" />
            <span className="text-[9px] font-black text-blue-600 uppercase">Call</span>
          </a>
          <a href={`https://wa.me/91${lead?.phone?.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
            className="flex flex-col items-center gap-1 p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl hover:bg-emerald-100 transition-all">
            <MessageSquare size={15} className="text-emerald-600" />
            <span className="text-[9px] font-black text-emerald-600 uppercase">WhatsApp</span>
          </a>
          <div className="flex flex-col items-center gap-1 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <ShieldCheck size={15} className="text-gray-500" />
            <span className="text-[9px] font-black text-gray-500 uppercase">#{lead?.id}</span>
          </div>
        </div>

        {lead?.assigned_user_name && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-[9px] font-black text-indigo-600 uppercase">
              {lead.assigned_user_name.charAt(0)}
            </div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Counselor:</span>
            <span className="text-[10px] font-black text-gray-800 dark:text-white uppercase">{lead.assigned_user_name}</span>
          </div>
        )}
      </div>

      {/* ── Log form ── */}
      <div className="shrink-0 px-4 sm:px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">Log Interaction</p>

        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {Object.entries(LOG_CONFIG).map(([type, conf]) => (
            <button
              key={type}
              type="button"
              onClick={() => setLogType(type)}
              className={`py-2 text-[9px] font-black uppercase rounded-xl transition-all border ${
                logType === type
                  ? `${conf.bg} ${conf.color} border-current shadow-sm`
                  : "bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700"
              }`}
            >
              {conf.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleAddLog} className="flex gap-2">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder={`Write ${logType.toLowerCase()} summary…`}
            rows={2}
            className="flex-1 px-3 py-2.5 text-xs font-medium rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white outline-none focus:border-blue-400 resize-none transition-all"
          />
          <button
            type="submit"
            disabled={loading || !newNote.trim()}
            className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-[10px] disabled:opacity-40 transition-all active:scale-95 flex items-center gap-1.5 shrink-0 shadow-lg shadow-blue-600/20"
          >
            {loading
              ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Send size={14} />
            }
          </button>
        </form>
      </div>

      {/* ── Timeline ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 bg-white dark:bg-gray-900">
        {logsLoading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold uppercase">Loading logs…</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-300">
            <StickyNote size={32} className="mb-3 opacity-40" />
            <p className="text-[10px] font-black uppercase tracking-widest">No interactions yet</p>
            <p className="text-[9px] text-gray-400 mt-1">Log the first interaction above</p>
          </div>
        ) : (
          logs.map((log) => {
            const conf = LOG_CONFIG[log.type] ?? LOG_CONFIG["Note"];
            const Icon = conf.icon;
            return (
              <div key={log.id} className="flex gap-3 group">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${conf.bg} ${conf.color} shadow-sm`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-2xl rounded-tl-none px-4 py-3 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${conf.bg} ${conf.color}`}>
                        {log.type}
                      </span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">
                        by {log.user_name || "Staff"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] text-gray-400">{timeAgo(log.created_at)}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(log.id); }}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                        aria-label="Delete log"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
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
        message="This interaction will be permanently removed from the student's timeline."
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

  const filteredLeads = leads.filter((l) => {
    const matchSearch = l.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || l.phone?.includes(searchTerm);
    const matchStatus = statusFilter === "all" || l.lead_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCounts = leads.reduce<Record<string, number>>((acc, l) => {
    if (l.lead_status) acc[l.lead_status] = (acc[l.lead_status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] bg-white dark:bg-gray-900 lg:-m-6 overflow-hidden">

      {/* ── Lead list panel ── */}
      <div className={`flex flex-col border-r border-gray-100 dark:border-gray-800 w-full lg:w-[340px] xl:w-[380px] shrink-0 ${selectedLead ? "hidden lg:flex" : "flex"}`}>

        {/* Header */}
        <div className="shrink-0 px-4 sm:px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <span className="w-7 h-7 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
                <Zap size={13} className="text-white" />
              </span>
              Comm Hub
            </h1>
            <span className="text-[9px] font-black px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 border border-blue-100 dark:border-blue-800 uppercase">
              {filteredLeads.length}
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              type="text"
              placeholder="Search by name or phone…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold outline-none focus:border-blue-400 transition-all dark:text-white"
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status filter pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {STATUS_FILTER_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-black uppercase transition-all border ${
                  statusFilter === s
                    ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                }`}
              >
                {s === "all" ? "All" : s.replace("Follow-up Needed", "Follow-up")}
                {s !== "all" && statusCounts[s] ? ` (${statusCounts[s]})` : ""}
              </button>
            ))}
          </div>
        </div>

        {/* Lead list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold uppercase">Loading…</span>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-300">
              <UserCircle2 size={36} className="mb-3 opacity-30" />
              <p className="text-[10px] font-black uppercase tracking-widest">No results found</p>
            </div>
          ) : (
            filteredLeads.map((lead) => {
              const isSelected = selectedLead?.id === lead.id;
              const statusCls  = STATUS_COLORS[lead.lead_status ?? ""] ?? "text-gray-500 bg-gray-100";
              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-50 dark:border-gray-800 cursor-pointer transition-all ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-900/20 border-r-2 border-r-blue-600"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm uppercase shrink-0 transition-all ${
                    isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                  }`}>
                    {lead.full_name?.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-black uppercase truncate mb-0.5 ${isSelected ? "text-blue-700 dark:text-blue-400" : "text-gray-800 dark:text-white"}`}>
                      {lead.full_name}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase ${statusCls}`}>
                        {lead.lead_status?.replace("Follow-up Needed", "Follow-up")}
                      </span>
                      <span className="text-[9px] text-gray-400 tabular-nums truncate">{lead.phone}</span>
                    </div>
                  </div>

                  <ChevronRight size={14} className={`shrink-0 transition-all ${isSelected ? "text-blue-600 translate-x-0.5" : "text-gray-300"}`} />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Interaction Hub panel ── */}
      <div className={`flex-1 min-w-0 h-full overflow-hidden ${selectedLead ? "flex flex-col" : "hidden lg:flex lg:flex-col"}`}>
        {selectedLead ? (
          <InteractionHub
            lead={selectedLead}
            leads={filteredLeads}
            onSelectLead={setSelectedLead}
            onNewLog={fetchLeads}
            onBack={() => setSelectedLead(null)}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <MessageSquare size={28} className="text-blue-300" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Select a student</p>
            <p className="text-[10px] text-gray-300">Choose from the list to view communication history</p>
          </div>
        )}
      </div>
    </div>
  );
}