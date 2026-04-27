// src/pages/Reports.tsx
// Lead CRM — Reporting Centre
// Refactored: split filter/transform/render · correct date logic · stable state

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Download, Printer, Calendar, Users, CheckCircle2,
  AlertTriangle, ArrowRight, Database, FileSpreadsheet,
  Globe, TrendingUp, X, ChevronDown,
} from "lucide-react";
import { apiGet } from "../utils/api";
import { toast, Toaster } from "react-hot-toast";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

type ReportType = "admissions" | "velocity" | "performance" | "sources" | "lost";
type Period     = "daily" | "weekly" | "monthly" | "custom";

interface Lead {
  id:                 number;
  lead_uid?:          string;
  full_name?:         string;
  phone?:             string;
  lead_status?:       string;
  lead_source_name?:  string;
  interested_course?: string;
  assigned_user_name?:string;
  created_at?:        string;
  updated_at?:        string;
}

interface DateRange { from: Date; to: Date; }

// Row shapes — one per report type; must match HEADERS exactly
interface AdmissionRow  { id: string; name: string; program: string; phone: string; date: string; source: string; counselor: string; }
interface VelocityRow   { id: string; name: string; course: string; entryDate: string; convertedDate: string; days: number; counselor: string; }
interface PerformRow    { counselor: string; total: number; new_: number; contacted: number; interested: number; won: number; lost: number; convRate: string; }
interface SourceRow     { source: string; total: number; interested: number; won: number; lost: number; convRate: string; }
interface LostRow       { id: string; name: string; phone: string; course: string; source: string; counselor: string; status: string; date: string; }

type AnyRow = AdmissionRow | VelocityRow | PerformRow | SourceRow | LostRow;

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const TODAY = new Date();
const toISO = (d: Date) => d.toISOString().split("T")[0];

const PERIODS = [
  { id: "daily",   label: "Today"      },
  { id: "weekly",  label: "This Week"  },
  { id: "monthly", label: "This Month" },
  { id: "custom",  label: "Custom"     },
] as const;

const REPORT_MODULES = [
  { id: "admissions",  label: "Admissions",  description: "Successful enrollments",    icon: <Users         size={15} /> },
  { id: "velocity",    label: "Velocity",     description: "Entry to conversion speed", icon: <TrendingUp    size={15} /> },
  { id: "performance", label: "Performance",  description: "Individual win rates",      icon: <CheckCircle2  size={15} /> },
  { id: "sources",     label: "Sources",      description: "Channel effectiveness",     icon: <Database      size={15} /> },
  { id: "lost",        label: "Lost Leads",   description: "Drop-off tracking",         icon: <AlertTriangle size={15} /> },
] as const;

// Table column headers — MUST match the corresponding Row interface keys in order
const HEADERS: Record<ReportType, string[]> = {
  admissions:  ["Lead ID", "Name", "Program",   "Phone", "Conv. Date", "Source",    "Counselor"],
  velocity:    ["Lead ID", "Name", "Course",     "Entry", "Converted",  "Days",      "Counselor"],
  performance: ["Counselor", "Total", "New",   "Contacted", "Interested", "Won",    "Lost", "Conv %"],
  sources:     ["Source",    "Total", "Interested",                       "Won",     "Lost", "Conv %"],
  lost:        ["Lead ID", "Name", "Phone",    "Course",   "Source",     "Counselor","Status", "Date"],
};

// Which date field to use when filtering by period (per report type)
const FILTER_DATE_FIELD: Record<ReportType, "created_at" | "updated_at" | "both"> = {
  admissions:  "updated_at",   // filter by when they converted
  velocity:    "both",         // both created_at + updated_at must exist; filter by created_at
  performance: "created_at",
  sources:     "created_at",
  lost:        "updated_at",   // filter by when they were marked lost
};

// 1. Define the Sources
const MANUAL_SOURCE_MAP: Record<number, string> = {
  1: "WhatsApp",
  2: "Phone Call",
  3: "Walk-in",
  4: "Website Inquiry",
  5: "Referral",
  6: "Social Media",
  7: "Meta Ads",
  8: "Google Ads",
  9: "Bulk Import",
  10: "Unknown",
};

