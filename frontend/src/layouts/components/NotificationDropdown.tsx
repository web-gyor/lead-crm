// 🎯 TARGET FILE: Your NotificationDropdown Component File

import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, CheckCircle, UserPlus, AlertCircle, Calendar } from 'lucide-react';

interface NotifData {
  overdue?: number;
  today?: number;
  newLeads?: number;
  new_leads?: number; 
}

interface NotificationDropdownProps {
  notifData: NotifData;
  totalNotif: number;
  navigate: (path: string) => void;
  clearNotifs: () => void;
}

export const NotificationDropdown = React.memo(({
  notifData,
  totalNotif,
  navigate,
  clearNotifs
}: NotificationDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 🚀 Local tracking state cache for real-time adjustments without re-fetching network pipelines
  const [liveUnassignedCount, setLiveUnassignedCount] = useState<number | null>(null);

  // Normalize backend metrics, instantly overlaying our real-time channel sync value
  const unassignedCount = liveUnassignedCount !== null ? liveUnassignedCount : (notifData?.newLeads ?? notifData?.new_leads ?? 0);
  const overdueCount = notifData?.overdue ?? 0;
  const todayCount = notifData?.today ?? 0;
  
  const effectiveTotal = liveUnassignedCount !== null
    ? (liveUnassignedCount + overdueCount + todayCount)
    : (totalNotif > 0 ? totalNotif : (unassignedCount + overdueCount + todayCount));

  useEffect(() => {
    if (!isOpen) return;
    const clickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, [isOpen]);

  // Sync back cleanly when an independent hard route page layout shift triggers fresh core props
  useEffect(() => {
    setLiveUnassignedCount(null);
  }, [notifData]);

  useEffect(() => {
    const handleLiveBadgeSync = (e: any) => {
      if (e?.detail?.newLeads !== undefined) {
        // 🚀 FIXED: Directly intercepts the isolated count parameter safely
        setLiveUnassignedCount(Number(e.detail.newLeads)); 
      }
    };

    // Listen strictly to the clean isolated sync channel
    window.addEventListener('crm:notifications-badge-sync', handleLiveBadgeSync);
    return () => {
      window.removeEventListener('crm:notifications-badge-sync', handleLiveBadgeSync);
    };
  }, []);

  return (
    <div className="relative flex-shrink-0" ref={containerRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg border transition-all relative cursor-pointer group shadow-3xs
          ${isOpen 
            ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60" 
            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/80 hover:border-blue-500"}`}
      >
        <Bell size={15} className={isOpen ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"} />
        {effectiveTotal > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 border-2 border-white dark:border-gray-900">
            {effectiveTotal > 99 ? "99+" : effectiveTotal}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Action Centre</h3>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 mt-0.5">
                {effectiveTotal > 0 ? `${effectiveTotal} tasks need resolution` : "All operational pipelines clear"}
              </p>
            </div>
            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
            {effectiveTotal === 0 ? (
              <div className="py-8 text-center select-none">
                <CheckCircle className="mx-auto text-emerald-400 mb-2" size={24} />
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">Pipeline Clear!</p>
              </div>
            ) : (
              <>
                {unassignedCount > 0 && (
                  <button type="button" onClick={() => { navigate("/leads"); setIsOpen(false); }} className="w-full text-left p-3 bg-emerald-50/60 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20 rounded-xl flex gap-3 cursor-pointer">
                    <UserPlus size={15} className="text-emerald-600 mt-0.5 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between font-black text-[11px] text-emerald-600">
                        <span>UNASSIGNED LEADS</span><span>{unassignedCount}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">New lead records waiting for distribution</p>
                    </div>
                  </button>
                )}
                {overdueCount > 0 && (
                  <button type="button" onClick={() => { navigate("/followups"); setIsOpen(false); }} className="w-full text-left p-3 bg-rose-50/60 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/20 rounded-xl flex gap-3 cursor-pointer">
                    <AlertCircle size={15} className="text-rose-600 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between font-black text-[11px] text-rose-600">
                        <span>OVERDUE FOLLOWUPS</span><span>{overdueCount}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">Follow-up actions past scheduled metrics</p>
                    </div>
                  </button>
                )}
                {todayCount > 0 && (
                  <button type="button" onClick={() => { navigate("/followups"); setIsOpen(false); }} className="w-full text-left p-3 bg-blue-50/60 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/20 rounded-xl flex gap-3 cursor-pointer">
                    <Calendar size={15} className="text-blue-600 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between font-black text-[11px] text-blue-600">
                        <span>DUE TODAY</span><span>{todayCount}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">Lead follow-up sequences pending execution</p>
                    </div>
                  </button>
                )}
              </>
            )}
          </div>

          <div className="px-3 pb-3 flex gap-2 border-t border-gray-100 dark:border-gray-800 pt-2 bg-gray-50/50 dark:bg-gray-900/30">
            <button type="button" onClick={() => { navigate("/audit-logs"); setIsOpen(false); }} className="flex-1 py-1.5 text-[10px] font-bold text-gray-500 border border-gray-200 rounded-lg hover:bg-white transition cursor-pointer text-center">View Activity</button>
            <button type="button" onClick={() => { clearNotifs(); setIsOpen(false); }} className="flex-1 py-1.5 text-[10px] font-black text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-50 transition cursor-pointer text-center">Flush Cache</button>
          </div>
        </div>
      )}
    </div>
  );
});

NotificationDropdown.displayName = 'NotificationDropdown';