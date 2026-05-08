// src/layouts/MainLayout.tsx
import { ReactNode, useState, useRef, useEffect, useCallback, useMemo } from "react";
import { NavLink, useNavigate, useLocation, Outlet  } from "react-router-dom";
import {
  LayoutDashboard, Users, Lightbulb, Clock, UserCog,
  TrendingUp, MessageCircle, FileText, Settings, Database,
  ChevronDown, ChevronRight, UserPlus, Phone, Bell, Menu, Sun, Moon,
  Layers, Package, BrainCircuit, CheckCircle, XCircle, BarChart3,
  LogOut, Filter, Upload, Zap, Calendar, History, UserCheck,
  ShieldCheck, X, Activity, AlertCircle, Globe
} from "lucide-react";
import { apiGet } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { ToastContainer } from "../hooks/useToast";
import { hasPermission } from "../utils/permissions";
import AttendanceWidget from "../components/AttendanceWidget";
// ─── Types ────────────────────────────────────────────────────────────────────


interface NavItemConfig {
  label:       string;
  to:          string;
  icon:        ReactNode;
  permission?: string;
  disabled?:   boolean;
  badge?:      number;

}

interface SectionConfig {
  title:      string;
  permission?: string; // section only renders if this can() passes
  items:      NavItemConfig[];
}

// ─── Route → Page title map ───────────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  "/dashboard":        "Dashboard",
  "/leads":            "All Leads",
  "/leads/new":        "New Leads",
  "/leads/contacted":  "Contacted",
  "/leads/interested": "Interested",
  "/leads/followup-leads": "Follow-up",
  "/leads/converted":  "Converted",
  "/leads/lost":       "Lost",
  "/leads/rejected":   "Rejected",
  "/pipeline":         "Pipeline",
  "/followups":        "Today's Tasks",
  "/communication":    "Comm. Logs",
  "/automation":       "AI Engine",
  "/analytics":        "Intelligence",
  "/performance":      "Performance",
  "/reports":          "Lead Reports",
  "/import":           "Bulk Import",
  "/distribution": "Lead Distribution",
  "/audit-logs":       "Activity Logs",
  "/masters/users":    "Staff Master",
  "/masters/courses":  "Course Master",
  "/settings":         "System Config",
  "/permissions":      "Access Control",
};

// ─── Shared avatar color ──────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-blue-600","bg-violet-600","bg-rose-600","bg-emerald-600",
  "bg-amber-600","bg-cyan-600","bg-pink-600","bg-indigo-600",
];
const avatarColor = (name: string) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Single nav link — full or icon-only mode */
function SidebarLink({ item, collapsed, onClick }: {
  item: NavItemConfig; collapsed: boolean; onClick: () => void;
}) {
  if (item.disabled) {
    return (
      <div title={collapsed ? item.label : undefined}
        className="flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-gray-300 dark:text-gray-600 cursor-not-allowed rounded-lg">
        <span className="w-[18px] h-[18px] flex-shrink-0 flex items-center justify-center">{item.icon}</span>
        {!collapsed && <span className="truncate flex-1">{item.label}</span>}
        {!collapsed && <span className="text-[8px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">Soon</span>}
      </div>
    );
  }
return (
    <NavLink 
      to={item.to} 
      // ✅ FIX: Use item.end if it exists, otherwise fall back to the dashboard logic
      end={item.end !== undefined ? item.end : item.to === "/dashboard"} 
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all group relative
        ${isActive
          ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
          : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"}`
      }>
      <span className="w-[18px] h-[18px] flex-shrink-0 flex items-center justify-center">{item.icon}</span>
      {!collapsed && <span className="truncate flex-1 uppercase tracking-wide">{item.label}</span>}
      {/* ... badge logic ... */}
    </NavLink>
  );
}