// 2. Define the Colors (Typed as Record<string, string> to allow flexible string lookups)
const SOURCE_COLORS: Record<string, string> = {
  "WhatsApp":        "green",
  "Phone Call":      "blue",
  "Walk-in":         "gray",
  "Website Inquiry": "blue",
  "Referral":        "yellow",
  "Social Media":    "purple",
  "Meta Ads":        "blue",
  "Google Ads":      "amber",
  "Bulk Import":     "gray",
  "Unknown":         "gray",
};

// 3. The Badge Component

// ═══════════════════════════════════════════════════════════════════════════════
// Utility helpers
// ═══════════════════════════════════════════════════════════════════════════════

function getPeriodRange(period: Period): DateRange {
  const todayStart = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  switch (period) {
    case "daily":
      return { from: todayStart, to: new Date(todayStart.getTime() + 86_400_000 - 1) };
    case "weekly": {
      const mon = new Date(todayStart);
      mon.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7));
      return { from: mon, to: new Date(todayStart.getTime() + 86_400_000 - 1) };
    }
    case "monthly":
      return {
        from: new Date(TODAY.getFullYear(), TODAY.getMonth(), 1),
        to:   new Date(todayStart.getTime() + 86_400_000 - 1),
      };
    default:
      return { from: todayStart, to: new Date(todayStart.getTime() + 86_400_000 - 1) };
  }
}

function inRange(dateStr: string | undefined, range: DateRange): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) && d >= range.from && d <= range.to;
}

function fmtDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function leadId(l: Lead): string {
  return l.lead_uid || `L26-${String(l.id).padStart(4, "0")}`;
}



// ═══════════════════════════════════════════════════════════════════════════════
// Filter logic — completely separated from transform
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns the subset of leads that fall within the given date range,
 * using the appropriate date field for each report type.
 */
