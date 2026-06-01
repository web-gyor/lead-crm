import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { 
  Phone, MessageSquare, Mail, Zap, Send, Trash2, 
  StickyNote, ChevronLeft, Loader2, ClipboardList
} from "lucide-react";
import { apiGet, apiPost, apiDelete } from "../../utils/api";
import { parseTemplate } from "../../utils/templateHelper";
import { STATUS_CONFIG } from "../../constants/statusConfig";
import { LOG_CONFIG } from "../../constants/logConfig";
import DeleteModal from "../DeleteModal";

// 🎯 INJECT UNIFIED MODERN HOOK
import { useToast } from "../../hooks/useToast";

// ─── PRESENTATIONAL LOCAL DESIGN SYSTEM ACCENTS ──────────────────────────────
const getStatusCfg = (s?: string) =>
  STATUS_CONFIG[s ?? ""] ?? { dot: "bg-slate-400", badge: "bg-slate-100 text-slate-500 border border-slate-200" };

const AVATAR_COLORS = ["bg-blue-600", "bg-violet-600", "bg-rose-600", "bg-emerald-600", "bg-amber-600"];
const getAvatarColor = (name: string) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString("en-GB");
}

const StatusBadge = React.memo(({ status }: { status?: string }) => {
  const { dot, badge } = getStatusCfg(status);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide shrink-0 ${badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
      {status?.replace("Follow-up Needed", "Follow-up")}
    </span>
  );
});

// ─── DOMAIN INTERFACES ───────────────────────────────────────────────────────
interface Lead {
  id: number;
  full_name: string;
  phone?: string;
  email?: string;
  lead_status?: string;
  interested_course?: string;
}

interface LogEntry {
  id: number;
  type: string;
  summary: string;
  user_name?: string;
  created_at: string;
}

interface InteractionHubProps {
  lead: Lead;
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onNewLog: () => void;
  onBack: () => void;
}

