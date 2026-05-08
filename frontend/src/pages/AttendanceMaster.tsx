import { useState, useEffect, useCallback } from "react";
import { Clock, Calendar, MapPin, Home, User, ArrowRight, RefreshCw, Search } from "lucide-react";
import { apiGet } from "../utils/api";
import toast from "react-hot-toast";

export default function AttendanceMaster() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

// 1. Define the function FIRST (so it is available for the effects)
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      // Ensure your backend has router.get('/all') in attendanceRoutes.js
      const res = await apiGet(`/api/attendance/all?date=${selectedDate}`);
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Attendance Fetch Error:", err);
      toast.error("Failed to sync attendance logs");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // 2. Initial load and refresh on date change
  useEffect(() => { 
    fetchLogs(); 
  }, [fetchLogs]);

  // 3. Global listener for the Topbar "Punch In" event
  useEffect(() => {
    const handleRefresh = () => {
      fetchLogs(); 
    };

    window.addEventListener("attendanceUpdate", handleRefresh);
    return () => window.removeEventListener("attendanceUpdate", handleRefresh);
  }, [fetchLogs]);

  // 4. Time Formatting Helper
  const formatTime = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

const formatDuration = (seconds: number | null) => {
  if (seconds === null || seconds < 0) return "—";
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  // Pad with leading zeros (e.g., 08:05)
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};


  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="text-blue-600" /> Attendance Tracker
          </h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Staff Daily Muster Roll</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button onClick={fetchLogs} className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-400 hover:text-blue-600 transition-all">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Staff Member</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Work Mode</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Punch In</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Punch Out</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Dur. (Hrs)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8 h-4 bg-gray-50/50 dark:bg-gray-800/20"></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest">No logs found for this date</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-6 py-4">
                     <div>
  {/* Display the Staff Name */}
  <p className="text-xs font-bold text-gray-900 dark:text-white">
    {log.user_name}
  </p>
  
  {/* Display the Staff Role (Manager, Counselor, etc.) */}
  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
    {log.user_role}
  </p>
</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase ${log.work_mode === 'office' ? 'text-blue-600' : 'text-emerald-600'}`}>
                        {log.work_mode === 'office' ? <MapPin size={10} /> : <Home size={10} />}
                        {log.work_mode}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-[11px] font-black tabular-nums">
                        {formatTime(log.check_in)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-lg text-[11px] font-black tabular-nums ${log.check_out ? 'bg-gray-100 dark:bg-gray-800 text-gray-600' : 'bg-amber-50 text-amber-600'}`}>
                        {log.check_out ? formatTime(log.check_out) : "STILL ACTIVE"}
                      </span>
                    </td>
  <td className="px-6 py-4 text-right">
  <span className="text-[12px] font-black text-gray-900 dark:text-white tabular-nums">
    {/* Use the new helper function here */}
    {log.duration_seconds !== undefined ? formatDuration(log.duration_seconds) : "ACTIVE"}
  </span>
</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}