function filterLeadsByDate(
  leads:      Lead[],
  type:       ReportType,
  range:      DateRange,
): Lead[] {
  const field = FILTER_DATE_FIELD[type];

  switch (field) {
    case "updated_at":
      return leads.filter(l => inRange(l.updated_at, range));

    case "both":
      // Velocity: lead must have both timestamps; filter by when it was created
      return leads.filter(l => l.created_at && l.updated_at && inRange(l.created_at, range));

    case "created_at":
    default:
      return leads.filter(l => inRange(l.created_at, range));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Transform functions — one per report type
// ═══════════════════════════════════════════════════════════════════════════════

function safeStr(val: any, fallback = "—"): string {
  if (val === null || val === undefined) return fallback;
  const s = String(val).trim();
  return s !== "" && s !== "undefined" && s !== "null" ? s : fallback;
}

// Global Counselor Helper
const getCounselor = (l: any) => 
  safeStr(l.counselor_name || l.assigned_user_name || l.assigned_to_name || l.user_name, "Unassigned");

// Global Source Helper (Moved outside the component for global access)
// Use string for the map keys to match what we save in state
const resolveSourceName = (l: any, sMap: Record<string, string>): string => {
  // 1. Get the Raw ID from the lead
  const rawId = l?.lead_source_id ?? l?.source_id ?? l?.source;
  
  if (rawId !== undefined && rawId !== null && rawId !== "") {
    const sIdNum = Number(rawId);
    const sIdStr = String(rawId);

    // PRIORITY 1: Check the dynamic API map (latest DB data)
    if (sMap[sIdStr]) return sMap[sIdStr];

    // PRIORITY 2: Check the manual map (hardcoded fallback)
    if (MANUAL_SOURCE_MAP[sIdNum]) return MANUAL_SOURCE_MAP[sIdNum];

    // PRIORITY 3: Check if backend already sent a string name (JOINed)
    const nameKeys = ["lead_source_name", "source_name", "source", "lead_source"];
    for (const key of nameKeys) {
      const val = l?.[key];
      if (typeof val === "string" && val.trim() && isNaN(Number(val))) return val.trim();
    }

    return `Source #${sIdStr}`; 
  }

  return "Direct";
};
// ═══════════════════════════════════════════════════════════════════════════════
// Transform functions — one per report type
// ═══════════════════════════════════════════════════════════════════════════════

function transformAdmissions(leads: Lead[], sMap: Record<number, string>): AdmissionRow[] {
  const CONVERTED_STATUSES = new Set(["Converted", "Closed", "Admission"]);
  return leads
    .filter(l => CONVERTED_STATUSES.has(l.lead_status || ""))
    .map(l => ({
      id: leadId(l),
      name: safeStr(l.full_name, "N/A"),
      program: safeStr(l.interested_course, "General"),
      phone: safeStr(l.phone, "—"),
      date: fmtDate(l.updated_at),
      source: resolveSourceName(l, sMap), // Updated
      counselor: getCounselor(l),
    }));
}

// ... Repeat this 'resolveSourceName(l, sMap)' change for transformSources and transformLost ...

function transformSources(leads: Lead[], sMap: Record<number, string>): SourceRow[] {
  const map = new Map<string, SourceRow>();
  leads.forEach(l => {
    const src = resolveSourceName(l, sMap); // Updated
    if (!map.has(src)) {
      map.set(src, { source: src, total: 0, interested: 0, won: 0, lost: 0, convRate: "0%" });
    }
    const row = map.get(src)!;
    row.total++;
    const s = l.lead_status || "";
    if (s === "Interested") row.interested++;
    if (s === "Converted" || s === "Closed") row.won++;
    if (s === "Lost" || s === "Not Interested" || s === "Rejected") row.lost++;
  });
  return Array.from(map.values()).map(r => ({
    ...r,
    convRate: r.total > 0 ? `${((r.won / r.total) * 100).toFixed(1)}%` : "0%",
  })).sort((a, b) => b.total - a.total);
}

function transformVelocity(leads: Lead[], sMap: Record<number, string>): VelocityRow[] {
  return leads
    .filter(l => l.lead_status === "Converted" && l.created_at && l.updated_at)
    .map(l => {
      const created   = new Date(l.created_at!);
      const converted = new Date(l.updated_at!);
      const ms        = converted.getTime() - created.getTime();
      const days      = ms > 0 ? Math.ceil(ms / 86_400_000) : 1;
      return {
        id:            leadId(l),
        name:          safeStr(l.full_name, "N/A"),
        course:        safeStr(l.interested_course, "General"),
        entryDate:     fmtDate(l.created_at),
        convertedDate: fmtDate(l.updated_at),
        days,
        counselor:     getCounselor(l),
      };
    })
    .sort((a, b) => a.days - b.days);
}

function transformPerformance(leads: Lead[]): PerformRow[] {
  const map = new Map<string, PerformRow>();
  leads.forEach(l => {
    const name = getCounselor(l);
    if (!map.has(name)) {
      map.set(name, { counselor: name, total: 0, new_: 0, contacted: 0, interested: 0, won: 0, lost: 0, convRate: "0%" });
    }
    const row = map.get(name)!;
    row.total++;
    const s = l.lead_status || "";
    if (s === "New") row.new_++;
    else if (s === "Contacted") row.contacted++;
    else if (s === "Interested") row.interested++;
    else if (s === "Converted" || s === "Closed") row.won++;
    else if (s === "Lost" || s === "Not Interested" || s === "Rejected") row.lost++;
  });
  return Array.from(map.values()).map(r => ({
    ...r,
    convRate: r.total > 0 ? `${((r.won / r.total) * 100).toFixed(1)}%` : "0%"
  })).sort((a, b) => b.won - a.won);
}


function transformLost(leads: Lead[], sMap: Record<string, string>): LostRow[] {
  const LOST_STATUSES = new Set(["Lost", "Not Interested", "Rejected"]);
  return leads
    .filter(l => LOST_STATUSES.has(l.lead_status || ""))
    .map(l => ({
      id:        leadId(l),
      name:      safeStr(l.full_name, "N/A"),
      phone:     safeStr(l.phone, "—"),
      course:    safeStr(l.interested_course, "General"),
      source:    resolveSourceName(l, sMap), // Corrected call
      counselor: getCounselor(l),
      status:    safeStr(l.lead_status, "—"),
      date:      fmtDate(l.updated_at),
    }));
}
// UPDATED: Now passes sourceMap to transforms
function transformLeads(type: ReportType, leads: Lead[], sMap: Record<string, string>): AnyRow[] {
  switch (type) {
    case "admissions":  return transformAdmissions(leads, sMap);
    case "velocity":    return transformVelocity(leads, sMap);
    case "performance": return transformPerformance(leads); 
    case "sources":     return transformSources(leads, sMap);
    case "lost":        return transformLost(leads, sMap);
    default:            return [];
  }
}
// ═══════════════════════════════════════════════════════════════════════════════
// CSV export
// ═══════════════════════════════════════════════════════════════════════════════

function exportCSV(data: AnyRow[], filename: string) {
  if (!data.length) { toast.error("Generate a report first"); return; }
  const keys = Object.keys(data[0]);
  const csv  = [
    keys.join(","),
    ...data.map(row =>
      keys.map(k => `"${(row as any)[k] ?? ""}"`).join(",")
    ),
  ].join("\n");
  const a = Object.assign(document.createElement("a"), {
    href:     URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })),
    download: filename,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  toast.success("CSV exported");
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: string }) {
  const palette: Record<string, string> = {
    gray:   "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
    green:  "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    yellow: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    red:    "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400",
    blue:   "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
    amber:  "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
  };
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide whitespace-nowrap ${palette[color] || palette.gray}`}>
      {children}
    </span>
  );
}

/** Thin wrapper: renders correct table row for each report type */
/** Thin wrapper: renders correct table row for each report type */
function ReportRow({ row, type }: { row: AnyRow; type: ReportType }) {
  // 1. Shared Styling Variables (Declared at the top to avoid ReferenceErrors)
  const cell = "px-4 py-3 text-[11px] text-gray-700 dark:text-gray-300";
  const idCls = `${cell} font-mono text-[10px] text-blue-600 dark:text-blue-400 font-black whitespace-nowrap`;
  const numCls = `${cell} tabular-nums font-semibold text-center`;

  switch (type) {
    case "admissions": {
      const r = row as AdmissionRow;
      const sourceName = r.source || "Unknown";
      const badgeColor = SOURCE_COLORS[sourceName] || "gray";

      return (
        <tr className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0">
          <td className={idCls}>{r.id}</td>
          <td className={`${cell} font-semibold text-gray-900 dark:text-gray-100`}>{r.name}</td>
          <td className={`${cell} text-blue-600 dark:text-blue-400`}>{r.program}</td>
          <td className={`${cell} tabular-nums`}>{r.phone}</td>
          <td className={`${cell} whitespace-nowrap`}>{r.date}</td>
          <td className={cell}>
            <Badge color={badgeColor}>{sourceName}</Badge>
          </td>
          <td className={cell}>{r.counselor}</td>
        </tr>
      );
    }

    case "velocity": {
      const r = row as VelocityRow;
      return (
        <tr className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0">
          <td className={idCls}>{r.id}</td>
          <td className={`${cell} font-semibold text-gray-900 dark:text-gray-100`}>{r.name}</td>
          <td className={cell}>{r.course}</td>
          <td className={`${cell} whitespace-nowrap`}>{r.entryDate}</td>
          <td className={`${cell} text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap`}>{r.convertedDate}</td>
          <td className={`${cell} text-center`}>
            <Badge color={r.days <= 7 ? "green" : r.days <= 30 ? "yellow" : "red"}>
              {r.days}d
            </Badge>
          </td>
          <td className={cell}>{r.counselor}</td>
        </tr>
      );
    }

    case "performance": {
      const r = row as PerformRow;
      return (
        <tr className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0">
          <td className={`${cell} font-semibold text-gray-900 dark:text-gray-100`}>{r.counselor}</td>
          <td className={`${numCls} font-black`}>{r.total}</td>
          <td className={`${numCls} text-blue-600 dark:text-blue-400`}>{r.new_}</td>
          <td className={`${numCls} text-amber-600 dark:text-amber-400`}>{r.contacted}</td>
          <td className={`${numCls} text-indigo-600 dark:text-indigo-400`}>{r.interested}</td>
          <td className={`${numCls} text-emerald-600 dark:text-emerald-400 font-black`}>{r.won}</td>
          <td className={`${numCls} text-rose-500 dark:text-rose-400`}>{r.lost}</td>
          <td className={`${cell} text-center`}>
            <Badge color="green">{r.convRate}</Badge>
          </td>
        </tr>
      );
    }

    case "sources": {
      const r = row as SourceRow;
      const badgeColor = SOURCE_COLORS[r.source] || "gray";
      return (
        <tr className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0">
          <td className={`${cell} font-semibold text-gray-900 dark:text-gray-100`}>
             <Badge color={badgeColor}>{r.source}</Badge>
          </td>
          <td className={`${numCls} font-black`}>{r.total}</td>
          <td className={`${numCls} text-indigo-600 dark:text-indigo-400`}>{r.interested}</td>
          <td className={`${numCls} text-emerald-600 dark:text-emerald-400 font-black`}>{r.won}</td>
          <td className={`${numCls} text-rose-500 dark:text-rose-400`}>{r.lost}</td>
          <td className={`${cell} text-center`}>
            <Badge color="green">{r.convRate}</Badge>
          </td>
        </tr>
      );
    }

    case "lost": {
      const r = row as LostRow;
      const sourceName = r.source || "Unknown";
      const sourceColor = SOURCE_COLORS[sourceName] || "gray";

      return (
        <tr className="hover:bg-rose-50/10 dark:hover:bg-rose-900/10 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0">
          <td className={idCls}>{r.id}</td>
          <td className={`${cell} font-semibold text-gray-900 dark:text-gray-100`}>{r.name}</td>
          <td className={`${cell} tabular-nums`}>{r.phone}</td>
          <td className={cell}>{r.course}</td>
          <td className={cell}>
            <Badge color={sourceColor}>{sourceName}</Badge>
          </td>
          <td className={cell}>{r.counselor}</td>
          <td className={cell}>
            <Badge color="red">{r.status}</Badge>
          </td>
          <td className={`${cell} whitespace-nowrap`}>{r.date}</td>
        </tr>
      );
    }

    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function Reports() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [reportType,   setReportType]   = useState<ReportType>("admissions");
  const [period,       setPeriod]       = useState<Period>("monthly");
  const [customFrom,   setCustomFrom]   = useState(toISO(new Date(TODAY.getFullYear(), 0, 1)));
  const [customTo,     setCustomTo]     = useState(toISO(TODAY));
  const [allLeads,     setAllLeads]     = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [generated,    setGenerated]    = useState(false);       // user clicked Generate
  const [generating,   setGenerating]   = useState(false);
  const [moduleOpen,   setModuleOpen]   = useState(false);       // mobile type picker
  const [sourceMap, setSourceMap] = useState<Record<number, string>>({});
  // ── Load leads ─────────────────────────────────────────────────────────────


  useEffect(() => {
    const load = async () => {
      setLoadingLeads(true);
      try {
        const res   = await apiGet("/api/leads?limit=2000&page=1");
        const leads = Array.isArray(res) ? res : (res?.data ?? res?.leads ?? []);
        setAllLeads(leads);
      } catch {
        toast.error("Could not sync lead data");
      } finally {
        setLoadingLeads(false);
      }
    };
    load();
  }, []);

useEffect(() => {
  apiGet("/api/leads/sources")
    .then((res) => {
      // Logic to handle direct array or nested data object
      const list = Array.isArray(res) ? res : (res?.data ?? res?.sources ?? []);
      const map: Record<string, string> = {};

      list.forEach((s: any) => {
        // Use exactly what your MySQL table shows: 'id' and 'name'
        if (s.id !== undefined && s.name) {
          map[String(s.id)] = s.name;
        }
      });
      
      setSourceMap(map);
    })
    .catch((err) => console.error("Source API offline, using manual map fallback."));
}, []);

const getSource = (l: any): string => {
  // 1. Direct string (highest priority - if backend already did the JOIN)
  const nameKeys = [
    "lead_source_name",
    "source_name",
    "source",
    "lead_source",
  ];

  for (const key of nameKeys) {
    const val = l?.[key];
    // If it's a string and NOT just a number (like "Facebook")
    if (typeof val === "string" && val.trim() && isNaN(Number(val))) {
      return val.trim();
    }
  }

  // 2. ID → Name mapping
  // FORCE sId to be a Number to match the sourceMap keys
  const rawId = l?.lead_source_id || l?.source_id || l?.source;
  const sId = (rawId !== undefined && rawId !== null) ? Number(rawId) : null;

  // Check the map using the forced Number ID
  if (sId !== null && !isNaN(sId) && sourceMap[sId]) {
    return sourceMap[sId];
  }

  // 3. Final Fallbacks
  // If we have an ID but no name in the map, show the ID for debugging
  if (sId !== null && !isNaN(sId) && sId !== 0) {
    return `Source #${sId}`; 
  }

  return "Direct";
};
  // ── Reset when type or period changes ──────────────────────────────────────
  // FIX: was missing — stale data from previous report type/period remained visible
  useEffect(() => { setGenerated(false); }, [reportType, period, customFrom, customTo]);

  // ── Date range (memoised) ──────────────────────────────────────────────────
  const dateRange = useMemo<DateRange>(() => {
    if (period === "custom") {
      const from = new Date(customFrom + "T00:00:00");
      const to   = new Date(customTo   + "T23:59:59");
      return { from, to };
    }
    return getPeriodRange(period);
  }, [period, customFrom, customTo]);

  // ── Filtered leads (memoised — no transform yet) ───────────────────────────
  const filteredLeads = useMemo(
    () => filterLeadsByDate(allLeads, reportType, dateRange),
    [allLeads, reportType, dateRange]
  );

  // ── Preview data (memoised — only runs after Generate is clicked) ──────────
