import React, { useState, useEffect } from "react";
import { Users2, GraduationCap, Globe, LayoutGrid, ChevronRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import UsersMaster from "./UsersMaster";
import CoursesMaster from "./CoursesMaster";
import CountryMaster from "./CountryMaster";

type MasterTab = "staff" | "courses" | "countries";

export default function MastersDashboard() {
  const { can } = useAuth();
  const [activeTab, setActiveTab] = useState<MasterTab>("staff");

  const TABS = [
    { id: "staff" as MasterTab, label: "Staff & Access", icon: Users2, slug: "admin.users", bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    { id: "courses" as MasterTab, label: "Courses", icon: GraduationCap, slug: "masters", bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    { id: "countries" as MasterTab, label: "Countries", icon: Globe, slug: "masters", bg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  ];

  // Filter tabs based on DB permissions
  const visibleTabs = TABS.filter(tab => can(tab.slug, 'view'));

  // Automatically switch tab if current tab becomes unauthorized
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.find(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTab]);

  return (
    <div className="space-y-4 pb-12 text-sm text-slate-900 dark:text-slate-100 font-normal antialiased px-4 sm:px-6 lg:px-0">
      <div className="max-w-[1600px] mx-auto space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
              <LayoutGrid size={14} className="text-white" />
            </div>
            <div>
              <nav className="flex items-center gap-1 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                <span>CRM Hub</span> <ChevronRight size={10} /> <span>System Masters</span>
              </nav>
              <h1 className="text-sm font-black uppercase tracking-wide">System Masters Control</h1>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-100/80 dark:bg-slate-900/40 rounded-xl border border-slate-200/40">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                  isActive ? `${tab.bg} shadow-sm ring-1 ring-inset ring-black/5` : "text-slate-500 hover:bg-white/40"
                }`}
              >
                <Icon size={12} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="min-h-[600px] w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          {activeTab === "staff" && can('admin.users', 'view') && <UsersMaster isNested />}
          {activeTab === "courses" && can('masters', 'view') && <CoursesMaster isNested />}
          {activeTab === "countries" && can('masters', 'view') && <CountryMaster isNested />}
        </div>
      </div>
    </div>
  );
}