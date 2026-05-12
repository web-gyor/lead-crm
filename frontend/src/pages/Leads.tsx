// src/pages/Leads.tsx
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Plus, Download, Search, Edit3, Trash2,
  Filter, Calendar, Clock, Globe, Phone, MessageCircle,
  X, ChevronDown, ChevronUp, Users, Zap, UserX,Target, Flame , Thermometer , Snowflake , TrendingDown , RefreshCw 
} from "lucide-react";
import { Toaster } from 'react-hot-toast';
import { apiGet, apiPost, apiPut, apiDelete } from "../utils/api";
import PaginationFooter from "../components/leads/PaginationFooter";
import DeleteModal from "../components/DeleteModal";
import ActivityLogsMini from "../components/ActivityLogsMini";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "all",            label: "All Leads"  },
  { value: "New",            label: "New"        },
  { value: "Contacted",      label: "Contacted"  },
  { value: "Interested",     label: "Interested" },
  { value: "Follow-up",      label: "Follow-up"  },
  { value: "Converted",      label: "Won"        },
  { value: "Lost",           label: "Lost"       },
  { value: "Not Interested", label: "Rejected"   },
] as const;

const STATUS_COLORS: Record<string, string> = {
  "New":            "bg-blue-100 text-blue-800 border-blue-200",
  "Contacted":      "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Interested":     "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Follow-up":      "bg-orange-100 text-orange-800 border-orange-200",
  "Converted":      "bg-green-100 text-green-800 border-green-200",
  "Lost":           "bg-red-100 text-red-800 border-red-200",
  "Not Interested": "bg-gray-100 text-gray-700 border-gray-200",
};