/** Collapsible submenu group */
function SidebarGroup({ item, collapsed, open, onToggle, closeSidebar }: {
  item: NavItemConfig; collapsed: boolean; open: boolean;
  onToggle: () => void; closeSidebar: () => void;
}) {
  return (
    <div>
      <button type="button" onClick={onToggle}
        title={collapsed ? item.label : undefined}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all uppercase tracking-wide">
        <span className="w-[18px] h-[18px] flex-shrink-0 flex items-center justify-center">{item.icon}</span>
        {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
        {!collapsed && (open ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
      </button>
      {!collapsed && open && item.children && (
        <div className="ml-4 mt-0.5 pl-3 border-l border-gray-100 dark:border-gray-800 space-y-0.5">
          {item.children.map(child => (
            <SidebarLink key={child.to} item={child} collapsed={false} onClick={closeSidebar} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Section label + items */
function SidebarSection({ title, items, collapsed, openGroups, onToggleGroup, closeSidebar }: {
  title: string; items: NavItemConfig[]; collapsed: boolean;
  openGroups: Record<string, boolean>;
  onToggleGroup: (key: string) => void;
  closeSidebar: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-0.5">
      {!collapsed && (
        <p className="px-3 text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-[0.18em] mb-1.5 pt-1">
          {title}
        </p>
      )}
      {collapsed && <div className="h-px bg-gray-100 dark:border-gray-800 mx-2 my-2" />}
      {items.map(item =>
        item.children?.length
          ? <SidebarGroup key={item.to} item={item} collapsed={collapsed} open={!!openGroups[item.to]}
              onToggle={() => onToggleGroup(item.to)} closeSidebar={closeSidebar} />
          : <SidebarLink key={item.to} item={item} collapsed={collapsed} onClick={closeSidebar} />
      )}
    </div>
  );
}

// ─── Notification card ────────────────────────────────────────────────────────
function NotifCard({ icon, title, count, sub, bg, border, text, onClick }: any) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full text-left p-3 ${bg} border ${border} rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99]`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex-shrink-0 ${text}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-[11px] font-bold uppercase tracking-wide ${text}`}>{title}</p>
            <span className={`text-[10px] font-black tabular-nums ${text}`}>{count}</span>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{sub}</p>
        </div>
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function MainLayout() {
  const { user, logout, permissions } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const isAdmin   = user?.role?.toLowerCase() === "admin";

  // Permission helper
  const can = useCallback(
    (feature: string) => isAdmin || hasPermission(user, permissions, feature),
    [isAdmin, user, permissions]
  );

  // UI state
  const [dark,          setDark]          = useState(() => localStorage.getItem("darkMode") === "true");
  const [sidebarOpen,   setSidebarOpen]   = useState(false);   // mobile drawer
  const [collapsed,     setCollapsed]     = useState(false);   // desktop icon-only
  const [showNotif,     setShowNotif]     = useState(false);
  const [showUser,      setShowUser]      = useState(false);
  const [openGroups,    setOpenGroups]    = useState<Record<string, boolean>>({
    "status-filter": true, // open by default
    "masters":       false,
  });

  // Data state
  const [logo,        setLogo]        = useState("");
  const [companyName, setCompanyName] = useState("CRM Alpha");
  const [notifData,   setNotifData]   = useState({ overdue: 0, today: 0, newLeads: 0 });

  // Refs
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef  = useRef<HTMLDivElement>(null);

  // ── Dark mode ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark"); root.style.colorScheme = "dark";
      localStorage.setItem("darkMode", "true");
    } else {
      root.classList.remove("dark"); root.style.colorScheme = "light";
      localStorage.setItem("darkMode", "false");
    }
  }, [dark]);

  // ── Click outside dropdowns ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setShowUser(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Keyboard shortcut: Ctrl+B toggles sidebar ────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        setCollapsed(p => !p);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ── Branding ──────────────────────────────────────────────────────────────────
  const fetchBranding = useCallback(async () => {
    try {
      const data = await apiGet("/api/settings");
      if (data) { setLogo(data.logo_url || ""); setCompanyName(data.company_name || "CRM Alpha"); }
    } catch {}
  }, []);
  useEffect(() => {
    fetchBranding();
    window.addEventListener("settingsUpdated", fetchBranding);
    return () => window.removeEventListener("settingsUpdated", fetchBranding);
  }, [fetchBranding]);




  // ── Notification polling ─────────────────────────────────────────────────────
useEffect(() => {
  if (!user) return;

  const fetchNotifs = async () => {
    try {
      // ✅ 1. Standardize Today as a String (IST/Kozhikode Local)
      const todayIST = new Date().toLocaleDateString('en-CA'); 
      
      // ✅ 2. Pass localDate to Backend to align SQL queries
      const res = await apiGet(`/api/leads?status=all&limit=500&localDate=${todayIST}`);

      const allLeads = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];

      let overdue = 0;
      let today = 0;
      let newLeadsCount = 0;

      // Final statuses to ignore for follow-up math
      const FINAL_STATUSES = new Set([
        "converted",
        "lost",
        "not interested",
        "rejected",
        "closed",
      ]);

      allLeads.forEach((l) => {
        const status = (l.lead_status ?? "").toLowerCase().trim();
        
        // 🔹 Logic: Awaiting Assignment (Must be NEW and have no counselor)
        const isUnassigned = !l.assigned_user_id || Number(l.assigned_user_id) === 0;
        if (status === "new" && isUnassigned) {
          newLeadsCount++;
        }

        // 🔹 Logic: Follow-up Tracking
        if (FINAL_STATUSES.has(status)) return;

        // Clean the date string (YYYY-MM-DD)
        const dateStr = l.next_follow_up_date ? l.next_follow_up_date.split('T')[0] : null;
        if (!dateStr) return;

        // ✅ 3. String Comparison (Prevents Timezone Snap-Back)
        if (dateStr < todayIST) {
          overdue++;
        } else if (dateStr === todayIST) {
          today++;
        }
      });

      setNotifData({
        overdue,
        today,
        newLeads: newLeadsCount,
      });

    } catch (err) {
      console.error("Notification polling error:", err);
    }
  };

  fetchNotifs();
  const interval = setInterval(fetchNotifs, 30000); // 30-second poll
  return () => clearInterval(interval);
}, [user]);

  // ── Page title from route ─────────────────────────────────────────────────────
  const pageTitle = useMemo(() => {
    const exact = PAGE_TITLES[location.pathname];
    if (exact) return exact;
    // Try prefix match for dynamic routes
    const prefix = Object.keys(PAGE_TITLES).find(k => location.pathname.startsWith(k) && k !== "/");
    return prefix ? PAGE_TITLES[prefix] : "CRM";
  }, [location.pathname]);

  // ── Sidebar nav config ────────────────────────────────────────────────────────
  const totalNotif = notifData.overdue + notifData.today + notifData.newLeads;

 const sections: SectionConfig[] = useMemo(() => [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", to: "/dashboard", icon: <LayoutDashboard size={16} />},
      ...(can("leads.view") ? [
        { label: "All Leads", to: "/leads", icon: <Users size={16} />, end: true },
        {
          label: "Status Filter", to: "status-filter",
          icon: <Filter size={16} />,
          children: [
            { label: "New",         to: "/leads/new",             icon: <UserPlus size={14} /> },
            { label: "Contacted",   to: "/leads/contacted",       icon: <Phone size={14} /> },
            { label: "Interested",  to: "/leads/interested",      icon: <Lightbulb size={14} /> },
            { label: "Follow-up",   to: "/leads/followup-leads",  icon: <Clock size={14} /> },
            { label: "Converted",   to: "/leads/converted",       icon: <CheckCircle size={14} /> },
            { label: "Lost",        to: "/leads/lost",            icon: <XCircle size={14} /> },
            { label: "Rejected",    to: "/leads/rejected",        icon: <XCircle size={14} /> },
          ],
        },
      ] : []),
    ],
  },
  {
    title: "Operations",
    items: [
      ...(can("leads.kanban") ? [{ label: "Pipeline",      to: "/pipeline",       icon: <Layers size={16} /> }] : []),
      ...(can("tasks.view")   ? [{ label: "Today's Tasks", to: "/followups",      icon: <TrendingUp size={16} />, badge: notifData.today }] : []),
      ...(can("logs.communication") ? [{ label: "Comm. Logs",  to: "/communication",   icon: <MessageCircle size={16} /> }] : []),
      ...(can("ai.intelligence") ? [{ label: "AI Engine",     to: "/automation",     icon: <BrainCircuit size={16} />, disabled: true }] : []),
    ],
  },
  {
    title: "System Admin",
    items: [
      ...(can("analytics.revenue") ? [{ label: "Intelligence",  to: "/analytics",   icon: <BarChart3 size={16} /> }] : []),
      ...(can("analytics.staff") ? [{ label: "Performance",   to: "/performance", icon: <UserCheck size={16} /> }] : []),
      ...(can("data.export")       ? [{ label: "Lead Reports",  to: "/reports",     icon: <FileText size={16} /> }] : []),
      ...(can("leads.assign") ? [{label: "Distribution",  to: "/distribution", icon: <Zap size={16} className="text-amber-500" fill="currentColor" /> 
      }] : []),
      ...(can("data.import")       ? [{ label: "Bulk Import",   to: "/import",      icon: <Upload size={16} /> }] : []),
      ...(can("logs.activity")     ? [{ label: "Activity Logs", to: "/audit-logs",  icon: <History size={16} /> }] : []),
      
      ...((can("master.staff") || can("master.course")) ? [{
        label: "Masters", to: "masters",
        icon: <Database size={16} />,
      children: [
  ...(can("master.staff")   ? [{ label: "Staff Master",   to: "/masters/users",   icon: <Users size={14} /> }] : []),
  ...(can("master.course")  ? [{ label: "Course Master", to: "/masters/courses", icon: <Package size={14} /> }] : []),
  // --- Add this line ---
  ...(can("master.country") ? [{ label: "Country Master", to: "/masters/countries", icon: <Globe size={14} /> }] : []),
  ...(can("attendance.view") ? [{ label: "Attendance Log", to: "/attendance", icon: <Clock size={14} /> }] : []),
        ],
      }] : []),
    ],
  },
  {
    title: "System",
    items: [
      { label: "System Config", to: "/settings",    icon: <Settings size={16} /> },
      ...(can("system.permissions") ? [{ label: "Access Control", to: "/permissions", icon: <ShieldCheck size={16} /> }] : []),
    ],
  },
], [can, notifData.today, notifData.newLeads]); // Added newLeads to dependencies for badge accuracy

  const toggleGroup = (key: string) => setOpenGroups(p => ({ ...p, [key]: !p[key] }));
  const closeSidebar = () => setSidebarOpen(false);
  const handleLogout = () => { logout(); navigate("/login"); };

  const sidebarWidth = collapsed ? "w-[60px]" : "w-56";
  
 

  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-gray-100 font-sans">

      {/* ── MOBILE OVERLAY ──────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside className={`
        fixed z-50 inset-y-0 left-0 ${sidebarWidth}
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:static
        bg-white dark:bg-gray-900
        border-r border-gray-100 dark:border-gray-800
        flex flex-col transition-all duration-300 ease-in-out
        shadow-xl md:shadow-none
      `}>

        {/* Brand + collapse toggle */}
        <div className={`h-14 flex items-center border-b border-gray-100 dark:border-gray-800 flex-shrink-0
          ${collapsed ? "justify-center px-2" : "px-4 gap-3"}`}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden bg-white flex-shrink-0 shadow-md shadow-blue-600/20">
            {logo
              ? <img src={logo} alt="logo" className="w-full h-full object-contain p-0.5" />
              : <Zap size={14} className="text-white" fill="currentColor" />}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase tracking-tighter text-gray-900 dark:text-white truncate">
                {companyName}
              </p>
              <p className="text-[8px] font-bold text-blue-600 uppercase tracking-[0.2em]">CRM Alpha</p>
            </div>
          )}
          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed(p => !p)}
            className="hidden md:flex p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all flex-shrink-0"
            title={collapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}>
            <Menu size={14} />
          </button>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4
          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sections.map(section => (
            <SidebarSection
              key={section.title}
              title={section.title}
              items={section.items}
              collapsed={collapsed}
              openGroups={openGroups}
              onToggleGroup={toggleGroup}
              closeSidebar={closeSidebar}
            />
          ))}
        </nav>

        {/* Footer — status + copyright */}
        {!collapsed && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-[9px] font-semibold text-emerald-500 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              System Online
            </div>
            <p className="text-[9px] text-gray-400 dark:text-gray-600 font-medium mt-0.5">© 2026 CRM Alpha</p>
          </div>
        )}
      </aside>

      {/* ── MAIN COLUMN ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── TOPBAR ──────────────────────────────────────────────────── */}
