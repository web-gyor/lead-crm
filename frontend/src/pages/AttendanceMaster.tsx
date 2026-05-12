import { useState, useEffect, useCallback } from "react";
import { Clock, Calendar, RefreshCw, ChevronLeft, ChevronRight, Users, ArrowRight } from "lucide-react";
import { apiGet } from "../utils/api";
import toast from "react-hot-toast";

// Helper to get local date string (YYYY-MM-DD) avoiding UTC timezone shifts
const getLocalDateString = (date = new Date()) => {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().split('T')[0];
};

export default function AttendanceMaster() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<any[]>([]);
  
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [selectedStaff, setSelectedStaff] = useState("");
  const [viewRange, setViewRange] = useState("daily"); 
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 1. Fetch Staff List to populate the dropdown
  const fetchStaff = useCallback(async () => {
    try {
      const res = await apiGet("/api/users/staff"); 
      if (res.success) {
        setStaffList(res.data || []);
      }
    } catch (err) {
      console.error("Staff fetch failed", err);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = `/api/attendance/all?page=${currentPage}&limit=10`;
      if (selectedStaff) query += `&staff_id=${selectedStaff}`;

      const anchorDate = new Date(selectedDate);
      
      if (viewRange === 'weekly') {
        const startDate = new Date(anchorDate);
        startDate.setDate(startDate.getDate() - 7);
        query += `&start_date=${getLocalDateString(startDate)}&end_date=${selectedDate}`;
      } else if (viewRange === 'monthly') {
        const firstDay = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
        query += `&start_date=${getLocalDateString(firstDay)}&end_date=${selectedDate}`;
      } else {
        query += `&date=${selectedDate}`;
      }

      const res = await apiGet(query);
      if (res.success) {
        setLogs(res.data || []);
        setTotalPages(res.pages || 1);
      }
    } catch (err) {
      toast.error("Failed to sync attendance logs");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedStaff, viewRange, currentPage]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatTime = (dateStr: string) => {
    if (!dateStr || dateStr.includes("0000-00-00")) return "—";
    
    // Split "YYYY-MM-DD HH:MM:SS" to handle local time manually
    // This prevents the browser from shifting the time by +5:30 or -5:30
    const parts = dateStr.replace('T', ' ').split(/[- :]/);
    if (parts.length < 5) return "—";

    // Create date: Year, Month (0-indexed), Day, Hour, Minute
    const localDate = new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2]),
      parseInt(parts[3]),
      parseInt(parts[4])
    );

    if (isNaN(localDate.getTime())) return "—";

    return localDate.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });
  };
  const formatDuration = (seconds: number | null) => {
    if (seconds === null || seconds < 0) return "—";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const isFiltered = 
    selectedStaff !== "" || 
    viewRange !== "daily" || 
    selectedDate !== getLocalDateString();

  const handleResetFilters = () => {
    setSelectedStaff("");
    setViewRange("daily"); 
    setSelectedDate(getLocalDateString());
    setCurrentPage(1);
  };
  
  return (
    <div className="space-y-4 pb-20 px-2 sm:px-0">
      {/* Header Card */}
      <div className="bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
        
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <button 
            onClick={fetchLogs} 
            className="p-2.5 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-blue-600 rounded-xl transition-all shadow-sm active:scale-95"
            title="Sync Records"
          >
            <RefreshCw size={18} className={loading ? "animate-spin text-blue-600" : ""} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="pr-12">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="text-blue-600" size={24} /> Attendance Master
            </h1>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Staff Daily Muster Roll</p>
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-row items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="relative group flex-1 sm:flex-none">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={12} />
                <input
                  type="date"
                  disabled={viewRange !== 'daily'}
                  value={selectedDate}
                  onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-bold text-gray-600 dark:text-white outline-none focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50"
                />
              </div>

              <div className="relative group flex-1 sm:flex-none">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={12} />
                <select
                  value={selectedStaff}
                  onChange={(e) => { setSelectedStaff(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-lg pl-8 pr-8 py-1.5 text-[11px] font-bold text-gray-600 dark:text-white outline-none focus:ring-1 focus:ring-blue-500/20 appearance-none min-w-[140px] sm:w-auto cursor-pointer"
                >
                  <option value="">All Staff Members</option>
                  {staffList && staffList.length > 0 ? (
                    staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role})
                      </option>
                    ))
                  ) : (
                    <option disabled className="text-red-400">Loading staff list...</option>
                  )}
                </select>
              </div>
            </div>

            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
              {['daily', 'weekly', 'monthly'].map((r) => (
                <button
                  key={r}
                  onClick={() => { setViewRange(r); setCurrentPage(1); }}
                  className={`px-3 sm:px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${viewRange === r ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {r}
                </button>
              ))}

              {isFiltered && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200"
                >
                  Reset View
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 sm:px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest whitespace-nowrap">Date</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Staff Member</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">In/Out</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Dur. (Hrs)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-10 animate-pulse text-[10px] font-black uppercase text-gray-400">Syncing...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-20 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest">No matching logs found</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="px-4 sm:px-6 py-4 text-xs font-bold text-gray-500 tabular-nums">
                      {new Date(log.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[120px] sm:max-w-none">{log.user_name}</p>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{log.user_role}</p>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <span className="text-[10px] sm:text-[11px] font-black text-blue-600 tabular-nums">{formatTime(log.check_in)}</span>
                        <ArrowRight size={10} className="text-gray-300 hidden sm:block" />
                        <span className={`text-[10px] sm:text-[11px] font-black tabular-nums ${log.check_out ? 'text-gray-600' : 'text-amber-500'}`}>
                          {log.check_out ? formatTime(log.check_out) : "ACTIVE"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <span className="text-xs font-black text-gray-900 dark:text-white tabular-nums">
                        {log.duration_seconds !== undefined ? formatDuration(log.duration_seconds) : "LIVE"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center bg-gray-50/30">
            <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Page {currentPage} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm disabled:opacity-30"><ChevronLeft size={16} /></button>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}