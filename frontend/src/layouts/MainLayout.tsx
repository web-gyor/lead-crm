import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Users, TrendingUp, MessageCircle, FileText,
  Settings, Database, Upload, Layers, Activity, ShieldCheck, 
  BarChart3, Medal, BrainCircuit
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
  "/leads/cold-storage":          "Cold Storage",
  "/leads":                       "Lead Workspace",
  "/pipeline":                    "Pipeline",
  "/followups":                   "Today's Tasks",
  "/communication":               "Comm. Logs",
  "/automation":                  "AI Engine",
  "/analytics":                   "Intelligence",
  "/performance":                 "Staff Performance", 
  "/reports":                     "Lead Reports",
  "/leads/operations-hub":        "Lead Operations Hub",
  "/audit-logs":                  "Activity Logs",
  "/call-tracker":                "Call Logs",
  "/masters/users":               "Staff Master",
  "/masters/courses":             "Course Master",
  "/settings":                    "Settings",
  "/permissions":                 "Access Control",
  "/masters":                     "System Masters Control",
};

const AVATAR_COLORS = [
  "bg-blue-600", "bg-violet-600", "bg-rose-600", "bg-emerald-600",
  "bg-amber-600", "bg-cyan-600",  "bg-pink-600", "bg-indigo-600",
];

