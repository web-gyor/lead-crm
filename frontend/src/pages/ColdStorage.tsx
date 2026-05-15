import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Search, Trash2, Calendar, Phone, X, Snowflake, RefreshCw, Eye, 
  RotateCcw, CheckSquare, Square, Filter, Eraser, User
} from "lucide-react";
import { Toaster } from 'react-hot-toast';
import { apiGet, apiPost, apiDelete } from "../utils/api";
import PaginationFooter from "../components/leads/PaginationFooter";
import ActivityLogsMini from "../components/ActivityLogsMini";

const STATUS_COLORS: Record<string, string> = {
  "New": "bg-blue-100 text-blue-800 border-blue-200",
  "Contacted": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Interested": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Follow-up": "bg-orange-100 text-orange-800 border-orange-200",
  "Converted": "bg-green-100 text-green-800 border-green-200",
  "Lost": "bg-red-100 text-red-800 border-red-200",
  "Not Interested": "bg-gray-100 text-gray-700 border-gray-200",
};

const INPUT_VIEW = "w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800 dark:text-white outline-none cursor-default";
const FILTER_SELECT = "px-2 py-1.5 bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg text-xs outline-none hover:border-cyan-400 w-full";

export default function ColdStorage() {

    
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = currentUser?.role?.toLowerCase() === "admin";

  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [counselorId, setCounselorId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
const [status, setStatus] = useState(""); // Add this
  // Dropdown Options
  const [sources, setSources] = useState<any[]>([]);
  const [counselors, setCounselors] = useState<any[]>([]);

  // Modals / Actions
  const [viewingLead, setViewingLead] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);

 const loadData = useCallback(async (isRefresh = false) => {
  if (isRefresh) setShowFilters(false);
  setLoading(true);
  try {
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(rowsPerPage),
      search: searchTerm.trim(),
      source_id: sourceId,           // Must match backend req.query.source_id
      assigned_user_id: counselorId, // Must match backend req.query.assigned_user_id
      lead_status: status,           // Ensure backend expects 'lead_status'
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
    toast.error("Vault filter failed");
  } finally {
    setLoading(false);
  }
  // CRITICAL: All filter states must be in this dependency array
}, [currentPage, rowsPerPage, searchTerm, sourceId, counselorId, status, startDate, endDate]);

  useEffect(() => { loadData(); }, [loadData]);

useEffect(() => {
  // Correct endpoint for sources is usually /api/leads/sources or /api/lead-sources
  apiGet("/api/lead-sources").then(res => {
    // Check if response is { success: true, data: [...] } or just [...]
    const list = res?.data || (Array.isArray(res) ? res : []);
    setSources(list);
  });

  apiGet("/api/users").then(res => {
    const list = res?.data || (Array.isArray(res) ? res : []);
    // Filter only counselors for the dropdown
    setCounselors(list.filter((u: any) => u.role?.toLowerCase() === "counselor"));
  });
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
  toast.success("Filters cleared", { icon: <Eraser size={14}/> });
};
const handleRestore = (ids: number[]) => {
    toast((t) => (
      <div className="flex flex-col gap-2 p-1">
        <p className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <RotateCcw size={14} className="text-cyan-600" /> Restore {ids.length} lead(s)?
        </p>
        <div className="flex gap-2 mt-1">
          <button onClick={async () => {
              toast.dismiss(t.id);
              const ld = toast.loading("Restoring...");
             try {
  await apiPost("...", { ids });
  toast.success("Operation Successful", { id: ld });
  setSelectedLeads([]); // CRITICAL: Clear checkboxes after action
  loadData();
} catch { 
  toast.error("Operation failed", { id: ld }); 
}
            }} className="bg-cyan-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase">Confirm</button>
          <button onClick={() => toast.dismiss(t.id)} className="text-slate-400 px-3 py-1.5 text-[10px] font-bold uppercase">Cancel</button>
        </div>
      </div>
    ), { 
      duration: 6000, 
      position: 'top-center', // FIXED: Now appears center-top for high visibility
      style: { border: '2px solid #0891b2', marginTop: '15vh' } // Shifted down slightly to be visually centered
    });
  };
const handleSingleDelete = (id: number) => {
    toast((t) => (
      <div className="flex flex-col gap-2 p-1">
        <p className="text-xs font-bold text-red-600 flex items-center gap-2">
            <Trash2 size={14} /> Wipe Lead #L26-{id} forever?
        </p>
        <p className="text-[10px] text-slate-500">This action is permanent and cannot be undone.</p>
        <div className="flex gap-2 mt-1">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              const ld = toast.loading("Purging...");
              try {
                await apiPost("/api/leads/archive/bulk-delete", { ids: [id] });
                toast.success("Lead purged from vault", { id: ld });
                loadData();
              } catch { toast.error("Delete failed", { id: ld }); }
            }}
            className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm"
          >
            Confirm Wipe
          </button>
          <button onClick={() => toast.dismiss(t.id)} className="text-slate-400 px-3 py-1.5 text-[10px] font-bold uppercase">Cancel</button>
        </div>
      </div>
    ), { 
      duration: 6000, 
      position: 'top-center', 
      style: { border: '2px solid #ef4444', marginTop: '15vh', minWidth: '280px' } 
    });
  };

  // 2. Bulk Delete Toast (Kept separate as requested)
  const handleDeleteTrigger = (ids: number[]) => {
  if (!isAdmin) {
    toast.error("Unauthorized: Admin access required");
    return;
  }

  toast((t) => (
    <div className="flex flex-col gap-2 p-1">
      <p className="text-xs font-bold text-red-600 flex items-center gap-2">
        <Trash2 size={14} /> Wipe {ids.length} lead(s) forever?
      </p>
      <div className="flex gap-2 mt-1">
        <button
          onClick={async () => {
            toast.dismiss(t.id);
            const ld = toast.loading("Purging records...");
            try {
              // Ensure the endpoint matches your bulk delete route
              await apiPost("/api/leads/archive/bulk-delete", { ids }); 
              toast.success("Successfully deleted", { id: ld });
              setSelectedLeads([]); // Clear checkboxes
              loadData(); // Reload table
            } catch (err) {
              toast.error("Delete failed", { id: ld });
            }
          }}
          className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm"
        >
          Confirm Wipe
        </button>
        <button onClick={() => toast.dismiss(t.id)} className="text-slate-400 px-3 py-1.5 text-[10px] font-bold uppercase">Cancel</button>
      </div>
    </div>
  ), { 
    duration: 6000, 
    position: 'top-center', 
    style: { border: '2px solid #ef4444', marginTop: '15vh', minWidth: '280px' } 
  });
};
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-0.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <span className="w-8 h-8 bg-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-600/20">
              <Snowflake size={16} className="text-white" />
            </span>
            Cold Storage
          </h1>
          <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest mt-0.5">Data Vault</p>
        </div>

        <div className="flex items-center gap-2">
           <button onClick={() => setShowFilters(!showFilters)} className={`p-2.5 rounded-xl border transition-all ${showFilters ? "bg-cyan-600 border-cyan-600 text-white" : "bg-white border-slate-200 text-slate-500"}`}>
             <Filter size={16} />
           </button>
           <button onClick={() => loadData(true)} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:text-cyan-600 shadow-sm">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

   {/* ── Filter Container ── */}
  {showFilters && (
  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-in slide-in-from-top-2 duration-200">
     <div className="grid grid-cols-1 md:grid-cols-5 gap-3"> {/* Changed to cols-5 */}
       {/* Search */}
       <div className="relative">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
         <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-cyan-500" />
       </div>
       
       {/* Status Filter (New) */}
       <select value={status} onChange={(e) => {setStatus(e.target.value); setCurrentPage(1);}} className={FILTER_SELECT}>
          <option value="">All Statuses</option>
          <option value="New">New</option>
          <option value="Contacted">Contacted</option>
          <option value="Interested">Interested</option>
          <option value="Follow-up">Follow-up</option>
          <option value="Converted">Won</option>
          <option value="Lost">Lost</option>
          <option value="Not Interested">Rejected</option>
       </select>

       {/* Source Filter */}
       <select value={sourceId} onChange={(e) => {setSourceId(e.target.value); setCurrentPage(1);}} className={FILTER_SELECT}>
          <option value="">All Lead Sources</option>
          {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
       </select>

       {/* Counselor Filter */}
       <select value={counselorId} onChange={(e) => {setCounselorId(e.target.value); setCurrentPage(1);}} className={FILTER_SELECT}>
          <option value="">All Counselors</option>
          {counselors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
       </select>

       {/* Date Range */}
       <div className="flex items-center gap-2">
          <input type="date" value={startDate} onChange={(e) => {setStartDate(e.target.value); setCurrentPage(1);}} className="flex-1 bg-slate-50 p-1.5 rounded-lg text-[10px] border border-slate-200 outline-none" />
          <input type="date" value={endDate} onChange={(e) => {setEndDate(e.target.value); setCurrentPage(1);}} className="flex-1 bg-slate-50 p-1.5 rounded-lg text-[10px] border border-slate-200 outline-none" />
       </div>
     </div>
           
           <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">
                    {selectedLeads.length} items selected
                </span>
                <button onClick={clearFilters} className="text-[10px] font-bold text-slate-500 hover:text-cyan-600 flex items-center gap-1 transition-colors">
                    <Eraser size={12}/> Clear Filters
                </button>
              </div>
              <div className="flex gap-2">
                 <button disabled={!selectedLeads.length} onClick={() => handleRestore(selectedLeads)} className="px-4 py-1.5 bg-cyan-50 text-cyan-700 rounded-lg text-[10px] font-black uppercase border border-cyan-100 disabled:opacity-50 hover:bg-cyan-100 transition-colors">Bulk Restore</button>
                 {isAdmin && (
                   <button disabled={!selectedLeads.length} onClick={() => handleDeleteTrigger(selectedLeads)} className="px-4 py-1.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase border border-red-100 disabled:opacity-50 hover:bg-red-100 transition-colors">Bulk Wipe</button>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* ── Table (Shadow of Leads.tsx) ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                <th className="px-4 py-2 w-10">
  <button onClick={() => setSelectedLeads(selectedLeads.length === leads.length && leads.length > 0 ? [] : leads.map(l => l.id))}>
    {selectedLeads.length === leads.length && leads.length > 0 ? <CheckSquare size={16} className="text-cyan-600"/> : <Square size={16} />}
  </button>
</th>
                <th className="px-3 py-3">ID & Entry</th>
                <th className="px-3 py-3">Student & Parent</th>
                <th className="px-3 py-3">Contact Details</th>
                  <th className="px-3 py-3">Course</th>
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Assigned</th>
                <th className="px-3 py-3">Last Update</th>
                <th className="px-3 py-3">Latest Notes</th>
                <th className="px-3 py-3 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.length === 0 ? (
                <tr><td colSpan={7} className="py-20 text-center text-slate-400 font-bold uppercase text-xs">📭 Archive is empty</td></tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className={`hover:bg-cyan-50/20 transition-colors ${selectedLeads.includes(lead.id) ? "bg-cyan-50/40" : ""}`}>
                    <td className="px-4 py-1.5">
  <button onClick={() => toggleSelect(lead.id)}>
    {selectedLeads.includes(lead.id) ? <CheckSquare size={16} className="text-cyan-600"/> : <Square size={16} className="text-slate-300"/>}
  </button>
</td>
                    <td className="px-3 py-1.5">
                      <span className="text-[10px] font-black text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-100">#L26-{lead.id}</span>
                      <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">{new Date(lead.created_at).toLocaleDateString('en-GB')}</p>
                    </td>
                    <td className="px-3 py-1.5">
                      <p className="text-[12px] font-bold text-slate-900 truncate">{lead.full_name}</p>
                      <p className="text-[10px] text-slate-500 italic">P: {lead.parent_name || "—"}</p>
                    </td>
                    <td className="px-3 py-1.5">
                       <p className="text-[11px] font-bold text-slate-700 tracking-tighter">+91 {lead.phone}</p>
                       <p className="text-[9px] text-slate-400 truncate w-32">{lead.city || "—"} </p>
                    </td>
                    <td className="px-3 py-1.5">
                
                       <p className="text-[9px] text-slate-400 truncate w-32">{lead.interested_course || "Gen"}</p>
                    </td>
                    <td className="px-3 py-1.5">
                       <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-slate-100 text-slate-600 border">
                         {lead.source_name || "Direct"}
                       </span>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border ${STATUS_COLORS[lead.lead_status] || "bg-gray-100"}`}>
                            {lead.lead_status}
                        </span>
                    </td>
                    <td className="px-3 py-1.5">
                       <p className="text-[10px] font-bold text-blue-600">{lead.counselor_name || lead.assigned_user_name || "Unassigned"}</p>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                       <p className="text-[10px] font-black text-slate-700 dark:text-slate-300">
                          {lead.updated_at ? new Date(lead.updated_at).toLocaleDateString('en-GB', {day: '2-digit', month: 'short'}) : "—"}
                       </p>
                    </td>
                    <td className="px-3 py-1.5 max-w-[150px]">
                       <p className="text-[11px] text-slate-400 italic truncate">{lead.counselor_remarks || "—"}</p>
                    </td>
                    <td className="px-3 py-1.5 text-right pr-6 whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => setViewingLead(lead)} className="p-1.5 text-cyan-600 hover:bg-cyan-50 rounded-lg shadow-sm bg-white border border-slate-100"><Eye size={12} /></button>
                        <button onClick={() => handleRestore([lead.id])} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg shadow-sm bg-white border border-slate-100"><RotateCcw size={12} /></button>
                       {isAdmin && (
                        <button 
                          onClick={() => handleSingleDelete(lead.id)} 
                          className="p-1 text-slate-300 hover:text-red-500 rounded"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Footer exactly as Leads.tsx */}
        <PaginationFooter currentPage={currentPage} totalPages={totalPages} totalCount={totalCount} rowsPerPage={rowsPerPage} setRowsPerPage={setRowsPerPage} setCurrentPage={setCurrentPage} />
      </div>

      {/* ── View Form Modal (Read-Only Clone of Leads Edit Form) ── */}
      {viewingLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-cyan-50/30 shrink-0">
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-cyan-600 rounded-full" /> Archived Student Profile
                </h2>
                <p className="text-[10px] text-cyan-600 font-black mt-0.5">Lead ID: L26-{viewingLead.id}</p>
              </div>
              <button onClick={() => setViewingLead(null)} className="p-1.5 text-slate-400 hover:text-red-500 transition-all"><X size={20} /></button>
            </div>
            
            <div className="flex flex-col md:flex-row overflow-hidden flex-1">
              <div className="flex-1 p-6 overflow-y-auto space-y-4 border-r border-slate-100">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label="Full Name"><input readOnly value={viewingLead.full_name || ""} className={INPUT_VIEW} /></Field>
                  <Field label="Age"><input readOnly value={viewingLead.age || ""} className={INPUT_VIEW} /></Field>
                  <Field label="Gender"><input readOnly value={viewingLead.gender || "Select"} className={INPUT_VIEW} /></Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Phone"><input readOnly value={viewingLead.phone || ""} className={INPUT_VIEW} /></Field>
                  <Field label="Email"><input readOnly value={viewingLead.email || ""} className={INPUT_VIEW} /></Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-2 bg-slate-50 rounded-lg border grid grid-cols-2 gap-2">
                    <Field label="Qualification"><input readOnly value={viewingLead.qualification || "N/A"} className={INPUT_VIEW} /></Field>
                    <Field label="Passing Year"><input readOnly value={viewingLead.year_of_passing || "N/A"} className={INPUT_VIEW} /></Field>
                  </div>
                  <div className="p-2 bg-cyan-50/20 rounded-lg border border-cyan-100 grid grid-cols-2 gap-2">
                    <Field label="Parent Name"><input readOnly value={viewingLead.parent_name || "N/A"} className={INPUT_VIEW} /></Field>
                    <Field label="Parent Contact"><input readOnly value={viewingLead.parent_contact || "N/A"} className={INPUT_VIEW} /></Field>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="City"><input readOnly value={viewingLead.city || ""} className={INPUT_VIEW} /></Field>
                  <Field label="Course"><input readOnly value={viewingLead.interested_course || ""} className={INPUT_VIEW} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Source"><input readOnly value={viewingLead.source_name || "Direct"} className={INPUT_VIEW} /></Field>
                  <Field label="Urgency"><input readOnly value={viewingLead.urgency || "Normal"} className={INPUT_VIEW} /></Field>
                </div>
                <div className="pt-3 border-t border-slate-100">
                    <label className="text-[10px] font-black uppercase text-slate-400">Counselor Remarks</label>
                    <textarea readOnly rows={4} value={viewingLead.counselor_remarks || "No history"} className={`${INPUT_VIEW} resize-none h-auto mt-1`} />
                </div>
              </div>
              <div className="hidden md:block w-80 bg-slate-50/30 overflow-y-auto shrink-0">
                  <ActivityLogsMini leadId={viewingLead.id} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}