const SOURCE_COLORS: Record<string, string> = {
  // Direct Messaging
  "WHATSAPP":      "bg-green-50 text-green-700 border-green-200",
  
  // Organic/Inbound
  "WEBSITE":       "bg-indigo-50 text-indigo-700 border-indigo-200",
  "PHONE CALL":    "bg-sky-50 text-sky-700 border-sky-200",
  "WALK-IN":       "bg-amber-50 text-amber-700 border-amber-200",
  
  // Paid Ads (Stronger Colors)
  "META ADS":      "bg-blue-600 text-white border-blue-700",
  "FACEBOOK ADS":  "bg-blue-600 text-white border-blue-700", // Matches Meta
  "GOOGLE ADS":    "bg-emerald-600 text-white border-emerald-700",
  
  // Marketing & Others
  "SOCIAL":        "bg-pink-50 text-pink-700 border-pink-200",
  "REFERRAL":      "bg-purple-50 text-purple-700 border-purple-200",
  "BULK IMPORT":   "bg-slate-100 text-slate-600 border-slate-300",
  "UNKNOWN":       "bg-gray-100 text-gray-500 border-gray-200",
};
const QUALITY_CONFIG: Record<string, { label: string; icon: any; style: string }> = {
  hot: { label: "HOT", icon: <Flame size={12} className="fill-current" />, style: "bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:border-red-800/30 animate-pulse" },
  warm: { label: "WRM", icon: <Thermometer size={12} />, style: "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:border-orange-800/30" },
  cold: { label: "CLD", icon: <Snowflake size={12} />, style: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/30" },
  unverified: { label: "UNV", icon: <Search size={12} />, style: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700" },
  low: { label: "LOW", icon: <TrendingDown size={12} />, style: "bg-gray-50 text-gray-400 border-gray-200 dark:bg-gray-900/50 dark:border-gray-800" }
};

const RANGE_BTNS = [
  { id: "today",      label: "Today",      icon: <Zap size={11} />      },
  { id: "this_week",  label: "This Week",  icon: <Clock size={11} />     },
  { id: "this_month", label: "This Month", icon: <Calendar size={11} />  },
  { id: "this_year",  label: "This Year",  icon: <Calendar size={11} />  },
  { id: "all",        label: "All Time",   icon: <Globe size={11} />     },
] as const;

const FALLBACK_SOURCES = [
  { id: 1,  name: "WhatsApp"        },
  { id: 2,  name: "Phone Call"      },
  { id: 3,  name: "Walk-in"         },
  { id: 4,  name: "Website Inquiry" },
  { id: 5,  name: "Referral"        },
  { id: 6,  name: "Social Media"    },
  { id: 7,  name: "Meta Ads"        },
  { id: 8,  name: "Google Ads"      },
  { id: 9,  name: "Bulk Import"     },
  { id: 10, name: "Unknown"         },
];

const QUICK_ACTIONS = [
  { label: "Connected",     icon: <Phone size={10} />,        color: "bg-emerald-100 text-emerald-700", prefix: "Called"   },
  { label: "Not Reachable", icon: <Phone size={10} />,        color: "bg-red-50 text-red-600",          prefix: "Called"   },
  { label: "Switched Off",  icon: <Phone size={10} />,        color: "bg-gray-100 text-gray-600",       prefix: "Called"   },
  { label: "Wrong Number",  icon: <UserX size={10} />,        color: "bg-purple-100 text-purple-700",   prefix: "Tried"  },
  { label: "WA Sent",       icon: <MessageCircle size={10} />,color: "bg-green-100 text-green-700",     prefix: "WhatsApp" },
  { label: "Replied",       icon: <MessageCircle size={10} />,color: "bg-indigo-100 text-indigo-700",   prefix: "WhatsApp" },
  { label: "Budget Issue",  icon: <Zap size={10} />,          color: "bg-amber-100 text-amber-700",     prefix: "Feedback" },
  { label: "Not Urgent",    icon: <Clock size={10} />,        color: "bg-teal-100 text-teal-700",       prefix: "Timeline" },
  { label: "Location Issue",icon: <Globe size={10} />,        color: "bg-rose-100 text-rose-700",       prefix: "Feedback" },
  { label: "Parent Discuss",icon: <Users size={10} />,        color: "bg-purple-100 text-purple-700",   prefix: "Call/WA"  },
 
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: number;
  lead_uid?: string;
  full_name: string;
  parent_name?: string;
  phone?: string;
  email?: string;
  age?: number;
  gender?: string;
  city?: string;
  qualification?: string;
  year_of_passing?: string;
  parent_contact?: string;
  lead_source_id?: number;
  lead_source_name?: string;
  lead_status?: string;
  lead_quality?: string;
  interested_course?: string;
  counselor_remarks?: string;
  assigned_user_id?: number;
  assigned_user_name?: string;
  counselor_name?: string;        // from SQL JOIN — used by AssignedBadge
  next_follow_up_date?: string;
  first_contacted_at?: string;
  created_at?: string;
  updated_at?: string;
  status_updated_at?: string;
  whatsapp_same?: number | null;
  urgency?: string;
}

interface Filters {
  search: string;
  status: string;
  sourceId: string;   // ONLY THIS
  counselorId: string;
  quality: string;
  range: string;
  startDate: string;
  endDate: string;
}
// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function getRangeDates(range: string): { startDate: string; endDate: string } | null {
  if (range === "all" || range === "custom") return null;
  const today = new Date(); today.setHours(23, 59, 59, 999);
  const start = new Date(); start.setHours(0, 0, 0, 0);
  if (range === "this_week") {
    const day = start.getDay();
    start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
  } else if (range === "this_month") {
    start.setDate(1);
  } else if (range === "this_year") {
    start.setMonth(0, 1);
  }
  return { startDate: start.toISOString().split("T")[0], endDate: today.toISOString().split("T")[0] };
}

function getFollowUpStatus(dateStr?: string): "overdue" | "today" | "future" | null {

  if (!dateStr) return null;

  const today = new Date();
  today.setHours(0,0,0,0);

  const follow = new Date(dateStr);
  follow.setHours(0,0,0,0);

  if (follow.getTime() === today.getTime()) {
    return "today";
  }

  if (follow < today) {
    return "overdue";
  }

  return "future";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SourceBadge({ lead, sources }: { lead: Lead; sources: any[] }) {
  // 1. Try to find the source in the provided sources list (by ID)
  const src = sources.find((s) => Number(s.id) === Number(lead.lead_source_id));
  
  // 2. CHANGE THE PRIORITY: Check lead.source FIRST
 const name = (
  src?.name || 
  lead.lead_source_name || 
  "UNKNOWN"
).toUpperCase();

  // 3. Get the color class
  const cls = SOURCE_COLORS[name] ?? "bg-slate-50 text-slate-500 border-slate-200";

  return (
    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border shadow-sm ${cls}`}>
      {name}
    </span>
  );
}

function QualityBadge({ quality }: { quality?: string }) {
  if (!quality) return null;
  const cfg = QUALITY_CONFIG[quality.toLowerCase()] ?? QUALITY_CONFIG.unverified;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase border shadow-sm ${cfg.style}`}>
      <span className="text-[10px] leading-none">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const cls = STATUS_COLORS[status ?? ""] ?? "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${cls}`}>
      {status || "New"}
    </span>
  );
}

function AssignedBadge({ lead }: { lead: Lead }) {
  // Prefer the SQL JOIN counselor_name; fall back to assigned_user_name
  const name = lead.counselor_name || lead.assigned_user_name;
  if (!name) {
    return (
      <span className="text-[9px] font-black uppercase bg-orange-50 text-orange-500 rounded-full px-2 py-0.5 border border-orange-100">
        Unassigned
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
      {name}
    </span>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-0.5 ${className}`}>
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</label>
      {children}
    </div>
  );
}

const INPUT  = "w-full px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:border-blue-500 transition-all";
const SELECT = "w-full px-2 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:border-blue-500 transition-all";

const SELECT_CLS = "px-2 py-1.5 bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg text-xs outline-none hover:border-blue-400 cursor-pointer";



// ─── Main Component ───────────────────────────────────────────────────────────

export default function Leads() {
  const { status: urlStatus } = useParams<{ status?: string }>();

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!localStorage.getItem("token") || !localStorage.getItem("user")) {
      localStorage.clear();
      window.location.href = "/login";
    }
  }, []);

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin     = currentUser?.role?.toLowerCase() === "admin";

  // ── Core state ────────────────────────────────────────────────────────────
  const [leads,       setLeads]       = useState<Lead[]>([]);
  const [totalCount,  setTotalCount]  = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [loading,     setLoading]     = useState(false);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<Filters>({
    search: "", status: "", sourceId: "", counselorId: "", quality: "",
    range: "all", startDate: "", endDate: "",
  });
  const [debouncedSearch,   setDebouncedSearch]   = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // ── Dropdown data ─────────────────────────────────────────────────────────
  const [sourceOptions, setSourceOptions] = useState<any[]>([]);
  const [masterCourses, setMasterCourses] = useState<any[]>([]);
  // Counselors shown in the filter dropdown (counselor role only)
  const [counselors,    setCounselors]    = useState<any[]>([]);

  // ── Form state ────────────────────────────────────────────────────────────
  const [showForm,       setShowForm]       = useState(false);
  const [showEditForm,   setShowEditForm]   = useState(false);
  const [editingLead,    setEditingLead]    = useState<Lead | null>(null);
  const [editStatus,     setEditStatus]     = useState("New");
  const [selectedCourse, setSelectedCourse] = useState("");
const [editUrgency, setEditUrgency] = useState<string>("Normal");

  // ── Phone duplicate check ─────────────────────────────────────────────────
  const [phone,         setPhone]         = useState("");
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [duplicateLead, setDuplicateLead] = useState<any>(null);
const [allLeadsForExport, setAllLeadsForExport] = useState([]);
  // ── Delete ────────────────────────────────────────────────────────────────
  const [deleteId,      setDeleteId]   = useState<number | null>(null);
  const [isDeleting,    setIsDeleting] = useState(false);
const [editWhatsappSame, setEditWhatsappSame] = useState(false);
  // ── Bulk select ───────────────────────────────────────────────────────────
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);

  // ── Notification polling ──────────────────────────────────────────────────
  const newLeadCountRef = useRef(0);
  const isFirstLoad     = useRef(true);
const [stats, setStats] = useState<any>({});
const k = stats || {};

  // ── Debounce search ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(filters.search); setCurrentPage(1); }, 500);
    return () => clearTimeout(t);
  }, [filters.search]);

  // ── Load dropdowns (sources + courses) ───────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [c1, c2, s1, s2] = await Promise.all([
          apiGet("/api/leads/masters/courses").catch(() => []),
          apiGet("/api/courses").catch(() => []),
          apiGet("/api/leads/masters/sources").catch(() => []),
          apiGet("/api/lead-sources").catch(() => []),
        ]);
        setMasterCourses(Array.isArray(c1) && c1.length ? c1 : Array.isArray(c2) ? c2 : []);
        const apiSrc = Array.isArray(s1) && s1.length ? s1 : Array.isArray(s2) && s2.length ? s2 : [];
        setSourceOptions(apiSrc.length > 0 ? apiSrc : FALLBACK_SOURCES);
      } catch {
        setSourceOptions(FALLBACK_SOURCES);
      }
    };
    load();
  }, []);

  // ── Load counselors for filter dropdown ───────────────────────────────────
  useEffect(() => {
    apiGet("/api/users")
      .then((res) => {
        const users = Array.isArray(res) ? res : (res?.data ?? []);
        setCounselors(users.filter((u: any) => u.role?.toLowerCase() === "counselor"));
      })
      .catch(() => {});
  }, []);



  
  // ── Notification poll ─────────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const res   = await apiGet("/api/leads?status=New&limit=1");
        const count = res?.pagination?.totalItems ?? 0;
        if (!isFirstLoad.current && count > newLeadCountRef.current) {
          const diff = count - newLeadCountRef.current;
          if (Notification.permission === "granted") {
            new Notification("New Lead Alert", {
              body: `${diff} new student(s) added to the system.`,
              icon: "/logo.png",
            });
          }
        }
        newLeadCountRef.current = count;
        isFirstLoad.current = false;
      } catch { /* non-critical */ }
    };
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, []);

  // ── Load leads ────────────────────────────────────────────────────────────
  const loadData = useCallback(async (silent = false) => {
  if (!silent) setLoading(true);

  try {
    const params: Record<string, string> = {
      page: String(currentPage),
      limit: String(rowsPerPage),
      search: debouncedSearch,
      status: filters.status === "all" ? "" : (filters.status || ""),
    };

    if (filters.sourceId) params.source_id = filters.sourceId;
    if (filters.quality) params.quality = filters.quality;
    if (filters.counselorId) params.assigned_user_id = filters.counselorId;

    const dates =
      filters.range === "custom"
        ? { startDate: filters.startDate, endDate: filters.endDate }
        : getRangeDates(filters.range);

    if (dates?.startDate) params.startDate = dates.startDate;
    if (dates?.endDate) params.endDate = dates.endDate;

    const res = await apiGet(`/api/leads?${new URLSearchParams(params)}`);

    if (res) {
      setLeads(res.data ?? []);
      setTotalCount(res.pagination?.totalItems ?? 0);
      setTotalPages(res.pagination?.totalPages ?? 1);
      fetchSummary();
    }
  } catch {
    toast.error("Failed to load leads");
  } finally {
    if (!silent) setLoading(false);
  }
}, [currentPage, rowsPerPage, debouncedSearch, filters]);
  const fetchSummary = useCallback(async () => {
  try {
    const res = await apiGet("/api/leads/dashboard-data");
    if (res) {
      setStats({
        ...res,
        conversionRate: res.conversionRate || 
          (res.statusStats?.converted && res.totalLeads 
            ? Math.round((res.statusStats.converted / res.totalLeads) * 100) 
            : 0),
      });
    }
  } catch (err) {
    console.error("Failed to fetch summary:", err);
  }
}, []);

useEffect(() => {

  loadData();

  const interval = setInterval(() => {
    loadData(true);
  
  }, 30000);

  return () => clearInterval(interval);

}, [loadData]);



  // ── Filter helpers ────────────────────────────────────────────────────────
  const normalize = (v: any) =>
  String(v || "")
    .toLowerCase()
    .trim();

const filteredLeads = useMemo(() => {
  return leads.filter((l) => {
    const search = normalize(filters.search);

    // if no search, keep all
    if (!search) return true;

    const match =
      normalize(l.id).includes(search) ||
      normalize(l.full_name).includes(search) ||
      normalize(l.phone).includes(search);

    return match;
  });
}, [leads, filters.search]);

  // ✅ SINGLE SOURCE OF TRUTH: KPI DATA
const kpiStats = useMemo(() => {
  return {
    total: totalCount,
    highIntent: Number(k?.highIntentLeads || 0),
    followUp: Number(k?.pendingFollowUps || 0),
    conversionRate: k?.conversionRate || 0,
  };
}, [
  totalCount,
  k?.highIntentLeads,
  k?.pendingFollowUps,
  k?.conversionRate,
]);

const handleStatusChange = async (leadId: number, newStatus: string) => {
  try {
    await apiPut(`/api/leads/${leadId}`, {
      lead_status: newStatus,
    });

    toast.success("Status updated");

    // reset UI state first
    setCurrentPage(1);

    // force full reload (no stale cache)
    await loadData(true);

  } catch (err) {
    toast.error("Failed to update");
    console.error(err); // Good to keep for debugging
  }
};

  const updateFilters = (patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setFilters({
      search: "", status: "", sourceId: "", counselorId: "", quality: "",
      range: "all", startDate: "", endDate: "",
    });
    setCurrentPage(1);
  };

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    (filters.status !== "" && filters.status !== "all") ||
    filters.sourceId !== "" ||
    filters.counselorId !== "" ||
    filters.quality !== "" ||
    (filters.range !== "all" && filters.range !== "") ||
    filters.startDate !== "" ||
    filters.endDate !== "";

  const activeRangeId = (filters.startDate || filters.endDate) ? "custom" : filters.range;

  // ── Phone duplicate check ─────────────────────────────────────────────────
  const handlePhoneChange = async (val: string) => {
    setPhone(val);
    setDuplicateLead(null);
    if (val.replace(/\D/g, "").length === 10) {
      setCheckingPhone(true);
      try {
        const res = await apiGet(`/api/leads/check-duplicate?phone=${val}`);
        if (res?.exists) { setDuplicateLead(res.lead); toast.error(`Existing lead: ${res.lead.full_name}`, { duration: 4000 }); }
      } catch { /* silent */ } finally { setCheckingPhone(false); }
    }
  };

  // ── Submit: Add Lead ──────────────────────────────────────────────────────
 const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  const fd = new FormData(e.currentTarget);
  const raw = Object.fromEntries(fd.entries()) as Record<string, string>;

  // ✅ ALWAYS read directly (NOT from raw)
const whatsappSame = Boolean(fd.get("whatsapp_same"));
  const urgencyValue = (fd.get("urgency") as string) || "Just inquiring";

  const finalCourse =
    raw.interested_treatment === "Other"
      ? raw.custom_course_name
      : raw.interested_treatment;

  if (!finalCourse || finalCourse === "Other") {
    toast.error("Please type the manual course name");
    return;
  }

  // Phone validation
  const cleanPhone = (raw.phone || "").replace(/\D/g, "");
  const indianPhoneRegex = /^[6-9]\d{9}$/;

  if (!indianPhoneRegex.test(cleanPhone)) {
    toast.error("Please enter a valid 10-digit Indian mobile number");
    return;
  }

  try {
    // 🧪 DEBUG (keep this once)
    console.log("FD whatsapp:", fd.get("whatsapp_same"));
    console.log("FD urgency:", fd.get("urgency"));

    await apiPost("/api/leads", {
      full_name: raw.full_name?.trim(),
      phone: cleanPhone,

      // ✅ FIXED (CRITICAL)
      whatsapp_same: whatsappSame ? 1 : 0,

      email: raw.email?.toLowerCase().trim() || null,
      age: raw.age ? Number(raw.age) : null,
      gender: raw.gender || null,
      city: raw.city || "Calicut",
      qualification: raw.qualification || null,
      year_of_passing: raw.year_of_passing || null,
      parent_name: raw.parent_name || null,
      parent_contact: raw.parent_contact || null,
      lead_source_id: raw.lead_source_id ? Number(raw.lead_source_id) : 10,

      // ✅ FIXED (CRITICAL)
      urgency: urgencyValue,

      interested_course: finalCourse.trim(),
      counselor_remarks: raw.counselor_remarks || "Added via Manual Entry",
      lead_status: "New",
    });

    setShowForm(false);
    setPhone("");
    setDuplicateLead(null);
    setSelectedCourse("");
    loadData(true);

    toast.success("Lead registered successfully");
  } catch (err: any) {
    toast.error(err?.response?.data?.error || "Error saving lead");
  }
};

  // ── Submit: Edit Lead ─────────────────────────────────────────────────────
 const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (!editingLead) return;

  const fd = new FormData(e.currentTarget);
  const raw = Object.fromEntries(fd.entries()) as Record<string, any>;

  try {
    // Construct a CLEAN object
const payload = {
  ...raw,

  lead_status: editStatus,

  status_updated_at:
    editStatus !== editingLead.lead_status
      ? new Date().toISOString()
      : editingLead.status_updated_at,

  urgency: editUrgency,

  whatsapp_same: Boolean(fd.get("whatsapp_same")) ? 1 : 0,

  next_follow_up_date:
    editStatus.toLowerCase().includes("follow")
      ? (followUpDate || null)
      : null,

  age: raw.age ? Number(raw.age) : null,

  year_of_passing:
    raw.year_of_passing
      ? Number(raw.year_of_passing)
      : null
};

    await apiPut(`/api/leads/${editingLead.id}`, payload);

    setShowEditForm(false); 
    loadData(true);
    toast.success("Lead profile updated");
  } catch (err: any) { 
    // This will trigger if the network is actually down
    toast.error("Network error: Failed to connect to server"); 
  }
};
const handleEditClick = (lead: Lead) => {
  console.log("Full Lead Data:", lead); // Check if the date field is here
  
  setEditingLead(lead);
  setEditStatus(lead.lead_status || "New");

  // Try every possible variation of the date key name
const rawDate = lead.next_follow_up_date || (lead as any).follow_up_date;
  
  console.log("Extracted rawDate:", rawDate); // If this is null/undefined, your state will stay empty

  if (rawDate) {
    const dateObj = new Date(rawDate);
    // Ensure the date is valid before formatting
    if (!isNaN(dateObj.getTime())) {
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const formatted = `${yyyy}-${mm}-${dd}`;
      console.log("Setting State To:", formatted);
      setFollowUpDate(formatted);
    }
  } else {
    setFollowUpDate("");
  }

  setShowEditForm(true);
};

// ✅ CORRECT — state declared first, effect once after
const [followUpDate, setFollowUpDate] = useState<string>(() => {
  // Access the primary property first
  const raw = editingLead?.next_follow_up_date 
           || (editingLead as any)?.next_followup_date // Use 'as any' to bypass the error
           || (editingLead as any)?.follow_up_date 
           || "";

  if (!raw) return "";
  
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";

  // Return formatted YYYY-MM-DD
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
});


useEffect(() => {
  if (editingLead && showEditForm) {
    // 1. Set Urgency immediately
    setEditUrgency(editingLead.urgency || "Just inquiring");

    // 2. Set WhatsApp state (if you use it for logic, otherwise defaultChecked is fine)
    setEditWhatsappSame(Number(editingLead.whatsapp_same) === 1);

    // 3. Set Status
    setEditStatus(editingLead.lead_status || "New");

    // 4. Handle Date
    const rawDate = editingLead.next_follow_up_date || (editingLead as any).next_followup_date;

if (rawDate) {
  const d = new Date(rawDate);
  setFollowUpDate(!isNaN(d.getTime()) ? d.toISOString().split('T')[0] : "");
} else {
  setFollowUpDate("");
}
  }
}, [editingLead, showEditForm]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await apiDelete(`/api/leads/${deleteId}`);
      setLeads((prev) => prev.filter((l) => l.id !== deleteId));
      setTotalCount((prev) => prev - 1);
      setDeleteId(null); toast.success("Lead removed");
    } catch (err: any) {
      if (err?.name === "SyntaxError" || err?.message?.includes("Unexpected token")) {
        setLeads((prev) => prev.filter((l) => l.id !== deleteId));
        setDeleteId(null);
      } else { toast.error(`Delete failed: ${err?.message ?? "Server error"}`); }
    } finally { setIsDeleting(false); }
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const fetchAllLeadsForExport = async () => {
  const res = await apiGet(`/api/leads?limit=10000&page=1`);
  return res?.data || [];
};
const handleExport = async () => {
  const allLeads = await fetchAllLeadsForExport();

  const headers = [
    "ID", "Date Joined", "Student Name", "Parent Name",
    "Contact", "Course", "Source", "Status",
    "Priority", "Next Follow-up", "Latest Remarks"
  ];

  const csvContent = [
    headers.join(","),
    ...allLeads.map((l) => {
      const clean = (val: any) =>
        `"${String(val || "").replace(/"/g, '""').replace(/\n/g, ' ')}"`;

      return [
        l.id,
        l.created_at ? new Date(l.created_at).toLocaleDateString('en-IN') : "",
        clean(l.full_name),
        clean(l.parent_name),
        l.phone,
        clean(l.interested_course),
          clean(l.source_name ?? l.lead_source_name ?? "Direct"),
        clean(l.lead_status),
        clean(l.urgency || "Normal"),
        l.next_follow_up_date
          ? new Date(l.next_follow_up_date).toLocaleDateString('en-IN')
          : "N/A",
        clean(l.counselor_remarks),
      ].join(",");
    }),
  ].join("\n");

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `LeadTracker_Export_${new Date()
    .toISOString()
    .split("T")[0]}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

  // ── Bulk delete ───────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (!selectedLeads.length) return;
    if (!window.confirm(`Permanently delete ${selectedLeads.length} leads?`)) return;
    try {
      const res = await apiPost("/api/leads/bulk-delete", { ids: selectedLeads });
      if (res?.success) { toast.success(`${selectedLeads.length} leads deleted`); setSelectedLeads([]); loadData(); }
      else toast.error(res?.message ?? "Bulk delete failed");
    } catch (err: any) { toast.error(err?.message ?? "Bulk delete error"); }
  };

  // ── Quick-action remark stamp ─────────────────────────────────────────────
  const stampRemark = (prefix: string, label: string) => {
    const area = document.getElementById("counselor_remarks_area") as HTMLTextAreaElement | null;
    if (!area) return;
    const ts = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    area.value = `${ts}: ${prefix} - ${label}.\n${area.value}`;
  };

  const isFollowUpStatus =
  editStatus === "Follow-up";

  // ── Counselor select (reused in both desktop + mobile) ────────────────────
  const CounselorSelect = ({ full = false }: { full?: boolean }) => (
    <select
      value={filters.counselorId}
      onChange={(e) => updateFilters({ counselorId: e.target.value })}
      className={`${SELECT_CLS} ${full ? "w-full" : ""}`}
    >
      <option value="">All Counselors</option>
      <option value="unassigned">Unassigned</option>
      {counselors.map((c: any) => (
        <option key={c.id} value={String(c.id)}>{c.name}</option>
      ))}
    </select>
  );

// ── SINGLE SOURCE OF TRUTH: KPI DATA ──────────────────────────────────────────



  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-5">
<Toaster position="top-right" reverseOrder={false} />
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
              <Users size={16} className="text-white" />
            </span>
            Leads Tracker
          </h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-0.5 flex items-center gap-2">
            Conversion Funnel
            {hasActiveFilters && <span className="text-orange-500">· Filters active</span>}
          </p>
        </div>
       <div className="flex items-center gap-2">
        {/* Refresh Button */}
       <button
          type="button"
          onClick={() => loadData()}
          disabled={loading}
          className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-all shadow-sm disabled:opacity-50"
        >
          {/* Explicitly check that RefreshCw is used here */}
          <RefreshCw 
            size={16} 
            className={`${loading ? "animate-spin text-blue-500" : ""}`} 
          />
        </button>
    

        {/* Export Button (Admin Only) */}
        {isAdmin && (
          <button 
            type="button" 
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 border border-blue-100 dark:border-blue-900/30 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all shadow-sm"
          >
            <Download size={14} />
            <span className="hidden sm:inline text-[11px] uppercase tracking-wider">Export</span>
            <span className="sm:hidden">CSV</span>
          </button>
        )}

        {/* Add Lead Button */}
        <button 
          type="button"
          onClick={() => { setSelectedCourse(""); setPhone(""); setDuplicateLead(null); setShowForm(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-blue-200 dark:shadow-none text-xs sm:text-sm transition-all active:scale-95"
        >
          <Users size={14} />
          <span className="hidden sm:inline">Add Lead</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>
      </div>

{/* KPI GRID - 2 Columns on Mobile, 4 on Desktop (Updated with correct k values) */}
<div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-1">
  {[
    { label: "Total Leads", val: k.totalLeads || 0, sub: `+${k.newToday || 0} Today`, icon: <Users size={14} className="text-blue-600"/>, bg: "bg-blue-50" },
    { label: "High Intent", val: k.highIntentLeads || 0, sub: "Action Required", icon: <Zap size={14} className="text-orange-500"/>, bg: "bg-orange-50" },
    { label: "Follow-ups", val: k.pendingFollowUps || 0, sub: "Scheduled", icon: <Clock size={14} className="text-purple-500"/>, bg: "bg-purple-50" },
    { label: "Conversion", val: `${k.conversionRate || 0}%`, sub: "Success Rate", icon: <Target size={14} className="text-emerald-500"/>, bg: "bg-emerald-50" },
  ].map((item, i) => (
    <div key={i} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl p-2 sm:p-3 shadow-sm flex items-center gap-2 sm:gap-3">
      <div className={`w-7 h-7 sm:w-10 sm:h-10 shrink-0 rounded-lg ${item.bg} flex items-center justify-center`}>{item.icon}</div>
      <div className="min-w-0">
        <p className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase leading-none">{item.label}</p>
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-0 sm:gap-2 mt-0.5">
          <h3 className="text-sm sm:text-xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter">
            {loading ? "—" : item.val}
          </h3>
          <p className="text-[7px] sm:text-[9px] font-bold text-gray-500 uppercase truncate">{item.sub}</p>
        </div>
      </div>
    </div>



  ))}
</div>


      {/* ── Filter Panel ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">

        {/* Mobile top bar */}
        <div className="flex items-center gap-2 p-3 sm:hidden">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input type="text" placeholder="Search by name, phone or ID…" value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none" />
          </div>
          <button type="button" onClick={() => setShowMobileFilters((v) => !v)}
            className={`relative flex items-center gap-1 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
              showMobileFilters || hasActiveFilters
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:border-gray-600"
            }`}>
            <Filter size={13} />
            {showMobileFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {hasActiveFilters && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-orange-500 text-white text-[8px] font-black flex items-center justify-center">!</span>
            )}
          </button>
        </div>

        {/* Mobile expanded filters */}
        {showMobileFilters && (
          <div className="sm:hidden px-3 pb-4 pt-3 space-y-3 border-t border-gray-100 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Status</p>
                <select value={filters.status} onChange={(e) => updateFilters({ status: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white text-xs outline-none">
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Source</p>
                <select value={filters.sourceId} onChange={(e) => updateFilters({ sourceId: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white text-xs outline-none">
                  <option value="">All Sources</option>
                  {sourceOptions.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                </select>
              </div>
              {/* Counselor — full-width on mobile */}
              <div className="col-span-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Counselor</p>
                <CounselorSelect full />
              </div>
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Time Range</p>
              <div className="flex flex-wrap gap-1.5">
                {RANGE_BTNS.map((r) => (
                  <button key={r.id} type="button"
                    onClick={() => updateFilters({ range: r.id, startDate: "", endDate: "" })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                      activeRangeId === r.id
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"
                    }`}>
                    {r.icon} {r.label}
                  </button>
                ))}
              </div>
            </div>

          <div>
  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Custom Date Range</p>
  <div className="flex items-center gap-2">
    {/* Start Date */}
    <input 
      type={filters.startDate ? "date" : "text"} 
      onFocus={(e) => (e.target.type = "date")}
      onBlur={(e) => !filters.startDate && (e.target.type = "text")}
      placeholder="DD-MM-YYYY"
      value={filters.startDate}
      onChange={(e) => updateFilters({ range: "custom", startDate: e.target.value })}
      className="flex-1 px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-[11px] bg-gray-50 dark:bg-gray-700 dark:text-white outline-none" 
    />

    <span className="text-gray-400 text-[10px] font-bold">TO</span>

    {/* End Date */}
    <input 
      type={filters.endDate ? "date" : "text"}
      onFocus={(e) => (e.target.type = "date")}
      onBlur={(e) => !filters.endDate && (e.target.type = "text")}
      placeholder="DD-MM-YYYY"
      value={filters.endDate}
      onChange={(e) => updateFilters({ range: "custom", endDate: e.target.value })}
      className="flex-1 px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-[11px] bg-gray-50 dark:bg-gray-700 dark:text-white outline-none" 
    />

    {(filters.startDate || filters.endDate) && (
      <button type="button" onClick={() => updateFilters({ range: "all", startDate: "", endDate: "" })}
        className="p-1.5 hover:bg-red-100 rounded-lg text-red-400"><X size={13} /></button>
    )}
  </div>