export default function MainLayout() {
  const { user, logout, permissionsLoading, can } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [dark,            setDark]        = useState(() => localStorage.getItem("darkMode") === "true");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed,       setCollapsed]   = useState(false);
  const [showNotif,       setShowNotif]   = useState(false);
  const [showUser,        setShowUser]    = useState(false);
  const [openGroups,      setOpenGroups]  = useState<Record<string, boolean>>({ masters: false });
  
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
        overdue:  MakeNumber(payload?.overdue   ?? 0),
        today:    MakeNumber(payload?.today     ?? 0),
        newLeads: MakeNumber(payload?.newLeads  ?? payload?.new_leads ?? 0),
      });
    } catch (err) {
      console.error('fetchNotificationMetrics error:', err);
    }
  }, []);

  const MakeNumber = (val: any): number => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

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
      const rawLogo = data?.logo_url || data?.logo || '';
      if (rawLogo) setLogo(rawLogo);
    } catch (err) {
      console.error('fetchBranding error:', err);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
    window.addEventListener("settingsUpdated", fetchBranding);
    return () => window.removeEventListener("settingsUpdated", fetchBranding);
  }, [fetchBranding]);

  const avatarColorCalculated = useMemo(() => {
    if (!user?.name) return "bg-blue-600";
    return AVATAR_COLORS[user.name.trim().charCodeAt(0) % AVATAR_COLORS.length];
  }, [user]);

  // Dynamic compiler building view sections directly based on sanitized structural roles
  const sidebarSections = useMemo(() => {
    const cleanUserRole = String(user?.role || "").toLowerCase().replace(/\s+|-/g, "");
    
    // 🛡️ Hierarchy Definitions
    const isSuperAdmin = cleanUserRole === "superadmin";
    const isAdmin      = cleanUserRole === "admin";
    const isMaster     = isSuperAdmin || isAdmin;
    
    const isManager    = cleanUserRole === "manager";
    const isStaff      = cleanUserRole === "counselor" || cleanUserRole === "telecaller" || cleanUserRole === "staff" || cleanUserRole === "staffmember";

    const rawSections = [
      {
        title: "Overview",
        items: [
          { label: "Dashboard",      to: "/dashboard",        slug: "dashboard",     icon: <LayoutDashboard size={14} /> },
          { label: "Lead Workspace", to: "/leads",            slug: "leads",         icon: <Users size={14} />, end: true },
        ],
      },
      {
        title: "Operations",
        items: [
          // 🔓 UNLOCKED FOR EVERYONE: Core active daily workspaces
          ...((isMaster || isManager || isStaff || can("leads.kanban", "view")) ? [{ label: "Pipeline Board", to: "/pipeline", slug: "pipeline", icon: <Layers size={14} /> }] : []),
          ...((isMaster || isManager || isStaff || can("tasks.view", "view")) ? [{ label: "Follow up Tasks", to: "/followups", slug: "tasks", icon: <TrendingUp size={14} /> }] : []),
          
          // 🛡️ MANAGEMENT & ADMINISTRATIVE PRIVILEGES: (Hidden from Counselors/Telecallers)
          ...((isMaster || isManager || can("logs.communication", "view")) ? [{ label: "Communication", to: "/communication", slug: "communication", icon: <MessageCircle size={14} /> }] : []),
          ...((isMaster || isManager || can("leads.import", "view")) ? [{ label: "Import Data", to: "/leads/operations-hub/import", slug: "import", icon: <Upload size={14} /> }] : []),
          ...((isMaster || isManager || can("ai.intelligence", "view")) ? [{ label: "AI Automation", to: "/automation", slug: "automation", icon: <BrainCircuit size={14} /> }] : []),
        ],
      },
      {
        title: "Admin",
        items: [
          // 🔓 METRICS PRIVILEGES: Shared by Masters and Managers
          ...((isMaster || isManager || can("analytics.view", "view")) ? [{ label: "Analytics", to: "/analytics", slug: "analytics", icon: <BarChart3 size={14} /> }] : []),
          ...((isMaster || isManager || can("reports.view", "view")) ? [{ label: "Lead Reports", to: "/reports", slug: "reports", icon: <FileText size={14} /> }] : []),
          ...((isMaster || isManager || can("audit.view", "view")) ? [{ label: "Audit & Logs", to: "/audit-logs", slug: "audit", icon: <Activity size={14} /> }] : []),
          
          // 🔓 UNLOCKED FOR EVERYONE: Staff evaluation tracking
          ...((isMaster || isManager || isStaff || can("performance.view", "view")) ? [{ label: "Staff Performance", to: "/performance", slug: "performance", icon: <Medal size={14} /> }] : []), 

          // 🔒 HARD RESTRICTION: System Master internal configuration matrices (Hidden from Managers & Staff)
          ...((isMaster || can("masters.view", "view")) ? [{ label: "System Masters", to: "/masters", slug: "masters", icon: <Database size={14} /> }] : []),
        ],
      },
      {
        title: "System",
        items: [
          // 🔒 HARD RESTRICTION: Administrative setup gates (Hidden from Managers & Staff)
          ...((isMaster) ? [{ label: "Settings", to: "/settings", slug: "settings", icon: <Settings size={14} /> }] : []),
          ...((isMaster || can("system.permissions", "view")) ? [{ label: "Access Control", to: "/permissions", slug: "rbac", icon: <ShieldCheck size={14} /> }] : []),
        ],
      },
    ];

    if (permissionsLoading) {
      return rawSections.map(section => ({
        ...section,
        items: section.items.map(item => ({ ...item, skeleton: true })),
      }));
    }

    return rawSections
      .map(section => ({
        ...section,
        items: section.items.map(item => item.slug === "tasks" ? { ...item, badge: notifData.today } : item),
      }))
      .filter(section => section.items.length > 0);
  }, [permissionsLoading, can, notifData.today, user]);

  const pageTitle = useMemo(() => {
    const exact  = PAGE_TITLES[location.pathname];
    if (exact) return exact;
    const prefix = Object.keys(PAGE_TITLES).find(k => location.pathname.startsWith(k) && k !== "/");
    return prefix ? PAGE_TITLES[prefix] : "CRM Matrix";
  }, [location.pathname]);

  const toggleGroup = useCallback((key: string) => {
    setOpenGroups(p => ({ ...p, [key]: !p[key] }));
  }, []);

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
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        logo={logo} 
        companyName={companyName}
        sections={sidebarSections}
        openGroups={openGroups}
        onToggleGroup={toggleGroup}
      />

      <div className="hidden md:flex flex-shrink-0 h-full">
        <Sidebar
          logo={logo} 
          companyName={companyName}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          sections={sidebarSections}
          openGroups={openGroups}
          onToggleGroup={toggleGroup}
          closeSidebar={() => setSidebarOpen(false)}
          sidebarWidth={collapsed ? "w-[60px]" : "w-56"}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden relative">
        <div className="relative z-40 flex-shrink-0">
          <Topbar
            setSidebarOpen={setSidebarOpen}
            pageTitle={pageTitle}
            dark={dark}
            setDark={setDark}
            notifData={notifData}
            totalNotif={notifData.overdue + notifData.today + notifData.newLeads}
            navigate={navigate}
            clearNotifs={() => setNotifData({ overdue: 0, today: 0, newLeads: 0 })}
            user={user}
            avatarColor={avatarColorCalculated}
            handleLogout={logout}
            showNotif={showNotif} setShowNotif={setShowNotif}
            showUser={showUser}   setShowUser={setShowUser}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          <PageContainer><Outlet /></PageContainer>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}