const previewData = useMemo<AnyRow[]>(
  () => (generated ? transformLeads(reportType, filteredLeads, sourceMap) : []),
  [generated, reportType, filteredLeads, sourceMap] // CRITICAL: sourceMap must be here
);
  // ── Helpers ────────────────────────────────────────────────────────────────
  const periodLabel = useMemo(() => {
    if (period === "custom") return `${customFrom} → ${customTo}`;
    return PERIODS.find(p => p.id === period)?.label ?? "";
  }, [period, customFrom, customTo]);

  const handleGenerate = useCallback(async () => {
    if (!filteredLeads.length) {
      toast.error("No leads found for this period"); return;
    }
    setGenerating(true);
    const tid = toast.loading("Generating report…");
    try {
      // tiny async yield so the loading spinner renders before heavy compute
      await new Promise(r => setTimeout(r, 80));
      setGenerated(true);
      const count = transformLeads(reportType, filteredLeads, sourceMap).length;
      if (count === 0) toast.error("No matching records for the selected filters", { id: tid });
      else             toast.success(`${count} record${count !== 1 ? "s" : ""} ready`, { id: tid });
    } catch {
      toast.error("Generation failed", { id: tid });
    } finally {
      setGenerating(false);
    }
  }, [filteredLeads, reportType]);

  const handleExportCSV = () =>
    exportCSV(previewData, `${reportType}_${period}_${toISO(TODAY)}.csv`);

  const activeModule = REPORT_MODULES.find(m => m.id === reportType)!;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-12">
      <Toaster position="top-right" />

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3
        border-b border-gray-100 dark:border-gray-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight
            flex items-center gap-2.5">
            <span className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center
              shadow-lg shadow-blue-600/20 shrink-0">
              <Globe size={16} className="text-white" />
            </span>
            Reporting Centre
          </h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1
            flex items-center gap-2">
            Intelligence Unit
            {loadingLeads
              ? <span className="text-amber-500 animate-pulse">· Syncing data…</span>
              : <span className="text-emerald-500">· {allLeads.length} leads loaded</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white dark:bg-gray-900
              border border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-black
              uppercase hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm transition-all">
            <Printer size={13} />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button type="button" onClick={handleExportCSV} disabled={!previewData.length}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-gray-900 dark:bg-gray-700
              text-white rounded-xl text-[10px] font-black uppercase shadow-md
              hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            <Download size={13} />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* ── Report type: mobile dropdown ── */}
        <div className="lg:hidden">
          <button type="button" onClick={() => setModuleOpen(v => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3
              bg-blue-600 text-white rounded-2xl shadow-lg">
            <div className="flex items-center gap-2.5">
              <span className="opacity-80">{activeModule.icon}</span>
              <div className="text-left">
                <p className="text-[11px] font-black uppercase tracking-widest">{activeModule.label}</p>
                <p className="text-[9px] text-blue-200">{activeModule.description}</p>
              </div>
            </div>
            <ChevronDown size={15}
              className={`transition-transform duration-200 ${moduleOpen ? "rotate-180" : ""}`} />
          </button>

          {moduleOpen && (
            <div className="mt-1.5 space-y-1.5">
              {REPORT_MODULES.filter(m => m.id !== reportType).map(mod => (
                <button key={mod.id} type="button"
                  onClick={() => {
                    setReportType(mod.id as ReportType);
                    setModuleOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3
                    bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800
                    rounded-2xl text-left hover:border-blue-200 transition-all shadow-sm">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl shrink-0">
                    {mod.icon}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-900 dark:text-gray-100">{mod.label}</p>
                    <p className="text-[10px] text-gray-400">{mod.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Report type: desktop sidebar ── */}
        <div className="hidden lg:flex lg:col-span-1 flex-col gap-2">
          {REPORT_MODULES.map(mod => (
            <button key={mod.id} type="button"
              onClick={() => setReportType(mod.id as ReportType)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2
                transition-all text-left
                ${reportType === mod.id
                  ? "bg-blue-600 border-blue-600 text-white shadow-lg"
                  : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-700"}`}>
              <div className={`p-2 rounded-xl shrink-0
                ${reportType === mod.id
                  ? "bg-white/20"
                  : "bg-blue-50 dark:bg-blue-900/30 text-blue-600"}`}>
                {mod.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{mod.label}</p>
                <p className={`text-[10px] mt-0.5 truncate
                  ${reportType === mod.id ? "text-blue-100" : "text-gray-400"}`}>
                  {mod.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* ── Main area ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Period + generate */}
          <div className="bg-white dark:bg-gray-900 px-4 sm:px-5 py-4 rounded-2xl
            border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">

            {/* Period pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest shrink-0">
                Period:
              </span>
              {PERIODS.map(p => (
                <button key={p.id} type="button"
                  onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase
                    tracking-widest transition-all
                    ${period === p.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom date range */}
            {period === "custom" && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2
                bg-gray-50 dark:bg-gray-800 px-3 py-2.5 rounded-xl
                border border-gray-100 dark:border-gray-700">
                <Calendar size={13} className="text-blue-600 shrink-0" />
                <input type="date" value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="bg-transparent text-[11px] font-bold outline-none
                    dark:text-white dark:color-scheme-dark" />
                <ArrowRight size={11} className="text-gray-300 hidden sm:block" />
                <input type="date" value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="bg-transparent text-[11px] font-bold outline-none dark:text-white" />
              </div>
            )}

            {/* Scope info + controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap text-[10px]">
                <span className="font-black text-gray-400 uppercase tracking-widest">Scope:</span>
                <span className="font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30
                  px-2.5 py-1 rounded-full">
                  {periodLabel}
                </span>
                <span className="text-gray-400 font-medium">
                  · {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""} in range
                </span>
              </div>

              <div className="flex gap-2">
                {generated && (
                  <button type="button"
                    onClick={() => setGenerated(false)}
                    className="flex items-center gap-1 px-3.5 py-2 text-rose-500
                      text-[10px] font-black uppercase hover:bg-rose-50 dark:hover:bg-rose-900/20
                      rounded-xl transition-colors">
                    <X size={12} /> Clear
                  </button>
                )}
                <button type="button"
                  onClick={handleGenerate}
                  disabled={generating || loadingLeads}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white
                    text-[10px] font-black uppercase rounded-xl shadow-md hover:bg-blue-700
                    disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95">
                  {generating ? (
                    <><div className="w-3 h-3 border-2 border-white border-t-transparent
                        rounded-full animate-spin" /> Generating…</>
                  ) : loadingLeads ? "Syncing…" : "Generate"}
                </button>
              </div>
            </div>
          </div>

          {/* Results table */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl
            border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">

            {/* Table header bar */}
            <div className="px-4 sm:px-5 py-3 border-b border-gray-100 dark:border-gray-800
              bg-gray-50/50 dark:bg-gray-800/40 flex justify-between items-center gap-3">
              <div className="flex items-center gap-2 text-[10px] font-black
                text-gray-500 dark:text-gray-400 uppercase tracking-widest min-w-0">
                <FileSpreadsheet size={13} className="text-emerald-500 shrink-0" />
                <span className="truncate">{activeModule.label}</span>
                <span className="text-gray-300 dark:text-gray-700 shrink-0">·</span>
                <span className="text-blue-600 dark:text-blue-400 truncate">{periodLabel}</span>
              </div>
              <span className="shrink-0 text-[10px] font-bold px-2.5 py-1
                bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                {previewData.length} records
              </span>
            </div>

            {/* Empty / table */}
            {!generated ? (
              <div className="h-56 flex flex-col items-center justify-center gap-3">
                <span className="text-4xl opacity-20 select-none">📊</span>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  Select a period and click Generate
                </p>
              </div>
            ) : previewData.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center gap-3">
                <span className="text-4xl opacity-20 select-none">🔍</span>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  No records match the selected filters
                </p>
              </div>
            ) : (
              /* Mobile scrollable wrapper */
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] min-w-[560px]">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 border-b
                      border-gray-100 dark:border-gray-800 text-left">
                      {HEADERS[reportType].map(h => (
                        <th key={h}
                          className="px-4 py-3 text-[9px] font-black text-gray-400
                            uppercase tracking-widest whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <ReportRow key={i} row={row} type={reportType} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}