export default function InteractionHub({ lead, leads, onSelectLead, onNewLog, onBack }: InteractionHubProps) {
  const { addToast } = useToast();

  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [newNote, setNewNote] = useState("");
  const [logType, setLogType] = useState("Call");
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [recordingFeatureEnabled, setRecordingFeatureEnabled] = useState(false);
  const [useRecording, setUseRecording] = useState(false);
  const [templates, setTemplates] = useState<{ sms: any[]; email: any[]; whatsapp: any[] }>({ sms: [], email: [], whatsapp: [] });
  
  // Dropdown controls for context layouts
  const [activeDropdown, setActiveDropdown] = useState<'wa' | 'sms' | 'email' | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close popup dropdown boxes if user clicks outside them
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // 1. Unified Sync Dynamic Communications Timeline History
  const fetchLogs = useCallback(async (silent = false) => {
    if (!lead?.id) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    if (!silent) setLogsLoading(true);
    try {
      const res = await apiGet(`/api/leads/comm-logs/${lead.id}`, {
        signal: abortControllerRef.current.signal
      });
      
      const unpackedRows = res?.data ?? (Array.isArray(res) ? res : []);
      setLogs(unpackedRows);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Timeline load crash trace:", err);
      }
    } finally {
      if (!silent) setLogsLoading(false);
    }
  }, [lead?.id]);

  // 2. Load Channel Specific Message Templates & Telephony Rules
  useEffect(() => {
    let isMounted = true;
    const fetchHubMetaData = async () => {
      try {
        const [smsRes, waRes, emailRes, settingsRes] = await Promise.all([
          apiGet("/api/communication-templates?type=sms").catch(() => ({ data: [] })),
          apiGet("/api/communication-templates?type=whatsapp").catch(() => ({ data: [] })),
          apiGet("/api/communication-templates?type=email").catch(() => ({ data: [] })),
          apiGet("/api/settings").catch(() => null)
        ]);

        if (!isMounted) return;

        setTemplates({
          sms: smsRes?.data || [],
          whatsapp: waRes?.data || [],
          email: emailRes?.data || []
        });

        const enabled = Number(settingsRes?.is_call_recording_enabled || settingsRes?.data?.is_call_recording_enabled) === 1;
        setRecordingFeatureEnabled(enabled);
        if (enabled) setUseRecording(true);
      } catch (err) {
        console.error("Hub metadata settings payload loading exception", err);
      }
    };

    fetchHubMetaData();
    fetchLogs();

    return () => {
      isMounted = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [lead.id, fetchLogs]);

  // 3. Automated Communication Template Dispatches
  const handleCommClick = async (type: 'sms' | 'wa' | 'email', chosenTemplate?: any) => {
    if (!lead?.phone && type !== 'email') {
      addToast("Valid telephone routing index missing", "error");
      return;
    }

    const templateList = type === 'wa' ? templates.whatsapp : templates[type];
    
    // Explicitly targeted template item, or default active option
    const template = chosenTemplate || templateList.find((t: any) => t.is_active) || templateList[0];
    let parsedMsg = "";
    let url = "";

    if (template) {
      // Execute the case-insensitive regex swap layout using your templateHelper configuration
      parsedMsg = parseTemplate(template.message, { 
        name: lead.full_name, 
        course: lead.interested_course || "Course",
        ...lead 
      });
    }

    const cleanPhone = lead.phone?.replace(/\D/g, "") || "";
    
    // 🎯 FIXED URL BUILDERS: Maps the string parameters perfectly across all pathways
    if (type === 'wa') {
      url = `https://wa.me/91${cleanPhone}${parsedMsg ? `?text=${encodeURIComponent(parsedMsg)}` : ""}`;
    } else if (type === 'sms') {
      url = `sms:${lead.phone}?&body=${encodeURIComponent(parsedMsg)}`;
    } else if (type === 'email') {
      if (!lead.email) {
        addToast("Mailbox target destination unconfigured", "error");
        return;
      }
      const subject = template?.subject ? parseTemplate(template.subject, { name: lead.full_name }) : "Follow up regarding your enquiry";
      url = `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(parsedMsg)}`;
    }

    // Attempt communication log preservation state mapping in background
    try {
      await apiPost("/api/leads/comm-logs", {
        lead_id: lead.id,
        type: type === 'wa' ? 'WhatsApp' : type.toUpperCase(),
        summary: template ? `Sent ${type.toUpperCase()} template: ${template.title}` : `Opened manual ${type.toUpperCase()} dialer`
      });
      fetchLogs(true);
    } catch (err) {
      console.error("Auto log mutation injection failure", err);
    }

    // Reset layout UI selection state
    setActiveDropdown(null);

    // 🎯 FIXED DISPATCH GATEWAY: This triggers execution for BOTH template and blank dispatches flawlessly
    if (type === 'wa') {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = url;
    }
  };

  // 4. Secure Telephony Allocation Bridge
  const handleBridgeCall = async (e: React.MouseEvent) => {
    if (!recordingFeatureEnabled || !useRecording || !lead?.phone) return;
    e.preventDefault();

    addToast("Initiating secure call bridge...", "info");
    try {
      const res = await apiPost("/api/telephony/call/initiate", { leadId: lead.id, recordCall: useRecording });
      if (res?.success) {
        addToast("Connecting! Your phone will ring now.", "success");
        fetchLogs(true);
      } else {
        throw new Error("Bridge fail safe triggered");
      }
    } catch {
      addToast("Bridge unavailable. Opening system dialer...", "error");
      window.location.href = `tel:${lead.phone}`;
    }
  };

  // 5. Ingest Manual Interactions Logging
  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead?.id || !newNote.trim() || loading) return;

    const tempNote = newNote.trim();
    const tempType = logType;

    setLoading(true);

    try {
      const res = await apiPost("/api/leads/comm-logs", { 
        lead_id: Number(lead.id), 
        type: tempType, 
        summary: tempNote 
      });
      
      if (res && (res.success || res.logId)) {
        addToast("Interaction logged", "success");
        setNewNote(""); 

        const savedLogItem: LogEntry = {
          id: res.logId || Date.now(),
          type: tempType,
          summary: tempNote,
          user_name: currentUser?.name || currentUser?.username || "Staff",
          created_at: new Date().toISOString()
        };

        setLogs(prev => [savedLogItem, ...prev]);

        if (typeof onNewLog === "function") {
          onNewLog();
        }
      } else {
        addToast(res?.error || "Failed to preserve log parameters", "error");
      }
    } catch (err: any) {
      console.error("❌ Component execution handler failure:", err);
      const errMsg = err?.response?.data?.error || err?.error || err?.message || "Save failed";
      addToast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  // 6. Secure Interaction Purges
  const confirmDelete = async () => {
    if (!deleteId || isDeleting) return;
    setIsDeleting(true);
    const cachedLogs = [...logs];
    setLogs(prev => prev.filter(l => l.id !== deleteId));

    try {
      await apiDelete(`/api/leads/comm-logs/${deleteId}`);
      addToast("Log entry removed", "success");
      setDeleteId(null);
      fetchLogs(true);
    } catch {
      addToast("Failed to delete entry", "error");
      setLogs(cachedLogs);
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper macro to draw template dropdown lists cleanly
  const renderTemplateDropdownMenu = (type: 'wa' | 'sms' | 'email', list: any[]) => {
    if (activeDropdown !== type) return null;
    return (
      <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-44 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700/60 animate-in fade-in slide-in-from-top-1 duration-150">
        <div className="p-1.5 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-1 select-none border-b border-slate-100 dark:border-slate-700">
          <ClipboardList size={10} className="text-indigo-500" />
          <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Select Template Preset</span>
        </div>
        {list.length === 0 ? (
          <p className="p-3 text-[10px] text-slate-400 italic text-center select-none">No templates available</p>
        ) : (
          list.map((t: any) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleCommClick(type, t)}
              className="w-full text-left px-3 py-2 text-[10px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 block truncate transition-colors cursor-pointer border-none"
            >
              {t.title} {t.is_active && <span className="text-[8px] text-blue-500 bg-blue-50 dark:bg-blue-950/40 px-1 rounded ml-1 font-black">Default</span>}
            </button>
          ))
        )}
        <button
          type="button"
          onClick={() => handleCommClick(type)}
          className="w-full text-center px-3 py-1.5 text-[8px] font-black uppercase tracking-wider text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 block transition-colors border-t border-slate-100 dark:border-slate-700 cursor-pointer"
        >
          ⚡ Open Plain Blank Canvas
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Mobile Top Context Navigation row */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 lg:hidden select-none">
        <button type="button" onClick={onBack} className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"><ChevronLeft size={18} className="text-slate-600 dark:text-slate-400" /></button>
        <select value={lead?.id} onChange={(e) => { const found = leads.find(l => l.id === parseInt(e.target.value)); if (found) onSelectLead(found); }} className="flex-1 bg-transparent text-sm font-black uppercase tracking-tight outline-none dark:text-white border-none cursor-pointer">
          {leads.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
        </select>
      </div>

      {/* Profile Header Metadata Block */}
      <div className="shrink-0 border-b border-slate-100 dark:border-slate-800 px-5 py-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl ${getAvatarColor(lead?.full_name || "")} flex items-center justify-center font-black text-white text-sm uppercase shrink-0 shadow-sm`}>{lead?.full_name?.[0]}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{lead?.full_name}</h2>
              <StatusBadge status={lead?.lead_status} />
            </div>
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mt-0.5">{lead?.interested_course || "General Enquiry"} · #{lead?.id}</p>
          </div>
        </div>

        {/* Secure Recording Toggles */}
        <div className={`rounded-xl border overflow-hidden select-none transition-all ${useRecording ? "border-red-100 dark:border-red-950" : "border-slate-100 dark:border-slate-800"}`}>
          <div className="flex items-center justify-between px-3 py-2.5 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${useRecording ? "bg-red-500 animate-pulse" : "bg-slate-300 dark:bg-slate-700"}`} />
              <div>
                <p className="text-[11px] font-black uppercase tracking-tight text-slate-800 dark:text-white">Call Recording</p>
                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">{useRecording ? "On — calls will be logged" : "Off — calls won't be recorded"}</p>
              </div>
            </div>
            <button type="button" disabled={!recordingFeatureEnabled} onClick={() => setUseRecording(prev => !prev)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 cursor-pointer ${useRecording ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-800"}`}><span className={`${useRecording ? "translate-x-5" : "translate-x-1"} inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform`} /></button>
          </div>
          {useRecording && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50/40 dark:bg-red-950/10 border-t border-red-100/60 dark:border-red-900/30"><span className="relative flex h-1.5 w-1.5 shrink-0"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" /></span><p className="text-[9px] font-black uppercase tracking-widest text-red-500 dark:text-red-400">Recording active — bridge calls will be logged</p></div>
          )}
        </div>

        {/* Dynamic Action Grid with Integrated Dropdown Selectors */}
        <div className="grid grid-cols-4 gap-2 relative" ref={dropdownRef}>
          
          {/* Telephony Trigger Button */}
          <div className="relative">
            <a href={`tel:${lead?.phone}`} onClick={handleBridgeCall} className={`w-full h-full flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-[9px] font-black uppercase border shadow-xs transition-all active:scale-95 ${useRecording ? "bg-blue-600 text-white border-blue-700 hover:bg-blue-700" : "bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 border-blue-100/40 dark:border-blue-900/40 hover:bg-blue-100"}`}>
              {useRecording ? ( <div className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /><span>Rec</span></div> ) : ( <Phone size={12} strokeWidth={3} /> )}
              <span>Call</span>
            </a>
          </div>

          {/* WhatsApp Template Selector Trigger */}
          <div className="relative">
            <button 
              type="button" 
              onClick={() => setActiveDropdown(activeDropdown === 'wa' ? null : 'wa')} 
              className={`w-full flex flex-col items-center justify-center gap-1 py-2.5 border rounded-xl text-[9px] font-black uppercase transition-all active:scale-95 shadow-xs cursor-pointer ${activeDropdown === 'wa' ? "bg-emerald-600 text-white border-emerald-700" : "bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border-emerald-100/40 dark:border-emerald-900/40 hover:bg-emerald-100/60"}`}
            >
              <MessageSquare size={12} strokeWidth={3} />
              <span>WA</span>
            </button>
            {renderTemplateDropdownMenu('wa', templates.whatsapp)}
          </div>

          {/* SMS Template Selector Trigger */}
          <div className="relative">
            <button 
              type="button" 
              onClick={() => setActiveDropdown(activeDropdown === 'sms' ? null : 'sms')} 
              className={`w-full flex flex-col items-center justify-center gap-1 py-2.5 border rounded-xl text-[9px] font-black uppercase transition-all active:scale-95 shadow-xs cursor-pointer ${activeDropdown === 'sms' ? "bg-amber-500 text-white border-amber-600" : "bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 border-amber-100/40 dark:border-amber-900/40 hover:bg-amber-100/60"}`}
            >
              <Zap size={12} strokeWidth={3} />
              <span>SMS</span>
            </button>
            {renderTemplateDropdownMenu('sms', templates.sms)}
          </div>

          {/* Email Template Selector Trigger */}
          <div className="relative">
            <button 
              type="button" 
              onClick={() => setActiveDropdown(activeDropdown === 'email' ? null : 'email')} 
              className={`w-full flex flex-col items-center justify-center gap-1 py-2.5 border rounded-xl text-[9px] font-black uppercase transition-all active:scale-95 shadow-xs cursor-pointer ${activeDropdown === 'email' ? "bg-purple-600 text-white border-purple-700" : "bg-purple-50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400 border-purple-100/40 dark:border-purple-900/40 hover:bg-purple-100/60"}`}
            >
              <Mail size={12} strokeWidth={3} />
              <span>Email</span>
            </button>
            {renderTemplateDropdownMenu('email', templates.email)}
          </div>

        </div>
      </div>

      {/* Manual Interventions Log Composer Entry Form */}
      <div className="shrink-0 px-5 py-3 bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-2 select-none">Log Interaction</p>
        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg mb-2.5 select-none">
          {Object.entries(LOG_CONFIG).map(([type, conf]) => (
            <button key={type} type="button" onClick={() => setLogType(type)} className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wide rounded-md transition-all cursor-pointer ${logType === type ? `bg-white dark:bg-slate-700 ${conf.color} shadow-xs` : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}>{type}</button>
          ))}
        </div>
        <form onSubmit={handleAddLog} className="flex gap-2">
          <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder={`${logType} interaction log summary text…`} rows={2} className="flex-1 px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white outline-none focus:border-blue-400 resize-none transition-all placeholder-slate-400" />
          <button type="submit" disabled={loading || !newNote.trim()} className="px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-[10px] disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center shrink-0 shadow-md shadow-blue-600/10 cursor-pointer">
            {loading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={13} />}
          </button>
        </form>
      </div>

      {/* Timeline Stream Execution List */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {logsLoading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-slate-400 select-none"><Loader2 size={16} className="animate-spin text-blue-600" /><span className="text-[10px] font-bold uppercase tracking-wide">Loading Timeline...</span></div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2 select-none">
            <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center"><StickyNote size={20} className="text-slate-300 dark:text-slate-600" /></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No interactions logged</p>
          </div>
        ) : (
          logs.map(log => {
            const conf = LOG_CONFIG[log.type] ?? LOG_CONFIG["Note"];
            const Icon = conf.icon;
            return (
              <div key={log.id} className="flex gap-2.5 group animate-in fade-in duration-100">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${conf.bg} ${conf.color}`}><Icon size={13} /></div>
                <div className="flex-1 bg-slate-50 dark:bg-slate-900/60 rounded-2xl rounded-tl-sm px-3.5 py-3 min-w-0 border border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0 select-none">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${conf.bg} ${conf.color}`}>{log.type}</span>
                      <span className="text-[9px] text-slate-400 font-semibold truncate">{log.user_name || "Staff"}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 select-none">
                      <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">{timeAgo(log.created_at)}</span>
                      {log.user_name !== "Saving..." && (
                        <button type="button" onClick={e => { e.stopPropagation(); setDeleteId(log.id); }} className="p-1 text-slate-300 dark:text-slate-600 hover:text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"><Trash2 size={12} /></button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{log.summary}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <DeleteModal isOpen={deleteId !== null} title="Delete Log Entry?" message="This interaction will be permanently removed from the lead's timeline." onClose={() => setDeleteId(null)} onConfirm={confirmDelete} isDeleting={isDeleting} />
    </div>
  );
}