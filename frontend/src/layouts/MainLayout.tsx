import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Users, Layers, TrendingUp, MessageCircle,
  Upload, BrainCircuit, BarChart3, FileText, Activity, Database, 
  Settings, ShieldCheck, Medal
} from "lucide-react";
import { apiGet } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { ToastContainer } from "../hooks/useToast";
import { Sidebar } from "./components/Sidebar";
import { MobileSidebar } from "./components/MobileSidebar";
import { Topbar } from "./components/Topbar";
import { PageContainer } from "./components/PageContainer";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":                   "Dashboard",
  "/leads":                       "Lead Workspace",
  "/pipeline":                    "Pipeline",
  "/followups":                   "Today's Tasks",
  "/communication":               "Comm. Logs",
  "/automation":                  "AI Engine",
  "/analytics":                   "Intelligence",
  "/performance":                 "Staff Performance", 
  "/reports":                     "Lead Reports",
  "/audit-logs":                  "Activity Logs",
  "/settings":                    "Settings",
  "/permissions":                 "Access Control",
  "/masters":                     "System Masters Control",
};

export default function MainLayout() {
  const { user, logout, permissionsLoading, can } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [dark,            setDark]        = useState(() => localStorage.getItem("darkMode") === "true");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed,       setCollapsed]   = useState(false);
  const [showNotif,       setShowNotif]   = useState(false);
  const [showUser,        setShowUser]    = useState(false);
  
  const [logo,            setLogo]        = useState("");
  const [companyName, setCompanyName] = useState("WebGyor Media"); 
  const [notifData,       setNotifData]   = useState({ overdue: 0, today: 0, newLeads: 0 });

  const fetchNotificationMetrics = useCallback(async () => {
    try {
      const localDate = new Date().toLocaleDateString('en-CA');
      const res = await apiGet(`/api/dashboard/notifications?localDate=${localDate}`);
      if (!res) return;
      const payload = res.success && res.data ? res.data : res;
      setNotifData({
        overdue:  Number(payload?.overdue ?? 0),
        today:    Number(payload?.today ?? 0),
        newLeads: Number(payload?.newLeads ?? payload?.new_leads ?? 0),
      });
    } catch (err) {
      console.error('fetchNotificationMetrics error:', err);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotificationMetrics();
    const intervalRegistry = setInterval(fetchNotificationMetrics, 60000);
    return () => clearInterval(intervalRegistry);
  }, [user, fetchNotificationMetrics]);

  const fetchBranding = useCallback(async () => {
    try {
      const res = await apiGet("/api/settings");
      const data = res?.success && res?.data ? res.data : res;
      if (data?.company_name) setCompanyName(data.company_name);
      if (data?.logo_url) setLogo(data.logo_url);
    } catch (err) {
      console.error('fetchBranding error:', err);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const sidebarSections = useMemo(() => {
    return [
      {
        title: "Overview",
        items: [
          ...(can("dashboard", "view") ? [{ label: "Dashboard", to: "/dashboard", slug: "dashboard", icon: <LayoutDashboard size={14} /> }] : []),
          ...(can("leads", "view") ? [{ label: "Lead Workspace", to: "/leads", slug: "leads", icon: <Users size={14} />, end: true }] : []),
        ],
      },
      {
        title: "Operations",
        items: [
          ...(can("pipeline", "view") ? [{ label: "Pipeline Board", to: "/pipeline", slug: "pipeline", icon: <Layers size={14} /> }] : []),
          ...(can("tasks", "view") ? [{ label: "Follow up Tasks", to: "/followups", slug: "tasks", icon: <TrendingUp size={14} /> }] : []),
          ...(can("communication", "view") ? [{ label: "Communication", to: "/communication", slug: "communication", icon: <MessageCircle size={14} /> }] : []),
          ...(can("import", "view") ? [{ label: "Import Data", to: "/leads/operations-hub/import", slug: "import", icon: <Upload size={14} /> }] : []),
          ...(can("automation", "view") ? [{ label: "AI Automation", to: "/automation", slug: "automation", icon: <BrainCircuit size={14} /> }] : []),
        ],
      },
      {
        title: "Admin",
        items: [
          ...(can("analytics", "view") ? [{ label: "Analytics", to: "/analytics", slug: "analytics", icon: <BarChart3 size={14} /> }] : []),
          ...(can("reports", "view") ? [{ label: "Lead Reports", to: "/reports", slug: "reports", icon: <FileText size={14} /> }] : []),
          ...(can("audit", "view") ? [{ label: "Audit & Logs", to: "/audit-logs", slug: "audit", icon: <Activity size={14} /> }] : []),
          ...(can("performance", "view") ? [{ label: "Staff Performance", to: "/performance", slug: "performance", icon: <Medal size={14} /> }] : []), 
          ...(can("masters", "view") ? [{ label: "System Masters", to: "/masters", slug: "masters", icon: <Database size={14} /> }] : []),
        ],
      },
      {
        title: "System",
        items: [
          ...(can("settings", "view") ? [{ label: "Settings", to: "/settings", slug: "settings", icon: <Settings size={14} /> }] : []),
          ...(can("rbac", "view") ? [{ label: "Access Control", to: "/permissions", slug: "rbac", icon: <ShieldCheck size={14} /> }] : []),
        ],
      },
    ]
    .map(section => ({
      ...section,
      items: section.items.map(item => item.slug === "tasks" ? { ...item, badge: notifData.today } : item),
    }))
    .filter(section => section.items.length > 0);
  }, [can, notifData.today, permissionsLoading]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-gray-100 font-sans antialiased overflow-hidden">
      <MobileSidebar
        sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
        logo={logo} companyName={companyName} sections={sidebarSections}
        openGroups={{}} onToggleGroup={() => {}}
      />
      <div className="hidden md:flex flex-shrink-0 h-full">
        <Sidebar
          logo={logo} companyName={companyName} collapsed={collapsed} setCollapsed={setCollapsed}
          sections={sidebarSections} openGroups={{}} onToggleGroup={() => {}}
          closeSidebar={() => setSidebarOpen(false)} sidebarWidth={collapsed ? "w-[60px]" : "w-56"}
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden relative">
        <Topbar
          setSidebarOpen={setSidebarOpen} pageTitle={PAGE_TITLES[location.pathname] || "CRM Matrix"}
          dark={dark} setDark={setDark} notifData={notifData}
          totalNotif={notifData.overdue + notifData.today + notifData.newLeads} navigate={navigate}
          clearNotifs={() => setNotifData({ overdue: 0, today: 0, newLeads: 0 })} user={user}
          avatarColor="bg-blue-600" handleLogout={logout} showNotif={showNotif} setShowNotif={setShowNotif}
          showUser={showUser} setShowUser={setShowUser}
        />
        <div className="flex-1 overflow-y-auto"><PageContainer><Outlet /></PageContainer></div>
      </div>
      <ToastContainer />
    </div>
  );
}