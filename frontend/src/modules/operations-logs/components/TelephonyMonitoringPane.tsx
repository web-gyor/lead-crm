import React, { useState, useEffect, useCallback } from "react";
import { User, Clock, MicOff } from "lucide-react";
import { apiGet, apiPut } from "../../../utils/api";
import { toast } from "react-hot-toast";

// Added staffId to the interface
interface Props { 
  search: string; 
  date: string; 
  staffId: string; // New prop
  refreshTrigger: number; 
  isAdmin: boolean; 
}

export const TelephonyMonitoringPane: React.FC<Props> = ({ search, date, staffId, refreshTrigger, isAdmin }) => {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1 });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  const fetchCalls = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      // Build params object
      const params: any = { 
        localDate: date, 
        search: search, 
        page: String(page), 
        limit: "20" 
      };
      
      // Add staffId to params if it's not "all"
      if (staffId && staffId !== "all") {
        params.counselorId = staffId;
      }

      const res = await apiGet(`/api/telephony/logs?${new URLSearchParams(params).toString()}`);
      
      if (res?.success) {
        setCalls(res.data || []);
        setPagination(res.pagination || { total: 0, totalPages: 1, page: 1 });
      }
    } catch (err) {
      toast.error("Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, [search, date, staffId]); // Added staffId to dependencies

  useEffect(() => { 
    fetchCalls(); 
  }, [fetchCalls, refreshTrigger]);

  const handleSaveFeedback = async (logId: number) => {
    try {
      await apiPut("/api/telephony/feedback", { logId, feedback: feedbackText });
      toast.success("Feedback recorded");
      setEditingId(null);
      fetchCalls(pagination.page);
    } catch (err) {
      toast.error("Failed to save feedback");
    }
  };

  if (loading && calls.length === 0) return <div className="p-12 text-center text-xs text-slate-400 font-bold uppercase animate-pulse">Synchronizing trunk audio buffers...</div>;
console.log("Full Call Object Received (First item):", calls[0]);
  return (
    <div className="space-y-3">
      {calls.length === 0 ? (
        <div className="p-16 text-center border border-dashed rounded-2xl text-slate-400 font-bold uppercase text-xs">No voice logs found in this perimeter</div>
      
      ) : (
        
        calls.map((call) => (
          <div key={call.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-blue-500/30 transition-all">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0"><User size={18} /></div>
                <div>
                  <p className="text-xs font-black uppercase truncate">{call.lead_name || "Unknown Lead"}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Agent: {call.user_name || "System"}</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-black ${call.direction === 'inbound' ? 'text-blue-600 bg-blue-50' : 'text-purple-600 bg-purple-50'}`}>{call.direction}</span>
                </div>
              </div>

<div className="flex-1 max-w-sm bg-slate-50 dark:bg-slate-950/50 rounded-xl p-2 border border-slate-100 dark:border-slate-800">
  {call.recording_url ? (
    <audio 
      controls 
      src={
        call.recording_url.startsWith('http') 
          ? call.recording_url 
          : `${window.location.protocol}//${window.location.hostname}:5000${call.recording_url}`
      } 
      className="w-full h-8 outline-none" 
    />
  ) : (
    <div className="h-8 flex items-center justify-center text-[10px] font-bold text-slate-400 dark:text-slate-600">
      <MicOff size={12} className="mr-2 shrink-0"/> No Recording
    </div>
  )}
</div>
              <div className="text-right shrink-0">
                <p className="text-xs font-black flex items-center justify-end gap-1"><Clock size={12} className="text-blue-500" />{call.duration}s</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(call.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center mb-2"><p className="text-[9px] font-black uppercase text-slate-400">QA Feedback</p></div>
              {editingId === call.id ? (
                <div className="flex gap-2"><input value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} className="flex-1 p-2 text-xs rounded-lg border border-slate-200" /><button onClick={() => handleSaveFeedback(call.id)} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold">Save</button></div>
              ) : (
                <p className="text-xs italic text-slate-600">{call.admin_feedback || "No feedback yet."} {isAdmin && <button onClick={() => {setEditingId(call.id); setFeedbackText(call.admin_feedback || "");}} className="text-blue-600 font-bold ml-2 text-[10px]">EDIT</button>}</p>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};