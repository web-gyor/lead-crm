import React, { useState, useEffect } from "react";
import { Activity, Headphones, Clock, RefreshCw, Download, Search, ChevronRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { toast, Toaster } from "react-hot-toast";
import { apiGet } from "../../utils/api";

import { MasterPageLayout } from "../master/layout/MasterPageLayout";
import { ActivityTimelinePane } from "./components/ActivityTimelinePane";
import { TelephonyMonitoringPane } from "./components/TelephonyMonitoringPane";
import { WorkforceAttendancePane } from "./components/WorkforceAttendancePane";

type LogsTabId = "activity" | "calls" | "attendance";

const getLocalDateString = () => new Date().toISOString().split('T')[0];

export default function OperationsLogsHub() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  
  const [activeTab, setActiveTab] = useState<LogsTabId>("activity");
  const [globalDate, setGlobalDate] = useState<string>(getLocalDateString());
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [globalStaff, setGlobalStaff] = useState<string>("all");
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [staffList, setStaffList] = useState<{id: string, name: string, role: string}[]>([]);

  const handleGlobalRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    toast.success("Operational logs re-synchronized");
  };

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await apiGet("/api/users/staff"); 
        if (res.success) {
          setStaffList(res.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch staff list");
      }
    };
    fetchStaff();
  }, []);

  const isFilterActive = 
  globalSearch !== "" || 
  globalDate !== getLocalDateString() || 
  globalStaff !== "all";

  return (
    <div className="space-y-4 pb-12 text-sm text-slate-900 dark:text-slate-100 font-normal antialiased">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
            <Activity size={14} className="text-white" />
          </div>
          <div>
            <nav className="flex items-center gap-1 text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">
              <span>Security Hub</span> <ChevronRight size={10} /> <span>Operations Logs</span>
            </nav>
            <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">Operations Audit Ledger</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={handleGlobalRefresh} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-white rounded-xl transition-all">
            <RefreshCw size={13} className={refreshTrigger > 0 ? "animate-spin text-blue-500" : ""} />
          </button>
          <button type="button" className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider">
            <Download size={12} /> <span>Export CSV</span>
          </button>
        </div>
      </div>

{/* Filters Section */}
<div className="flex flex-col md:flex-row gap-3 pt-1 items-center">
  
  <div className="relative w-full md:w-1/3">
    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
    <input 
      type="text" 
      placeholder="Search audit signatures..." 
      value={globalSearch} 
      onChange={(e) => setGlobalSearch(e.target.value)}
      className="w-full pl-9 pr-4 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none" 
    />
  </div>

  <div className="flex gap-3 w-full md:w-auto items-center">
    <input 
      type="date" 
      value={globalDate} 
      onChange={(e) => setGlobalDate(e.target.value)}
      className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none cursor-pointer" 
    />

    <div className="relative border border-slate-200 rounded-xl bg-white overflow-hidden w-40">
      <select 
        value={globalStaff} 
        onChange={(e) => setGlobalStaff(e.target.value)}
        className="h-full px-3 py-1.5 text-xs font-bold bg-transparent outline-none cursor-pointer w-full"
        style={{ appearance: 'menulist' }}
      >
        <option value="all">All Staff</option>
        {staffList.map((staff) => (
          <option key={staff.id} value={staff.id}>{staff.name} ({staff.role})</option>
        ))}
      </select>
    </div>

    {/* Clear Button: Only shows if a filter is active */}
    {isFilterActive && (
      <button 
        onClick={() => {
          setGlobalSearch("");
          setGlobalDate(getLocalDateString());
          setGlobalStaff("all");
        }}
        className="px-3 py-1.5 text-[10px] font-black uppercase text-red-500 hover:bg-red-50 border border-red-100 rounded-xl transition-all"
      >
        Clear
      </button>
    )}
  </div>
</div>
      {/* Tabs */}
      <div className="space-y-4 pt-1">
        <div className="flex gap-1.5 bg-slate-100/80 dark:bg-slate-950/40 p-1 rounded-xl w-max border border-slate-200/40">
          {[
            { id: "activity", label: "Activity Logs", icon: Activity },
            { id: "calls", label: "Call Logs", icon: Headphones },
            { id: "attendance", label: "Attendance Logs", icon: Clock }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as LogsTabId)}
              className={`flex items-center gap-2 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === tab.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"
              }`}
            >
              <tab.icon size={12} strokeWidth={3} />
              <span>{tab.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>

        <div className="w-full min-w-0 pt-1">
          <MasterPageLayout>
            {activeTab === "activity" && <ActivityTimelinePane search={globalSearch} date={globalDate} staffId={globalStaff} refreshTrigger={refreshTrigger} />}
            {activeTab === "calls" && <TelephonyMonitoringPane search={globalSearch} date={globalDate} staffId={globalStaff} refreshTrigger={refreshTrigger} isAdmin={isAdmin} />}
            {activeTab === "attendance" && <WorkforceAttendancePane search={globalSearch} date={globalDate} staffId={globalStaff} refreshTrigger={refreshTrigger} />}
          </MasterPageLayout>
        </div>
      </div>
    </div>
  );
}