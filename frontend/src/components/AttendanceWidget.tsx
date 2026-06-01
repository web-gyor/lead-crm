import { useState, useEffect, useRef } from "react";
import { 
  Clock, MapPin, Home, LogOut, 
  ChevronDown, Loader2, Monitor
} from "lucide-react";
import { apiGet, apiPost } from "../utils/api";
import toast from "react-hot-toast";

export default function AttendanceWidget() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchStatus = async () => {
    try {
      const res = await apiGet("/api/attendance/today");
      setStatus(res.data);
    } catch (err) {
      console.error("Attendance Sync Error");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    };

    if (showOptions) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showOptions]);

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleAction = async (mode: 'office' | 'wfh' | 'on_field' = 'office') => {
    setProcessing(true);
    setShowOptions(false);

    try {
      if (!status) {
        await apiPost("/api/attendance/punch-in", { 
          work_mode: mode, 
          location_data: { timestamp: new Date().toISOString() } 
        });
        
        // 🚀 CUSTOM MODERN TOAST: Punch-In Styled Card Component
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-in fade-in slide-in-from-top-4 duration-200' : 'animate-out fade-out zoom-out-95 duration-150'} max-w-md w-full bg-white dark:bg-gray-900 shadow-xl rounded-2xl pointer-events-auto flex border border-gray-100 dark:border-gray-800 p-3 select-none`}>
            <div className="flex items-center gap-3 w-full">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 ${mode === 'office' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                {mode === 'office' ? <MapPin size={16} /> : <Home size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-900 dark:text-white leading-none">Shift Initialized</p>
                <p className="text-[9px] text-gray-500 dark:text-gray-400 font-medium mt-1">
                  Checked in successfully via <span className="font-bold uppercase text-blue-500">{mode}</span> mode.
                </p>
              </div>
            </div>
          </div>
        ), { position: 'top-right', duration: 4000 });

      } else {
        await apiPost("/api/attendance/punch-out", {});
        
        // 🚀 CUSTOM MODERN TOAST: Punch-Out Styled Card Component
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-in fade-in slide-in-from-top-4 duration-200' : 'animate-out fade-out zoom-out-95 duration-150'} max-w-md w-full bg-white dark:bg-gray-900 shadow-xl rounded-2xl pointer-events-auto flex border border-gray-100 dark:border-gray-800 p-3 select-none`}>
            <div className="flex items-center gap-3 w-full">
              <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-white shrink-0">
                <LogOut size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-900 dark:text-white leading-none">Shift Terminated</p>
                <p className="text-[9px] text-gray-500 dark:text-gray-400 font-medium mt-1">
                  Your working session hours have been signed off. Goodbye! 👋
                </p>
              </div>
            </div>
          </div>
        ), { position: 'top-right', duration: 4000 });
      }

      await fetchStatus();
      window.dispatchEvent(new Event("attendanceUpdate"));

    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || "Action failed";
      
      // 🚀 CUSTOM MODERN TOAST: Error Alert Component
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-in fade-in slide-in-from-top-4 duration-200' : 'animate-out fade-out zoom-out-95 duration-150'} max-w-md w-full bg-white dark:bg-gray-900 shadow-xl rounded-2xl pointer-events-auto flex border border-rose-100 dark:border-rose-950/30 p-3 select-none`}>
          <div className="flex items-center gap-3 w-full">
            <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center text-white shrink-0">
              <Clock size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 leading-none">Operation Denied</p>
              <p className="text-[9px] text-gray-500 dark:text-gray-400 font-medium mt-1">{errorMsg}</p>
            </div>
          </div>
        </div>
      ), { position: 'top-right', duration: 4000 });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="h-9 w-9 sm:w-24 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
  );

  // ─── Render: NOT CHECKED IN ───
  if (!status) {
    return (
      <div className="relative" ref={dropdownRef}> 
        <button 
          type="button"
          onClick={() => setShowOptions(!showOptions)}
          disabled={processing}
          className="flex items-center justify-center gap-2 px-2.5 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex-shrink-0 cursor-pointer"
        >
          {processing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Clock size={14} className="animate-pulse" />
          )}
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Punch In</span>
          <ChevronDown size={12} className={`hidden sm:block transition-transform ${showOptions ? 'rotate-180' : ''}`} />
        </button>

        {showOptions && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-2 z-[100] animate-in fade-in slide-in-from-top-2">
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-3 py-2">Select Work Mode</p>
            
            <button
              type="button"
              onClick={() => handleAction('office')}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors group text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                <MapPin size={14} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase">Office</p>
                <p className="text-[8px] font-medium text-gray-400">At WebGyor HQ</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleAction('wfh')}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-colors group text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                <Home size={14} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase">Remote</p>
                <p className="text-[8px] font-medium text-gray-400">Work From Home</p>
              </div>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Render: ACTIVE SHIFT ───
  return (
    <div className="flex items-center gap-1.5 sm:gap-4 bg-gray-50/50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 p-1.5 sm:pl-4 rounded-2xl">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-8 h-8 rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center shadow-sm text-blue-600">
            {status.work_mode === 'office' ? <Monitor size={14} /> : <Home size={14} />}
          </div>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full animate-pulse" />
        </div>
        
        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-[9px] font-black text-gray-900 dark:text-white uppercase tracking-tight">
              {status.work_mode === 'office' ? 'Office' : 'WFH'}
            </span>
            <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            <span className="text-[9px] font-black text-emerald-600 uppercase">Active</span>
          </div>
          <p className="text-[10px] font-bold text-gray-400 tabular-nums mt-0.5">
            Since {new Date(status.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => handleAction()}
        disabled={processing}
        title="End Shift"
        className="group flex items-center justify-center gap-2 px-2.5 sm:px-3 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-400 hover:text-red-500 hover:border-red-100 dark:hover:border-red-900/30 rounded-xl transition-all shadow-sm flex-shrink-0 cursor-pointer"
      >
        <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">End Shift</span>
        <LogOut size={14} className="group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
}