<header className="h-14 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 flex items-center px-4 gap-3 z-[40] flex-shrink-0">


          {/* LEFT — mobile hamburger + page title */}
          <button onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all flex-shrink-0">
            <Menu size={18} />
          </button>
          <h1 className="text-sm font-bold text-gray-800 dark:text-gray-100 tracking-tight hidden sm:block">
            {pageTitle}
          </h1>

        

          {/* RIGHT — actions */}
          <div className="flex items-center gap-2 ml-auto">
<div className="flex-shrink-0">
      <AttendanceWidget />
    </div>
            {/* Dark mode toggle */}
            <button onClick={() => setDark(d => !d)}
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-all group flex-shrink-0">
              {dark
                ? <Moon  size={15} className="text-yellow-400 group-hover:rotate-12 transition-transform" />
                : <Sun   size={15} className="text-gray-500" />}
            </button>

            {/* Notification bell */}
            <div className="relative flex-shrink-0" ref={notifRef}>
              <button onClick={() => { setShowNotif(v => !v); setShowUser(false); }}
                className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-all relative">
                <Bell size={15} className="text-gray-500" />
                {totalNotif > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 border-2 border-white dark:border-gray-900">
                    {totalNotif > 99 ? "99+" : totalNotif}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {showNotif && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 z-50 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 dark:text-white">Action Centre</h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {totalNotif > 0 ? `${totalNotif} item${totalNotif !== 1 ? "s" : ""} need attention` : "All clear"}
                      </p>
                    </div>
                    <button onClick={() => setShowNotif(false)}
                      className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all">
                      <X size={14} />
                    </button>
                  </div>

                  <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                    {totalNotif === 0 ? (
                      <div className="py-8 text-center">
                        <CheckCircle className="mx-auto text-emerald-400 mb-2" size={28} />
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Pipeline is clear!</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">No pending actions right now.</p>
                      </div>
                    ) : (
                      <>
                        {notifData.newLeads > 0 && (
                          <NotifCard
                            icon={<UserPlus size={15} />} title="Unassigned Leads"
                            count={notifData.newLeads}
                            sub={`${notifData.newLeads} lead${notifData.newLeads !== 1 ? "s" : ""} awaiting assignment`}
                            bg="bg-emerald-50 dark:bg-emerald-900/10"
                            border="border-emerald-100 dark:border-emerald-900/30"
                            text="text-emerald-600 dark:text-emerald-400"
                            onClick={() => { navigate("/leads/new"); setShowNotif(false); }}
                          />
                        )}
                        {notifData.overdue > 0 && (
                          <NotifCard
                            icon={<AlertCircle size={15} />} title="Overdue Follow-ups"
                            count={notifData.overdue}
                            sub={`${notifData.overdue} action${notifData.overdue !== 1 ? "s" : ""} past due date`}
                            bg="bg-rose-50 dark:bg-rose-900/10"
                            border="border-rose-100 dark:border-rose-900/30"
                            text="text-rose-600 dark:text-rose-400"
                            onClick={() => { navigate("/followups"); setShowNotif(false); }}
                          />
                        )}
                        {notifData.today > 0 && (
                          <NotifCard
                            icon={<Calendar size={15} />} title="Due Today"
                            count={notifData.today}
                            sub={`${notifData.today} task${notifData.today !== 1 ? "s" : ""} scheduled for today`}
                            bg="bg-blue-50 dark:bg-blue-900/10"
                            border="border-blue-100 dark:border-blue-900/30"
                            text="text-blue-600 dark:text-blue-400"
                            onClick={() => { navigate("/followups"); setShowNotif(false); }}
                          />
                        )}
                      </>
                    )}
                  </div>

                  {/* Footer actions */}
                  <div className="px-3 pb-3 flex gap-2 border-t border-gray-100 dark:border-gray-800 pt-2">
                    <button onClick={() => { navigate("/audit-logs"); setShowNotif(false); }}
                      className="flex-1 py-2 text-[10px] font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                      View All Activity
                    </button>
                    <button onClick={() => setNotifData({ overdue: 0, today: 0, newLeads: 0 })}
                      className="flex-1 py-2 text-[10px] font-semibold text-blue-600 border border-blue-200 dark:border-blue-900/30 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all">
                      Mark All Read
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User dropdown */}
            <div className="relative flex-shrink-0" ref={userRef}>


              <button onClick={() => { setShowUser(v => !v); setShowNotif(false); }}
                className="flex items-center gap-2.5 pl-2.5 pr-1.5 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-all shadow-sm">
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="text-[11px] font-bold text-gray-900 dark:text-white truncate max-w-[100px]">
                    {user?.name || "User"}
                  </span>
                  <span className="text-[9px] font-semibold text-blue-600 uppercase tracking-wide">
                    {user?.role || "Member"}
                  </span>
                </div>
                <div className={`w-7 h-7 ${avatarColor(user?.name || "")} rounded-lg flex items-center justify-center text-white text-[11px] font-black shadow-sm flex-shrink-0`}>
                  {user?.name?.[0]?.toUpperCase() || "?"}
                </div>
              </button>

              {showUser && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden z-50">
                  {/* Profile info */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 ${avatarColor(user?.name || "")} rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0`}>
                        {user?.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{user?.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{user?.role} · #{user?.id}</p>
                      </div>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="p-1.5">
                    <button onClick={() => { navigate("/settings"); setShowUser(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all">
                      <UserCog size={14} className="text-blue-500 flex-shrink-0" />
                      My Profile
                    </button>
                    <button onClick={() => { navigate("/settings"); setShowUser(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all">
                      <Settings size={14} className="text-gray-400 flex-shrink-0" />
                      Settings
                    </button>
                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all">
                      <LogOut size={14} className="flex-shrink-0" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── PAGE CONTENT ────────────────────────────────────────────── */}
       <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#0f172a]">
  <div className="max-w-[1600px] mx-auto p-4 md:p-6">
    <Outlet />
  </div>
</main>
      </div>

      <ToastContainer />
    </div>
  );
}