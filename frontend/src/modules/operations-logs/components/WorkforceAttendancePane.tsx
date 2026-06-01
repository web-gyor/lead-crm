import React, { useState, useEffect, useCallback } from "react";
import { apiGet } from "../../../utils/api";
import { toast } from "react-hot-toast";
import { ArrowRight } from "lucide-react";

interface Props { 
  search: string; 
  date: string; 
  staffId: string; 
  refreshTrigger: number; 
}

export const WorkforceAttendancePane: React.FC<Props> = ({ search, date, staffId, refreshTrigger }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendanceLogs = useCallback(async () => {
    try {
      setLoading(true);
      
      let url = `/api/attendance/all?date=${date}&limit=100`;
      if (staffId && staffId !== "all") {
        url += `&staff_id=${staffId}`;
      }

      const res = await apiGet(url);
      if (res?.success) {
        setLogs(res.data || []);
      }
    } catch (err) {
      toast.error("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [date, staffId]);

  useEffect(() => { 
    fetchAttendanceLogs(); 
  }, [fetchAttendanceLogs, refreshTrigger]);

  const formatTime = (dateStr: string) => {
    if (!dateStr || dateStr.includes("0000-00-00")) return "—";
    const dateObj = new Date(dateStr.replace(' ', 'T'));
    return isNaN(dateObj.getTime()) ? "—" : dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null || seconds < 0) return "—";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Staff Member</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">In/Out</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Dur. (Hrs)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {loading ? (
              <tr><td colSpan={3} className="text-center py-10 text-[10px] font-black uppercase text-gray-400">Syncing workforce data...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-10 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest">No logs found for this criteria</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-blue-50/20 transition-colors">
                 <td className="px-6 py-4">
  {/* 🚀 PERFECT UNIFORMITY: Forces the first letter of names to be capital (Title Case) */}
  <p className="text-xs font-bold text-gray-900 dark:text-white capitalize">
    {log.user_name?.toLowerCase()}
  </p>
  
  {/* 🚀 PERFECT UNIFORMITY: Forces all roles to be entirely uppercase capital letters */}
  <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mt-0.5">
    {log.user_role}
  </p>
</td>
                  
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[11px] font-black text-blue-600 tabular-nums">{formatTime(log.check_in)}</span>
                      <ArrowRight size={10} className="text-gray-300" />
                      <span className={`text-[11px] font-black tabular-nums ${log.check_out ? 'text-gray-600' : 'text-amber-500'}`}>
                        {log.check_out ? formatTime(log.check_out) : "ACTIVE"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-xs font-black text-gray-900 dark:text-white tabular-nums">
                      {log.duration_seconds != null ? formatDuration(log.duration_seconds) : "LIVE"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};