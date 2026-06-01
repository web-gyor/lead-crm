import React, { useState, useEffect, useCallback, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  Search, Trash2, Calendar, X, RefreshCw, Eye, 
  RotateCcw, Filter, Eraser, ChevronRight, Check
} from "lucide-react";
import { apiGet, apiPost } from "../../utils/api";
import PaginationFooter from "../../components/leads/PaginationFooter";
import ActivityLogsMini from "../../components/ActivityLogsMini";

// Only import the Wipe Modal (Permanent Destructive Actions require full cover safety)
import { VaultWipeModal } from "./components/RestoreModals";

const STATUS_COLORS: Record<string, string> = {
  "New": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",
  "Contacted": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
  "Interested": "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400",
  "Follow-up": "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400",
  "Converted": "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
  "Lost": "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400",
  "Not Interested": "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
};

const INPUT_VIEW = "w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 dark:text-white outline-none cursor-default font-medium";
const FILTER_SELECT = "px-3 py-2 bg-slate-50 dark:bg-slate-900 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none focus:border-cyan-500 w-full cursor-pointer appearance-none";

export default function ColdStorage() {
  const currentUser = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const isAdmin = useMemo(() => currentUser?.role?.toLowerCase() === "admin", [currentUser]);

  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters State Logic
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [counselorId, setCounselorId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState(""); 
  
  // Dropdowns Options
  const [sources, setSources] = useState<any[]>([]);
  const [counselors, setCounselors] = useState<any[]>([]);

  // Selection states Matrix
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [viewingLead, setViewingLead] = useState<any | null>(null);

  // ✅ REDESIGNED PREMIUM INTERACTION ACTIONS STATE
  const [restoreConfirmId, setRestoreConfirmId] = useState<number | null>(null);
  const [wipeTargetIds, setWipeTargetIds] = useState<number[]>([]);
  const [isWipeOpen, setIsWipeOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  // Outside click safety dismiss for active inline slider states
  useEffect(() => {
    if (restoreConfirmId === null) return;
    const handleOutsideClickClose = () => setRestoreConfirmId(null);
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") setRestoreConfirmId(null); };

    window.addEventListener("click", handleOutsideClickClose);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleOutsideClickClose);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [restoreConfirmId]);

  const isAllSelected = useMemo(() => {
    return leads.length > 0 && leads.every(lead => selectedLeads.includes(lead.id));
  }, [leads, selectedLeads]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const pageIds = leads.map(l => l.id);
      setSelectedLeads(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      const newIds = leads.map(l => l.id).filter(id => !selectedLeads.includes(id));
      setSelectedLeads(prev => [...prev, ...newIds]);
    }
  };

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setShowFilters(false);
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(rowsPerPage),
        search: searchTerm.trim(),
        source_id: sourceId,          
        assigned_user_id: counselorId, 
        lead_status: status,          
        startDate: startDate,
        endDate: endDate
      });

      const res = await apiGet(`/api/leads/archive?${params.toString()}`);
      if (res && res.success) {
        setLeads(res.data || []);
        setTotalCount(res.pagination?.totalItems || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err) {
      toast.error("Vault filtration stream lost");
    } finally {
      setLoading(false);
    }
  }, [currentPage, rowsPerPage, searchTerm, sourceId, counselorId, status, startDate, endDate]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    apiGet("/api/lead-sources").then(res => {
      setSources(res?.data || (Array.isArray(res) ? res : []));
    }).catch(() => {});

    apiGet("/api/users").then(res => {
      const list = res?.data || (Array.isArray(res) ? res : []);
      setCounselors(list.filter((u: any) => u.role?.toLowerCase() === "counselor"));
    }).catch(() => {});
  }, []);

  const clearFilters = () => {
    setSearchTerm("");
    setSourceId("");
    setCounselorId("");
    setStatus("");
    setStartDate("");
    setEndDate("");
    setSelectedLeads([]);
    setCurrentPage(1);
    toast.success("Filters cleared cleanly", { icon: <Eraser size={14}/> });
  };

  const handleOpenWipeModal = (ids: number[]) => {
    if (!isAdmin) return toast.error("Unauthorized administrative level block");
    setWipeTargetIds(ids);
    setIsWipeOpen(true);
  };

  // ✅ LIGHTWEIGHT INSTANT DISPATCH RESTORE ACTIONS LOGIC
  const executeInlineRestore = async (id: number) => {
    setRestoreConfirmId(null);
    setProcessingAction(true);
    const toastId = toast.loading("Restoring profile...");
    try {
      const res = await apiPost("/api/leads/archive/restore", { leadIds: [id] });
      if (res?.success || res?.status === true) {
        toast.success("Profile restored securely", { id: toastId });
        setSelectedLeads(prev => prev.filter(item => item !== id));
        loadData();
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Operation transaction failed", { id: toastId });
    } finally {
      setProcessingAction(false);
    }
  };

  const executeBulkRestore = async () => {
    if (!selectedLeads.length) return;
    setProcessingAction(true);
    const toastId = toast.loading("Restoring selected profiles...");
    try {
      const res = await apiPost("/api/leads/archive/restore", { leadIds: selectedLeads });
      if (res?.success || res?.status === true) {
        toast.success("Profiles restored securely", { id: toastId });
        setSelectedLeads([]);
        loadData();
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Bulk operation failed", { id: toastId });
    } finally {
      setProcessingAction(false);
    }
  };

  const executeWipeAction = async () => {
    if (!wipeTargetIds.length) return;
    setIsWipeOpen(false); 
    setProcessingAction(true);
    const toastId = toast.loading("Purging records permanently...");
    try {
      const res = await apiPost("/api/leads/archive/bulk-delete", { leadIds: wipeTargetIds });
      if (res?.success || res?.status === true) {
        toast.success("Vault logs dropped successfully", { id: toastId });
        setSelectedLeads([]);
        setWipeTargetIds([]);
        loadData();
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Operation restriction active", { id: toastId });
    } finally {
      setProcessingAction(false);
    }
  };

  const fmtDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="space-y-4 pb-12 text-sm text-slate-900 dark:text-slate-100 font-normal antialiased px-6 pt-5 pb-1">
      <Toaster position="top-right" />

      {/* DESIGN SYSTEM RE-ENGINEERED HEADER ROW CONTAINER */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4 select-none w-full shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
            <Archive size={14} className="text-white" />
          </div>
          <div>
            <nav className="flex items-center gap-1 text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">
              <span>CRM Vault</span>
              <ChevronRight size={10} strokeWidth={3} className="text-slate-300" />
              <span className="text-slate-600 dark:text-slate-400">Cold Storage</span>
            </nav>
            <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide leading-none">
              Cold Storage Archive
            </h1>
            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1.5 leading-none flex items-center gap-1.5">
              <span>Aged Node Registries (&gt; 365 Days)</span>
              <span className="inline-block w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
              <span>{totalCount} Sequestered Files</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button type="button" onClick={() => setShowFilters(!showFilters)} className={`p-2 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${showFilters ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs" : "bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-700 hover:bg-slate-50"}`}>
            <Filter size={12} strokeWidth={3} />
          </button>
          <button type="button" onClick={() => loadData(true)} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 rounded-xl transition-all cursor-pointer shadow-none">
            <RefreshCw size={13} className={loading ? "animate-spin text-blue-500" : ""} />
          </button>
        </div>
      </header>

      {/* FILTERS DRAWERS */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-3xs space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" placeholder="Search parameters..." value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-cyan-500 text-slate-700 dark:text-white" />
            </div>
            
            <select value={status} onChange={(e) => {setStatus(e.target.value); setCurrentPage(1);}} className={FILTER_SELECT}>
              <option value="">All history statuses</option>
              {Object.keys(STATUS_COLORS).map(st => <option key={st} value={st}>{st}</option>)}
            </select>

            <select value={sourceId} onChange={(e) => {setSourceId(e.target.value); setCurrentPage(1);}} className={FILTER_SELECT}>
              <option value="">All source channels</option>
              {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <select value={counselorId} onChange={(e) => {setCounselorId(e.target.value); setCurrentPage(1);}} className={FILTER_SELECT}>
              <option value="">All assignees</option>
              {counselors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={(e) => {setStartDate(e.target.value); setCurrentPage(1);}} className="flex-1 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-white outline-none cursor-pointer" />
              <input type="date" value={endDate} onChange={(e) => {setEndDate(e.target.value); setCurrentPage(1);}} className="flex-1 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-white outline-none cursor-pointer" />
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <button onClick={clearFilters} className="text-xs font-black uppercase tracking-wider text-slate-400 hover:text-cyan-600 flex items-center gap-1 transition-colors cursor-pointer">
              <Eraser size={13}/> <span>Reset filters</span>
            </button>
          </div>
        </div>
      )}

      {/* Bulk action strip toolbar wrapper panel context */}
      {selectedLeads.length > 0 && (
        <div className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-4 transition-all duration-150 animate-in slide-in-from-top-2 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 pl-1">{selectedLeads.length} node items selected</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={executeBulkRestore} className="px-3 py-1.5 bg-slate-900 border border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"><RotateCcw size={12} strokeWidth={3}/> Bulk Restore</button>
            {isAdmin && (
              <button type="button" onClick={() => handleOpenWipeModal(selectedLeads)} className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5"><Trash2 size={12}/> Bulk Wipe</button>
            )}
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1" />
            <button type="button" onClick={() => setSelectedLeads([])} className="p-1 text-slate-400 hover:text-slate-600"><X size={14} strokeWidth={2.5} /></button>
          </div>
        </div>
      )}

      {/* MASTER DATA DATAGRID TABLE */}
      <div className="hidden sm:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10 select-none">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3.5 w-12 text-center align-middle">
                  <input type="checkbox" checked={isAllSelected} onChange={handleToggleSelectAll} className="w-3.5 h-3.5 text-cyan-600 rounded border-slate-300 dark:border-slate-700 focus:ring-cyan-500/20 cursor-pointer accent-cyan-600" />
                </th>
                <th className="px-3 py-3.5 w-12 text-center">#</th>
                <th className="px-3 py-3.5">shaji & Entry</th>
                <th className="px-3 py-3.5">Student Profile</th>
                <th className="px-3 py-3.5">Contact Details</th>
                <th className="px-3 py-3.5">Course Trajectory</th>
                <th className="px-3 py-3.5">Attribution Channel</th>
                <th className="px-3 py-3.5">Pipeline Node</th>
                <th className="px-3 py-3.5">Staff Assignee</th>
                <th className="px-3 py-3.5">Vault State Log</th>
                <th className="px-3 py-3.5">Counsel Notes</th>
                <th className="px-3 py-3.5 text-right pr-6">Vault Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-xs text-slate-600 dark:text-slate-300 font-bold uppercase">
              {loading ? (
                <tr><td colSpan={12} className="py-20 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">📡 Decompressing vault archive lines...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={12} className="py-20 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">📭 Vault directory empty</td></tr>
              ) : (
                leads.map((lead, idx) => {
                  const isChecked = selectedLeads.includes(lead.id);
                  const isRestoreConfirming = restoreConfirmId === lead.id;

                  return (
                    <tr key={lead.id} className={`transition-colors hover:bg-blue-50/20 dark:hover:bg-slate-800/30 ${isChecked ? "bg-blue-50/40 dark:bg-slate-800/40" : ""}`}>
                      <td className="px-4 py-3 text-center align-middle">
                        <input type="checkbox" checked={isChecked} onChange={() => setSelectedLeads(prev => prev.includes(lead.id) ? prev.filter(id => id !== lead.id) : [...prev, lead.id])} className="w-3.5 h-3.5 text-cyan-600 rounded border-slate-300 dark:border-slate-700 focus:ring-cyan-500/20 cursor-pointer accent-cyan-600" />
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-xs text-slate-400 tabular-nums font-normal">{ (currentPage - 1) * rowsPerPage + idx + 1 }</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-[10px] font-black text-cyan-700 bg-cyan-50 dark:bg-cyan-950 dark:text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-100 dark:border-cyan-900/40">#L26-{String(lead.id).padStart(4, "0")}</span>
                        <p className="text-[10px] text-slate-400 font-normal mt-1 lowercase">{fmtDate(lead.created_at)}</p>
                      </td>
                      <td className="px-3 py-3 max-w-[160px] truncate">
                        <p className="font-black text-slate-900 dark:text-white leading-none">{lead.full_name}</p>
                        {lead.parent_name && <p className="text-[10px] text-slate-400 font-normal mt-1 truncate lowercase">p: {lead.parent_name}</p>}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums font-normal leading-normal lowercase">
                        <span className="block font-bold text-slate-700 dark:text-slate-300">{lead.phone ? `+91 ${lead.phone}` : "—"}</span>
                        <span className="block text-[11px] text-slate-400 truncate max-w-[120px]">{lead.city || "—"}</span>
                      </td>
                      <td className="px-3 py-3 text-slate-500 dark:text-slate-400 font-black max-w-[130px] truncate">{lead.interested_course || "General Trajectory"}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 border border-slate-200/40">
                          {lead.source_name || "Direct Link"}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-black border ${STATUS_COLORS[lead.lead_status] || "bg-slate-110 text-slate-500"}`}>
                          {lead.lead_status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-500 dark:text-slate-400 font-black whitespace-nowrap">{lead.counselor_name || lead.assigned_user_name || "Unassigned"}</td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-400 font-normal whitespace-nowrap">{lead.updated_at ? fmtDate(lead.updated_at) : "—"}</td>
                      <td className="px-3 py-3 text-xs text-slate-400 italic font-normal max-w-[150px] truncate normal-case">{lead.counselor_remarks || "—"}</td>
                      
                      {/* ✅ INLINE SEGMENTED SLIDE CONFIRMATION SYSTEM */}
                      <td className="px-3 py-2 text-right pr-6 whitespace-nowrap w-[140px] overflow-hidden">
                        <div className="flex justify-end items-center h-9 w-full overflow-hidden relative">
                          
                          {!isRestoreConfirming ? (
                            <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-150">
                              <button type="button" onClick={() => setViewingLead(lead)} className="p-1.5 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-800 shadow-none bg-white dark:bg-slate-900 cursor-pointer" title="Preview profile data"><Eye size={13} /></button>
                              <button type="button" onClick={(e) => { e.stopPropagation(); setRestoreConfirmId(lead.id); }} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-800 shadow-none bg-white dark:bg-slate-900 cursor-pointer" title="Restore node"><RotateCcw size={13} /></button>
                              {isAdmin && (
                                <button type="button" onClick={() => handleOpenWipeModal([lead.id])} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer" title="Wipe records permanently"><Trash2 size={13} /></button>
                              )}
                            </div>
                          ) : (
                            <div 
                              onClick={(e) => e.stopPropagation()} 
                              className="flex items-center gap-1 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900/40 px-2 py-1 rounded-xl animate-in slide-in-from-right-3 duration-200"
                            >
                              <span className="text-[9px] font-black text-cyan-700 dark:text-cyan-400 uppercase tracking-wider mr-1 select-none">Restore?</span>
                              <button 
                                type="button" 
                                onClick={() => setRestoreConfirmId(null)}
                                className="px-2 py-0.5 text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                              >
                                No
                              </button>
                              <button 
                                type="button" 
                                onClick={() => executeInlineRestore(lead.id)}
                                className="px-2 py-0.5 bg-cyan-600 text-white text-[8px] font-black uppercase rounded-md tracking-wider flex items-center gap-0.5 hover:bg-cyan-700 transition-colors shadow-xs"
                              >
                                <Check size={10} strokeWidth={3} />
                                <span>Yes</span>
                              </button>
                            </div>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <PaginationFooter currentPage={currentPage} totalPages={totalPages} totalCount={totalCount} rowsPerPage={rowsPerPage} setRowsPerPage={setRowsPerPage} setCurrentPage={setCurrentPage} />
      </div>

      {/* READ-ONLY DETAIL DRAWER VIEWPORT CONTAINER */}
      {viewingLead && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800/80 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/60 shrink-0">
              <div>
                <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <div className="w-1.5 h-3.5 bg-cyan-600 rounded-full" /> Archived Student Core Profile
                </h2>
                <p className="text-[10px] text-cyan-600 font-mono mt-0.5 font-bold uppercase tracking-wider">Record Node Hash: #L26-{viewingLead.id}</p>
              </div>
              <button type="button" onClick={() => setViewingLead(null)} className="p-1.5 text-slate-400 hover:text-rose-500 rounded-xl transition-all cursor-pointer"><X size={16} strokeWidth={2.5} /></button>
            </div>
            
            <div className="flex flex-col md:flex-row overflow-hidden flex-1 text-xs">
              <div className="flex-1 p-6 overflow-y-auto space-y-4 border-r border-slate-100 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Field label="Full Name"><input readOnly value={viewingLead.full_name || ""} className={INPUT_VIEW} /></Field>
                  <Field label="Age"><input readOnly value={viewingLead.age || ""} className={INPUT_VIEW} /></Field>
                  <Field label="Gender"><input readOnly value={viewingLead.gender || "—"} className={INPUT_VIEW} /></Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Phone Contact"><input readOnly value={viewingLead.phone || ""} className={INPUT_VIEW} /></Field>
                  <Field label="Email Address"><input readOnly value={viewingLead.email || ""} className={INPUT_VIEW} /></Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl grid grid-cols-2 gap-3">
                    <Field label="Qualification"><input readOnly value={viewingLead.qualification || "—"} className={INPUT_VIEW} /></Field>
                    <Field label="Passing Year"><input readOnly value={viewingLead.year_of_passing || "—"} className={INPUT_VIEW} /></Field>
                  </div>
                  <div className="p-3 bg-cyan-50/10 dark:bg-cyan-950/10 border border-cyan-100/60 dark:border-cyan-900/30 rounded-xl grid grid-cols-2 gap-3">
                    <Field label="Parent Name"><input readOnly value={viewingLead.parent_name || "—"} className={INPUT_VIEW} /></Field>
                    <Field label="Parent Contact"><input readOnly value={viewingLead.parent_contact || "—"} className={INPUT_VIEW} /></Field>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="City Location"><input readOnly value={viewingLead.city || ""} className={INPUT_VIEW} /></Field>
                  <Field label="Interested Course"><input readOnly value={viewingLead.interested_course || ""} className={INPUT_VIEW} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Inbound Source"><input readOnly value={viewingLead.source_name || "Direct Link"} className={INPUT_VIEW} /></Field>
                  <Field label="Urgency Metric"><input readOnly value={viewingLead.urgency || "Normal"} className={INPUT_VIEW} /></Field>
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Counselor Remarks Historical Feed</label>
                  <textarea readOnly rows={3} value={viewingLead.counselor_remarks || "No entry history"} className={`${INPUT_VIEW} resize-none h-auto mt-1 normal-case font-normal`} />
                </div>
              </div>
              <div className="hidden md:block w-80 bg-slate-50/20 dark:bg-slate-900/40 overflow-y-auto shrink-0">
                <ActivityLogsMini leadId={viewingLead.id} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ SEPARATED OVERLAYS INTERACTION REGISTRY TREE BLOCK (VaultRestoreModal removed completely) */}
      <VaultWipeModal
        isOpen={isWipeOpen}
        title="Wipe Records Permanently"
        message={`Warning: You are about to permanently drop ${wipeTargetIds.length} lead registry slot logs. This drop cannot be rolled back.`}
        isProcessing={processingAction}
        onClose={() => { setIsWipeOpen(false); setWipeTargetIds([]); }}
        onConfirm={executeWipeAction}
      />
    </div>
  );
}