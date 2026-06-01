import React, { useState, useEffect, useCallback, useMemo } from "react";
import { apiGet } from "../../../utils/api";
import { ArrowRightLeft, MessageSquare, User, Activity, Lock, ChevronLeft, ChevronRight, UserPlus } from "lucide-react";

interface ActivityTimelinePaneProps { search: string; date: string; refreshTrigger: number; staffId?: string; }

export const ActivityTimelinePane: React.FC<ActivityTimelinePaneProps> = ({ search, date, refreshTrigger }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const fetchTimeline = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiGet("/api/activity/global");
      setLogs(res?.success ? (res.data || []) : (Array.isArray(res) ? res : []));
    } catch (err) {
      console.error("Timeline fetch error:", err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline, refreshTrigger]);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      const matchSearch = !search || 
        l.user_name?.toLowerCase().includes(search.toLowerCase()) || 
        l.description?.toLowerCase().includes(search.toLowerCase()) ||
        l.student_name?.toLowerCase().includes(search.toLowerCase());
      
      // 🚀 FIXED: Robust date normalization to avoid timezone baseline drops
      let matchDate = true;
      if (date && l.created_at) {
        const logDateStr = new Date(l.created_at).toISOString().split('T')[0];
        matchDate = logDateStr === date;
      }
      
      return matchSearch && matchDate;
    });
  }, [logs, search, date]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const getLogStyle = (type?: string) => {
    switch (type?.toUpperCase()) {
      case "STATUS_UPDATE": 
        return { label: "Status Update", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400", icon: <ArrowRightLeft size={12} /> };
      case "NOTE_ADDED": 
        return { label: "Note Added", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", icon: <MessageSquare size={12} /> };
      case "ASSIGNED": 
        return { label: "Assigned", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400", icon: <User size={12} /> };
      case "LEAD_INGESTION": 
        return { label: "New Lead", color: "bg-blue-500 text-white dark:bg-blue-600", icon: <UserPlus size={12} /> };
      default: 
        return { label: "Activity", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400", icon: <Activity size={12} /> };
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400 uppercase font-bold tracking-wider animate-pulse">Decompressing Activity Streams...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/5 border border-amber-500/10 rounded-xl text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wide">
        <Lock size={12} className="stroke-[2.5]" />
        <span>Immutable Operational Log Space · Modifications Invariant</span>
      </div>

      <div className="border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-3xs divide-y divide-slate-100 dark:divide-slate-800/60">
        {paginated.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-400 uppercase font-bold tracking-wider">No matching activities caught in snapshot perimeter</div>
        ) : (
          paginated.map((log) => {
            const style = getLogStyle(log.action_type);
            return (
              <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors group">
                <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 group-hover:border-blue-500/30 transition-colors shrink-0">
                  {style.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    
                    {/* 🚀 FIXED: Dynamic Capitalized Casing applied uniformly to all operators */}
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
                      {(log.user_name || "Identity Root").toLowerCase()}
                    </span>
                    
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${style.color}`}>{style.label}</span>
                    {log.student_name && (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 max-w-[180px] truncate capitalize">
                        Lead: {log.student_name.toLowerCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">{log.description}</p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs font-semibold px-1">
          <p className="text-slate-400 text-[10px] uppercase">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-1">
            <button type="button" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 disabled:opacity-30 cursor-pointer"><ChevronLeft size={14} /></button>
            <button type="button" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 disabled:opacity-30 cursor-pointer"><ChevronRight size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
};