</div>

            {hasActiveFilters && (
              <button type="button" onClick={clearAllFilters}
                className="w-full py-2 text-[10px] font-black uppercase text-red-500 border border-red-200 bg-red-50 rounded-xl hover:bg-red-100 transition-all">
                ✕ Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Desktop filter bar */}
     <div className="hidden sm:flex flex-wrap items-center gap-1.5 px-4 py-2 mb-0 w-full overflow-x-auto scrollbar-hide">
          <div className="relative w-full sm:w-48 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input type="text" placeholder="Search name, phone or ID…" value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Status */}
          <select value={filters.status} onChange={(e) => updateFilters({ status: e.target.value })} className={SELECT_CLS}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Source */}
          <select value={filters.sourceId} onChange={(e) => updateFilters({ sourceId: e.target.value })} className={SELECT_CLS}>
            <option value="">All Sources</option>
            {sourceOptions.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
          </select>

          {/* Counselor — inline in the desktop bar */}
          <CounselorSelect />

          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 shrink-0" />

          {RANGE_BTNS.map((r) => (
            <button key={r.id} type="button"
              onClick={() => updateFilters({ range: r.id, startDate: "", endDate: "" })}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all shrink-0 ${
                activeRangeId === r.id
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                  : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"
              }`}>
              <span className={activeRangeId === r.id ? "text-white" : "text-blue-500"}>{r.icon}</span>
              {r.label}
            </button>
          ))}

          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border min-w-[220px] ${
            filters.startDate || filters.endDate ? "bg-blue-50 border-blue-300" : "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"
          }`}>
            <Calendar size={12} className="text-gray-400 shrink-0" />
            <input type="date" value={filters.startDate}
              onChange={(e) => updateFilters({ range: "custom", startDate: e.target.value })}
              className="bg-transparent text-[11px] font-bold text-gray-700 dark:text-gray-300 outline-none w-[85px]" />
            <span className="text-gray-400 text-[10px]">–</span>
            <input type="date" value={filters.endDate}
              onChange={(e) => updateFilters({ range: "custom", endDate: e.target.value })}
              className="bg-transparent text-[11px] font-bold text-gray-700 dark:text-gray-300 outline-none w-[85px]" />
            {(filters.startDate || filters.endDate) && (
              <button type="button" onClick={() => updateFilters({ range: "all", startDate: "", endDate: "" })}
                className="text-red-400 hover:text-red-600"><X size={12} /></button>
            )}
          </div>

          {hasActiveFilters && (
            <button type="button" onClick={clearAllFilters}
              className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-all shrink-0">
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════
          DESKTOP TABLE
      ════════════════════════════════════ */}
     <div className="hidden sm:block -mt-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {["#", "ID", "Date", "Name", "Course", "Contact",  "Source", "Status", "Quality", "Last Update", "Assigned", "Notes", "Actions"].map((h) => (
                  <th key={h} className={`px-3 py-3 font-medium whitespace-nowrap ${h === "Actions" ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={14} className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">📡 Loading leads…</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={14} className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">📭 No leads found</td></tr>
              ) : (
                leads.map((lead, i) => {
                  const fuStatus = getFollowUpStatus(lead.next_follow_up_date);
                  return (
                    <tr key={lead.id} className={`group transition-colors hover:bg-blue-50/30 dark:hover:bg-gray-700/20 ${
                      fuStatus === "overdue" ? "bg-rose-50/60 dark:bg-rose-900/10"
                      : fuStatus === "today" ? "bg-blue-50/60 dark:bg-blue-900/10" : ""
                    }`}>
                      <td className="px-3 py-2 text-center"><span className="text-[11px] text-gray-400 tabular-nums">{(currentPage - 1) * rowsPerPage + i + 1}</span></td>
                      <td className="px-3 py-2 whitespace-nowrap">
  <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800 tracking-wider">
    {/* This forces the L26-0000 format regardless of what is in the UID column */}
    {`L26-${String(lead.id).padStart(4, "0")}`}
  </span>
</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">
                          {lead.created_at ? new Date(lead.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </p>
                        {lead.status_updated_at && (
  <p className="text-[10px] text-gray-500 dark:text-gray-400">
    Status Updated:
    {new Date(lead.status_updated_at).toLocaleString("en-GB")}
  </p>
)}
                        <p className="text-[8px] text-gray-400 uppercase">Entry</p>
                      </td>
                     <td className="px-3 py-2 max-w-[140px]">
  {/* Primary Name */}
  <p className="text-[12px] font-bold text-gray-900 dark:text-white truncate">
    {lead.full_name || "N/A"}
  </p>

  {/* Sub-text: Parent Name */}
  {lead.parent_name && (
    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
      👤 {lead.parent_name}
    </p>
  )}
</td>
                      <td className="px-3 py-2 max-w-[110px]"><span className="text-[10px] text-gray-600 dark:text-gray-300 truncate block">{lead.interested_course || "General"}</span></td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex flex-col leading-tight">
                          {/* Phone Number */}
                          <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 tabular-nums">
                            {lead.phone ? (lead.phone.startsWith("+") ? lead.phone : `+91 ${lead.phone}`) : "—"}
                          </span>
                          
                          {/* City Sub-text */}
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium  tracking-wider">
                            {lead.city || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2  whitespace-nowrap"><SourceBadge lead={lead} sources={sourceOptions} /></td>
                      <td className="px-3 py-2 whitespace-nowrap"><StatusBadge status={lead.lead_status} /></td>
                      <td className="px-3 py-2 whitespace-nowrap text-center"><QualityBadge quality={lead.lead_quality} /></td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <p className={`text-[10px] font-black ${fuStatus === "overdue" ? "text-rose-600" : fuStatus === "today" ? "text-blue-600" : "text-gray-700 dark:text-gray-300"}`}>
                          {lead.next_follow_up_date
                            ? new Date(lead.next_follow_up_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
                            : lead.first_contacted_at
                            ? new Date(lead.first_contacted_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
                            : "No action"}
                        </p>
                        <p className={`text-[8px] uppercase font-black tracking-tighter ${fuStatus === "overdue" ? "text-rose-500" : fuStatus === "today" ? "text-blue-500" : "text-gray-400"}`}>
                          {fuStatus === "overdue" ? "⚠️ Overdue" : fuStatus === "today" ? "📅 Due Today" : fuStatus === "future" ? "Scheduled" : "—"}
                        </p>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap"><AssignedBadge lead={lead} /></td>
                      <td className="px-3 py-2 max-w-[100px]"><span className="text-[11px] text-gray-400 italic truncate block">{lead.counselor_remarks || "—"}</span></td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <div className="flex justify-end items-center gap-1.5">
                          <button type="button" aria-label="Edit"
                            onClick={() => { setEditingLead(lead); setEditStatus(lead.lead_status || "New"); setFollowUpDate(lead.next_follow_up_date || todayISO()); setShowEditForm(true); }}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"><Edit3 size={13} /></button>
                          {isAdmin && (
                            <button type="button" aria-label="Delete" onClick={() => setDeleteId(lead.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"><Trash2 size={13} /></button>
                          )}
                          <div className="flex items-center gap-1 ml-0.5 pl-1.5 border-l border-gray-200 dark:border-gray-700">
                            <a href={`tel:${lead.phone}`} aria-label="Call" className="p-1 text-gray-400 hover:text-blue-600 transition-colors"><Phone size={12} /></a>
                            <a href={`https://wa.me/91${lead.phone?.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="p-1 text-gray-400 hover:text-emerald-500 transition-colors"><MessageCircle size={12} /></a>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <PaginationFooter currentPage={currentPage} totalPages={totalPages} totalCount={totalCount} rowsPerPage={rowsPerPage} setRowsPerPage={setRowsPerPage} setCurrentPage={setCurrentPage} />
      </div>

      {/* ════════════════════════════════════
          MOBILE CARDS
      ════════════════════════════════════ */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">📡 Loading leads…</div>
        ) : leads.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">📭 No leads found</div>
        ) : (
          <>
            {leads.map((lead, i) => {
              const fuStatus = getFollowUpStatus(lead.next_follow_up_date);
              return (
                <div key={lead.id} className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden ${
                  fuStatus === "overdue" ? "border-rose-200 dark:border-rose-800"
                  : fuStatus === "today" ? "border-blue-200 dark:border-blue-800"
                  : "border-gray-200 dark:border-gray-700"
                }`}>
                  <div className="flex items-start justify-between p-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 font-black text-xs shrink-0">
                        {(currentPage - 1) * rowsPerPage + i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{lead.full_name || "N/A"}</p>
                        <p className="text-[10px] text-gray-500 truncate">{lead.interested_course || "General Enquiry"}</p>
                      </div>
                    </div>
                    <div className="shrink-0 ml-2"><StatusBadge status={lead.lead_status} /></div>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Phone</p>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300 tabular-nums">
                        {lead.phone ? (lead.phone.startsWith("+") ? lead.phone : `+91 ${lead.phone}`) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">City</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{lead.city || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Source</p>
                      <SourceBadge lead={lead} sources={sourceOptions} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Enquiry Date</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString("en-GB") : "—"}
                      </p>
                      {lead.status_updated_at && (
  <p className="text-[10px] text-gray-500 dark:text-gray-400">
    Status Updated:
    {new Date(lead.status_updated_at).toLocaleString("en-GB")}
  </p>
)}
                    </div>
                    {lead.next_follow_up_date && (
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Follow-up</p>
                        <p className={`text-xs font-bold ${fuStatus === "overdue" ? "text-rose-600" : fuStatus === "today" ? "text-blue-600" : "text-gray-700"}`}>
                          {new Date(lead.next_follow_up_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                          {fuStatus === "overdue" && " ⚠️"}
                          {fuStatus === "today"   && " 📅"}
                        </p>
                      </div>
                    )}
                    <div className={lead.next_follow_up_date ? "" : "col-span-2"}>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Assigned</p>
                      <div className="mt-0.5"><AssignedBadge lead={lead} /></div>
                    </div>
                    {lead.counselor_remarks && (
                      <div className="col-span-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Notes</p>
                        <p className="text-[11px] text-gray-500 italic truncate">{lead.counselor_remarks}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600"><Phone size={12} /> Call</a>
                      <a href={`https://wa.me/91${lead.phone?.replace(/\D/g, "")}?text=Hi ${encodeURIComponent(lead.full_name || "")}`}
                        target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[11px] font-bold text-green-600"><MessageCircle size={12} /> WhatsApp</a>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" aria-label="Edit"
                        onClick={() => { setEditingLead(lead); setEditStatus(lead.lead_status || "New"); setFollowUpDate(lead.next_follow_up_date || todayISO()); setShowEditForm(true); }}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit3 size={14} /></button>
                      {isAdmin && (
                        <button type="button" aria-label="Delete" onClick={() => setDeleteId(lead.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <PaginationFooter currentPage={currentPage} totalPages={totalPages} totalCount={totalCount} rowsPerPage={rowsPerPage} setRowsPerPage={setRowsPerPage} setCurrentPage={setCurrentPage} mobile />
          </>
        )}
      </div>

      {/* ════════════════════════════════════
          ADD LEAD MODAL
      ════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 sm:rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full sm:max-w-2xl max-h-[95vh] overflow-hidden flex flex-col rounded-t-2xl">
            <div className="sm:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" /></div>
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/30 dark:bg-gray-800/30">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                <h2 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">Register New Student</h2>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="p-1.5 rounded-md hover:bg-red-50 hover:text-red-500 text-gray-400 transition-all"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="Full Name *" className="col-span-2"><input required name="full_name" placeholder="Enter full name" className={INPUT} /></Field>
                <Field label="Age"><input type="number" name="age" placeholder="Age" className={INPUT} inputMode="numeric" /></Field>
                <Field label="Gender">
                  <select name="gender" className={SELECT}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Phone *">
                  <div className="space-y-1">
                    {duplicateLead && (
                      <p className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 animate-pulse uppercase">
                        ⚠️ Already exists: {duplicateLead.full_name}
                      </p>
                    )}
                    <div className="flex gap-2">
                                        
                    <div className="relative flex-1">
                      <input 
                        required 
                        type="tel" 
                        name="phone" 
                        placeholder="10-digit mobile number" 
                        value={phone}
                        // Limit to 10 characters at the UI level
                        maxLength={10}
                        // Browser-level validation for 10 digits starting with 6-9
                        pattern="[6-9][0-9]{9}"
                        onChange={(e) => {
                          // Only allow numeric input (prevents dots, plus, etc.)
                          const val = e.target.value.replace(/\D/g, "");
                          handlePhoneChange(val);
                        }} 
                        inputMode="tel"
                        className={`${INPUT} pr-8 ${
                          duplicateLead ? "border-rose-500 ring-2 ring-rose-500/10" : ""
                        }`} 
                      />
                      {checkingPhone && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                     <label className="flex items-center gap-1.5 px-2 border rounded bg-gray-50 dark:bg-gray-800 cursor-pointer shrink-0 border-gray-300 dark:border-gray-700">
                        <input 
                        type="checkbox" 
                        name="whatsapp_same"
                        value="1"          // 🔥 THIS WAS MISSING → ROOT CAUSE
                        defaultChecked
                      />
                      <span className="text-[10px] font-black text-green-600 uppercase">WA</span>
                    </label>
                    </div>
                  </div>
                </Field>
                <Field label="Email"><input type="email" name="email" placeholder="email@example.com" className={INPUT} inputMode="email" /></Field>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-gray-50 dark:bg-gray-800/20 rounded-lg border border-gray-200 dark:border-gray-700">
                <Field label="Qualification" className="col-span-2"><input name="qualification" placeholder="e.g. Plus Two / Degree" className={INPUT} /></Field>
                <Field label="Passing Year"><input type="number" name="year_of_passing" placeholder="YYYY" className={INPUT} inputMode="numeric" /></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/50 dark:bg-gray-800/40 rounded-lg border border-blue-100 dark:border-blue-900/30">
                <Field label="Parent Name"><input name="parent_name" placeholder="Father/Mother name" className={INPUT} /></Field>
                <Field label="Parent Contact"><input name="parent_contact" placeholder="Parent phone" className={INPUT} inputMode="tel" /></Field>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="City"><input name="city" placeholder="Place" className={INPUT} /></Field>
                <Field label="Course *">
                  <select required name="interested_treatment" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className={SELECT}>
                    <option value="">Select Course</option>
                    {masterCourses.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    <option value="Other">Other (Type manually…)</option>
                  </select>
                  {selectedCourse === "Other" && <input required type="text" name="custom_course_name" placeholder="Type course name…" className={`${INPUT} mt-2 border-blue-400`} autoFocus />}
                </Field>
                <Field label="Source">
                  <select name="lead_sourceId" className={SELECT}>
                    <option value="">Select Source</option>
                    {sourceOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label="Urgency">
                <select 
  name="urgency" 
  defaultValue="Just inquiring"   // ✅ ADD THIS
  className={SELECT}
>
                {/* Corrected values to match your MySQL ENUM strings */}
                <option value="Just inquiring">Normal</option>
<option value="Within 1 month">Within 1 month</option>
<option value="Within 1 week">Within 1 week</option>
<option value="Immediate (pain)">Immediate</option>
              </select>
              </Field>
              </div>
              <Field label="Remarks"><textarea rows={2} name="counselor_remarks" placeholder="Initial counseling notes…" className={`${INPUT} resize-none`} /></Field>
              <div className="flex justify-end items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 text-[10px] font-black uppercase text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">Discard</button>
                <button type="submit" className="px-8 py-2 text-[10px] font-black uppercase text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-lg flex items-center gap-2 transition-all active:scale-95">
                  <Plus size={14} strokeWidth={3} /> Create Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          EDIT LEAD MODAL
      ════════════════════════════════════ */}
      
      {showEditForm && editingLead && (
        
        <div key={editingLead.id} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 sm:rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full sm:max-w-5xl max-h-[95vh] overflow-hidden flex flex-col rounded-t-2xl">
            <div className="sm:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" /></div>
            <div className="px-5 py-2.5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/30 dark:bg-gray-800/30 shrink-0">
              <div>
                <h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                  <div className="w-1.5 h-4 bg-blue-600 rounded-full" /> Modify Student Profile
                </h2>
                <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mt-0.5">#{editingLead.id}</p>
              </div>
              <button type="button" onClick={() => { setShowEditForm(false); setEditingLead(null); }} className="p-1.5 rounded-md hover:bg-red-50 hover:text-red-500 text-gray-400 transition-all"><X size={18} /></button>
            </div>
            <div className="flex flex-col md:flex-row overflow-hidden flex-1 min-h-0">
              <form onSubmit={handleEditSubmit} className="flex-1 px-4 sm:px-5 py-4 overflow-y-auto space-y-4 border-r border-gray-100 dark:border-gray-800">
                {/* Quick action buttons */}
                <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                    <Zap size={12} fill="currentColor" /> Quick Action Logs
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_ACTIONS.map((act) => (
                      <button key={act.label} type="button" onClick={() => stampRemark(act.prefix, act.label)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border border-transparent hover:scale-105 transition-all shadow-sm ${act.color}`}>
                        {act.icon} {act.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label="Full Name" className="col-span-2"><input required name="full_name" defaultValue={editingLead.full_name || ""} className={INPUT} /></Field>
                  <Field label="Age"><input type="number" name="age" defaultValue={editingLead.age || ""} className={INPUT} inputMode="numeric" /></Field>
                  <Field label="Gender">
                    <select name="gender" defaultValue={editingLead.gender || ""} className={SELECT}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select>
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Phone">
                  <div className="flex gap-2">
                    <input 
                      required 
                      type="tel" 
                      name="phone" 
                      defaultValue={editingLead.phone || ""} 
                      className={`${INPUT} flex-1`} 
                      inputMode="tel" 
                    />
                    <label className="flex items-center gap-1.5 px-2 border rounded bg-gray-50 dark:bg-gray-800 cursor-pointer shrink-0 border-gray-300 dark:border-gray-700">
                    <input 
                        // Add the key here too
                        key={`wa-${editingLead.id}`} 
                        type="checkbox" 
                        name="whatsapp_same"       
                        defaultChecked={Number(editingLead.whatsapp_same) === 1} 
                        className="w-4 h-4 text-green-600 rounded" 
                      />
                      <span className="text-[10px] font-bold text-green-600 uppercase">WA</span>
                    </label>
                  </div>
                </Field>
                  <Field label="Email"><input type="email" name="email" defaultValue={editingLead.email || ""} className={INPUT} inputMode="email" /></Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-2 bg-gray-50 dark:bg-gray-800/20 rounded-lg border border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-2">
                    <Field label="Qualification"><input name="qualification" defaultValue={editingLead.qualification || ""} className={INPUT} /></Field>
                    <Field label="Passing Year"><input type="number" name="year_of_passing" defaultValue={editingLead.year_of_passing || ""} className={INPUT} inputMode="numeric" /></Field>
                  </div>
                  <div className="p-2 bg-blue-50/50 dark:bg-gray-800/40 rounded-lg border border-blue-100 dark:border-blue-900/30 grid grid-cols-2 gap-2">
                    <Field label="Parent Name"><input name="parent_name" defaultValue={editingLead.parent_name || ""} className={INPUT} /></Field>
                    <Field label="Contact"><input name="parent_contact" defaultValue={editingLead.parent_contact || ""} className={INPUT} inputMode="tel" /></Field>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="City"><input name="city" defaultValue={editingLead.city || ""} className={INPUT} /></Field>
                  <Field label="Course">
                    <select name="interested_course" defaultValue={editingLead.interested_course || ""} className={SELECT}>
                      <option value="">Select Course</option>
                      {masterCourses.map((c) => <option key={c.id ?? c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Field label="Source">
                    <select name="lead_source_id" defaultValue={editingLead.lead_source_id || ""} className={SELECT}>
                      <option value="">Select</option>
                      {sourceOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </Field>
               <Field label="Urgency">
                <select 
                  name="urgency" 
                  value={editUrgency} 
                  onChange={(e) => setEditUrgency(e.target.value)} 
                  className={SELECT}
                >
                  <option value="Just inquiring">Normal</option>
                  <option value="Within 1 month">Within 1 month</option>
                  <option value="Within 1 week">Within 1 week</option>
                  <option value="Immediate (pain)">Immediate</option>
                </select>
              </Field>
               <Field label="Quality KPI">
              <select 
                name="lead_quality" 
                // Add .toLowerCase() here
                defaultValue={editingLead.lead_quality?.toLowerCase() || "unverified"} 
                className={`${SELECT} font-bold`}
              >
                <option value="unverified">🔍 Unverified</option>
                <option value="hot">🔥 Hot</option>
                <option value="warm">🌡️ Warm</option>
                <option value="cold">❄️ Cold</option>
                <option value="low">📉 Low Priority</option>
              </select>
            </Field>
                  </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t pt-3 border-gray-100 dark:border-gray-800">
               <Field label="Current Status">
                  <div className="flex gap-2">
                    <select 
                      value={editStatus} 
                      onChange={(e) => setEditStatus(e.target.value)} 
                      name="lead_status"
                      className={`px-2 py-1.5 text-xs rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold outline-none ${isFollowUpStatus ? "w-1/2" : "w-full"}`}
                    >
                      {STATUS_OPTIONS.filter((o) => o.value !== "all").map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {isFollowUpStatus && (
                      <input 
                        type="date" 
                        name="next_follow_up_date" 
                        required 
                        value={followUpDate} 
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="w-1/2 px-2 py-1.5 text-xs rounded border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800 text-orange-700 font-bold outline-none" 
                      />
                    )}
                  </div>
                </Field>
                  <Field label="Counselor Remarks">
                    <textarea id="counselor_remarks_area" rows={3} name="counselor_remarks" defaultValue={editingLead.counselor_remarks || ""} className={`${INPUT} resize-none`} />
                  </Field>
                </div>
                <div className="flex justify-end items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button type="button" onClick={() => { setShowEditForm(false); setEditingLead(null); }} className="px-4 py-1.5 text-xs font-bold text-gray-500 uppercase hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">Discard</button>
                  <button type="submit" className="px-6 py-1.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-lg uppercase tracking-widest active:scale-95 transition-all">Save Update</button>
                </div>
              </form>
              <div className="hidden md:block w-80 bg-gray-50/50 dark:bg-gray-950/20 overflow-y-auto border-l border-gray-100 dark:border-gray-800 shrink-0">
              {editingLead?.id && <ActivityLogsMini leadId={editingLead.id} />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      <DeleteModal
        isOpen={deleteId !== null}
        title="Delete Lead Record?"
        message="This will permanently remove the student's data and all associated communication history. This action cannot be undone."
        onConfirm={confirmDelete}
        onClose={() => setDeleteId(null)}
        isDeleting={isDeleting}
      />

      
    </div>
  );
}