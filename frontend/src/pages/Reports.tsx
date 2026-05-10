// src/pages/Reports.tsx
// Lead CRM — Reporting Centre
// Fixes:
//  1. Duplicate case "attendance" in ReportRow removed
//  2. transformLeads passes data (not leads) for attendance
//  3. FILTER_DATE_FIELD includes "attendance" key
//  4. sourceMap is consistently Record<string,string>
//  5. fmtDate uses local date parsing (no UTC shift)
//  6. Attendance has its own fetch path — never mixed with filterLeadsByDate
//  7. All TypeScript types consistent

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Download, Printer, Calendar, Users, CheckCircle2,
  AlertTriangle, ArrowRight, Database, FileSpreadsheet,
  Globe, TrendingUp, X, ChevronDown, Clock,
} from "lucide-react";
import { apiGet } from "../utils/api";
import { toast, Toaster } from "react-hot-toast";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

type ReportType = "admissions" | "velocity" | "performance" | "sources" | "lost" | "attendance";
type Period     = "daily" | "weekly" | "monthly" | "custom";

interface Lead {
  id:                  number;
  lead_uid?:           string;
  full_name?:          string;
  phone?:              string;
  lead_status?:        string;
  lead_source_id?:     number | string;
  lead_source_name?:   string;
  source_name?:        string;
  interested_course?:  string;
  assigned_user_name?: string;
  counselor_name?:     string;
  created_at?:         string;
  updated_at?:         string;
}

interface AttendanceRow {
  name:         string;
  role:         string;
  totalDays:    number;
  present:      number;
  absent:       number;
  lateArrivals: number;
  percentage:   string;
}
interface AdmissionRow  { id: string; name: string; program: string; phone: string; date: string; source: string; counselor: string; }
interface VelocityRow   { id: string; name: string; course: string; entryDate: string; convertedDate: string; days: number; counselor: string; }
interface PerformRow    { counselor: string; total: number; new_: number; contacted: number; interested: number; won: number; lost: number; convRate: string; }
interface SourceRow     { source: string; total: number; interested: number; won: number; lost: number; convRate: string; }
interface LostRow       { id: string; name: string; phone: string; course: string; source: string; counselor: string; status: string; date: string; }

type AnyRow = AdmissionRow | VelocityRow | PerformRow | SourceRow | LostRow | AttendanceRow;

interface DateRange { from: Date; to: Date; }

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

const REPORT_MODULES: { id: ReportType; label: string; description: string; icon: React.ReactNode }[] = [
  { id: "admissions",  label: "Admissions",  description: "Successful enrollments",        icon: <Users         size={15} /> },
  { id: "velocity",    label: "Velocity",     description: "Entry to conversion speed",     icon: <TrendingUp    size={15} /> },
  { id: "performance", label: "Performance",  description: "Individual win rates",          icon: <CheckCircle2  size={15} /> },
  { id: "sources",     label: "Sources",      description: "Channel effectiveness",         icon: <Database      size={15} /> },
  { id: "lost",        label: "Lost Leads",   description: "Drop-off tracking",             icon: <AlertTriangle size={15} /> },
  { id: "attendance",  label: "Attendance",   description: "Monthly performance & late trends", icon: <Clock    size={15} /> },
];

const HEADERS: Record<ReportType, string[]> = {
  admissions:  ["Lead ID", "Name", "Program",       "Phone",      "Conv. Date",  "Source",    "Counselor"],
  velocity:    ["Lead ID", "Name", "Course",         "Entry",      "Converted",   "Days",      "Counselor"],
  performance: ["Counselor", "Total", "New",         "Contacted",  "Interested",  "Won",       "Lost", "Conv %"],
  sources:     ["Source",    "Total", "Interested",                               "Won",       "Lost", "Conv %"],
  lost:        ["Lead ID", "Name", "Phone",          "Course",     "Source",      "Counselor", "Status", "Date"],
  attendance:  ["Name",    "Role", "Working Days",   "Present",    "Absent",      "Late",      "Attendance %"],
};

// FIX 3: include "attendance" — it doesn't use this map (own fetch path) but
// TypeScript needs the key. Use "created_at" as a dummy.
const FILTER_DATE_FIELD: Record<ReportType, "created_at" | "updated_at" | "both"> = {
  admissions:  "updated_at",
  velocity:    "both",
  performance: "created_at",
  sources:     "created_at",
  lost:        "updated_at",
  attendance:  "created_at", // not used — attendance has its own API fetch
};

const SOURCE_COLORS: Record<string, string> = {
  "WhatsApp":         "green",
  "Phone Call":       "blue",
  "Walk-in":          "gray",
  "Website Inquiry":  "blue",
  "Referral":         "yellow",
  "Social Media":     "purple",
  "Meta Ads":         "blue",
  "Google Ads":       "amber",
  "Bulk Import":      "gray",
  "Unknown":          "gray",
  "Direct":           "gray",
};

// ═══════════════════════════════════════════════════════════════════════════════
// Utility helpers
// ═══════════════════════════════════════════════════════════════════════════════

function getPeriodRange(period: Period): DateRange {
  const now        = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd   = new Date(todayStart.getTime() + 86_400_000 - 1);
  switch (period) {
    case "daily":
      return { from: todayStart, to: todayEnd };
    case "weekly": {
      const mon = new Date(todayStart);
      mon.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7));
      return { from: mon, to: todayEnd };
    }
    case "monthly":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: todayEnd };
    default:
      return { from: todayStart, to: todayEnd };
  }
}

function inRange(dateStr: string | undefined, range: DateRange): boolean {
  if (!dateStr) return false;
  // FIX 5: parse date string without UTC shift
  const raw  = String(dateStr).split("T")[0];
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(y, m - 1, d);
  return dt >= range.from && dt <= range.to;
}

// FIX 5: Local-date safe formatter
function fmtDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const raw = String(dateStr).split("T")[0];
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return "—";
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function safeStr(val: any, fallback = "—"): string {
  if (val === null || val === undefined) return fallback;
  const s = String(val).trim();
  return s !== "" && s !== "undefined" && s !== "null" ? s : fallback;
}

function leadId(l: Lead): string {
  return l.lead_uid || `L26-${String(l.id).padStart(4, "0")}`;
}

const getCounselor = (l: any): string =>
  safeStr(l.counselor_name || l.assigned_user_name || l.assigned_to_name || l.user_name, "Unassigned");

// FIX 4: sourceMap is Record<string,string> throughout
function resolveSourceName(l: any, sMap: Record<string, string>): string {
  // Priority 1: backend JOIN already resolved the name
  for (const key of ["lead_source_name", "source_name", "lead_source"]) {
    const val = l?.[key];
    if (typeof val === "string" && val.trim() && isNaN(Number(val))) return val.trim();
  }
  // Priority 2: ID lookup in sourceMap
  const rawId = l?.lead_source_id ?? l?.source_id;
  if (rawId !== null && rawId !== undefined) {
    const key = String(rawId);
    if (sMap[key]) return sMap[key];
  }
  return "Direct";
}

// ═══════════════════════════════════════════════════════════════════════════════
// Filter
// ═══════════════════════════════════════════════════════════════════════════════

function filterLeadsByDate(leads: Lead[], type: ReportType, range: DateRange): Lead[] {
  if (type === "attendance") return []; // attendance uses its own API fetch
  const field = FILTER_DATE_FIELD[type];
  switch (field) {
    case "updated_at":
      return leads.filter(l => inRange(l.updated_at, range));
    case "both":
      return leads.filter(l => l.created_at && l.updated_at && inRange(l.created_at, range));
    default:
      return leads.filter(l => inRange(l.created_at, range));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Transform functions
// ═══════════════════════════════════════════════════════════════════════════════

function transformAdmissions(leads: Lead[], sMap: Record<string, string>): AdmissionRow[] {
  const CONVERTED = new Set(["Converted", "Closed", "Admission"]);
  return leads
    .filter(l => CONVERTED.has(l.lead_status || ""))
    .map(l => ({
      id:       leadId(l),
      name:     safeStr(l.full_name, "N/A"),
      program:  safeStr(l.interested_course, "General"),
      phone:    safeStr(l.phone, "—"),
      date:     fmtDate(l.updated_at),
      source:   resolveSourceName(l, sMap),
      counselor: getCounselor(l),
    }));
}

function transformVelocity(leads: Lead[], sMap: Record<string, string>): VelocityRow[] {
  return leads
    .filter(l => l.lead_status === "Converted" && l.created_at && l.updated_at)
    .map(l => {
      const raw   = String(l.created_at!).split("T")[0];
      const raw2  = String(l.updated_at!).split("T")[0];
      const [y1, m1, d1] = raw.split("-").map(Number);
      const [y2, m2, d2] = raw2.split("-").map(Number);
      const created   = new Date(y1, m1 - 1, d1);
      const converted = new Date(y2, m2 - 1, d2);
      const days      = Math.max(1, Math.ceil((converted.getTime() - created.getTime()) / 86_400_000));
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
    if (!map.has(name)) map.set(name, { counselor: name, total: 0, new_: 0, contacted: 0, interested: 0, won: 0, lost: 0, convRate: "0%" });
    const row = map.get(name)!;
    row.total++;
    const s = l.lead_status || "";
    if      (s === "New")                                  row.new_++;
    else if (s === "Contacted")                            row.contacted++;
    else if (s === "Interested")                           row.interested++;
    else if (s === "Converted" || s === "Closed")          row.won++;
    else if (["Lost","Not Interested","Rejected"].includes(s)) row.lost++;
  });
  return Array.from(map.values())
    .map(r => ({ ...r, convRate: r.total > 0 ? `${((r.won / r.total) * 100).toFixed(1)}%` : "0%" }))
    .sort((a, b) => b.won - a.won);
}

function transformSources(leads: Lead[], sMap: Record<string, string>): SourceRow[] {
  const map = new Map<string, SourceRow>();
  leads.forEach(l => {
    const src = resolveSourceName(l, sMap);
    if (!map.has(src)) map.set(src, { source: src, total: 0, interested: 0, won: 0, lost: 0, convRate: "0%" });
    const row = map.get(src)!;
    row.total++;
    const s = l.lead_status || "";
    if (s === "Interested")                                row.interested++;
    if (s === "Converted" || s === "Closed")               row.won++;
    if (["Lost","Not Interested","Rejected"].includes(s))  row.lost++;
  });
  return Array.from(map.values())
    .map(r => ({ ...r, convRate: r.total > 0 ? `${((r.won / r.total) * 100).toFixed(1)}%` : "0%" }))
    .sort((a, b) => b.total - a.total);
}

function transformLost(leads: Lead[], sMap: Record<string, string>): LostRow[] {
  const LOST = new Set(["Lost","Not Interested","Rejected"]);
  return leads
    .filter(l => LOST.has(l.lead_status || ""))
    .map(l => ({
      id:        leadId(l),
      name:      safeStr(l.full_name, "N/A"),
      phone:     safeStr(l.phone, "—"),
      course:    safeStr(l.interested_course, "General"),
      source:    resolveSourceName(l, sMap),
      counselor: getCounselor(l),
      status:    safeStr(l.lead_status, "—"),
      date:      fmtDate(l.updated_at),
    }));
}

function transformAttendance(logs: any[]): AttendanceRow[] {
  const map = new Map<string, AttendanceRow & { _present: number; _total: number }>();

  logs.forEach(log => {
    const name = safeStr(log.user_name || log.name, "Unknown");
    if (!map.has(name)) {
      map.set(name, {
        name,
        role:         safeStr(log.role || log.user_role, "Staff"),
        totalDays:    0,
        present:      0,
        absent:       0,
        lateArrivals: 0,
        percentage:   "0.0%",
        _present:     0,
        _total:       0,
      });
    }
    const row = map.get(name)!;
    row.totalDays++;
    row._total++;

    const status = String(log.status || "").trim().toLowerCase();

    if (status === "present") {
      row.present++;
      row._present++;

      // Late arrival check — handles ISO string, SQL TIME, and Date object
      if (log.check_in) {
        let h = 0, min = 0;
        const ci = log.check_in;

        if (ci instanceof Date) {
          h = ci.getHours(); min = ci.getMinutes();
        } else if (typeof ci === "string" && (ci.includes("T") || ci.match(/^\d{4}-/))) {
          // ISO datetime string — parse without UTC shift by splitting
          const timePart = ci.split("T")[1] || "";
          const [hh, mm] = timePart.split(":").map(Number);
          h = hh || 0; min = mm || 0;
        } else if (typeof ci === "string" && ci.includes(":")) {
          // SQL TIME "09:30:00"
          const [hh, mm] = ci.split(":").map(Number);
          h = hh || 0; min = mm || 0;
        }

        // Late threshold: 09:15
        if (h > 9 || (h === 9 && min > 15)) row.lateArrivals++;
      }
    } else {
      row.absent++;
    }
  });

  return Array.from(map.values())
    .map(r => ({
      name:         r.name,
      role:         r.role,
      totalDays:    r.totalDays,
      present:      r.present,
      absent:       r.absent,
      lateArrivals: r.lateArrivals,
      percentage:   r._total > 0 ? `${((r._present / r._total) * 100).toFixed(1)}%` : "0.0%",
    }))
    .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
}

// FIX 2: attendance takes raw logs, not Lead[]
function transformLeads(type: ReportType, data: any[], sMap: Record<string, string>): AnyRow[] {
  switch (type) {
    case "attendance":  return transformAttendance(data);
    case "admissions":  return transformAdmissions(data as Lead[], sMap);
    case "velocity":    return transformVelocity(data as Lead[], sMap);
    case "performance": return transformPerformance(data as Lead[]);
    case "sources":     return transformSources(data as Lead[], sMap);
    case "lost":        return transformLost(data as Lead[], sMap);
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
    ...data.map(row => keys.map(k => `"${(row as any)[k] ?? ""}"`).join(",")),
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
// Badge
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

// ═══════════════════════════════════════════════════════════════════════════════
// FIX 1: ReportRow — single switch, no duplicate cases
// ═══════════════════════════════════════════════════════════════════════════════

function ReportRow({ row, type }: { row: AnyRow; type: ReportType }) {
  const cell    = "px-4 py-3 text-[11px] text-gray-700 dark:text-gray-300";
  const idCls   = `${cell} font-mono text-[10px] text-blue-600 dark:text-blue-400 font-black whitespace-nowrap`;
  const numCls  = `${cell} tabular-nums font-semibold text-center`;

  switch (type) {

    case "attendance": {
      const r = row as AttendanceRow;
      return (
        <tr className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0">
          <td className={`${cell} font-semibold text-gray-900 dark:text-gray-100`}>{r.name}</td>
          <td className={cell}>
            <Badge color="blue">{r.role}</Badge>
          </td>
          <td className={numCls}>{r.totalDays}</td>
          <td className={`${numCls} text-emerald-600 dark:text-emerald-400 font-black`}>{r.present}</td>
          <td className={`${numCls} text-rose-500 dark:text-rose-400`}>{r.absent}</td>
          <td className={`${cell} text-center`}>
            <Badge color={r.lateArrivals > 3 ? "red" : r.lateArrivals > 0 ? "yellow" : "green"}>
              {r.lateArrivals} {r.lateArrivals === 1 ? "time" : "times"}
            </Badge>
          </td>
          <td className={`${cell} text-center`}>
            <Badge color={parseFloat(r.percentage) >= 90 ? "green" : parseFloat(r.percentage) >= 75 ? "yellow" : "red"}>
              {r.percentage}
            </Badge>
          </td>
        </tr>
      );
    }

    case "admissions": {
      const r = row as AdmissionRow;
      return (
        <tr className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0">
          <td className={idCls}>{r.id}</td>
          <td className={`${cell} font-semibold text-gray-900 dark:text-gray-100`}>{r.name}</td>
          <td className={cell}>{r.program}</td>
          <td className={`${cell} tabular-nums`}>{r.phone}</td>
          <td className={`${cell} whitespace-nowrap`}>{r.date}</td>
          <td className={cell}><Badge color={SOURCE_COLORS[r.source] || "gray"}>{r.source}</Badge></td>
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
            <Badge color={r.days <= 7 ? "green" : r.days <= 30 ? "yellow" : "red"}>{r.days}d</Badge>
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
          <td className={`${cell} text-center`}><Badge color="green">{r.convRate}</Badge></td>
        </tr>
      );
    }

    case "sources": {
      const r = row as SourceRow;
      return (
        <tr className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0">
          <td className={`${cell} font-semibold text-gray-900 dark:text-gray-100`}>
            <Badge color={SOURCE_COLORS[r.source] || "gray"}>{r.source}</Badge>
          </td>
          <td className={`${numCls} font-black`}>{r.total}</td>
          <td className={`${numCls} text-indigo-600 dark:text-indigo-400`}>{r.interested}</td>
          <td className={`${numCls} text-emerald-600 dark:text-emerald-400 font-black`}>{r.won}</td>
          <td className={`${numCls} text-rose-500 dark:text-rose-400`}>{r.lost}</td>
          <td className={`${cell} text-center`}><Badge color="green">{r.convRate}</Badge></td>
        </tr>
      );
    }

    case "lost": {
      const r = row as LostRow;
      return (
        <tr className="hover:bg-rose-50/10 dark:hover:bg-rose-900/10 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0">
          <td className={idCls}>{r.id}</td>
          <td className={`${cell} font-semibold text-gray-900 dark:text-gray-100`}>{r.name}</td>
          <td className={`${cell} tabular-nums`}>{r.phone}</td>
          <td className={cell}>{r.course}</td>
          <td className={cell}><Badge color={SOURCE_COLORS[r.source] || "gray"}>{r.source}</Badge></td>
          <td className={cell}>{r.counselor}</td>
          <td className={cell}><Badge color="red">{r.status}</Badge></td>
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
  const [reportType,    setReportType]    = useState<ReportType>("admissions");
  const [reportResults, setReportResults] = useState<AnyRow[]>([]);
  const [period,        setPeriod]        = useState<Period>("monthly");
  const [customFrom,    setCustomFrom]    = useState(toISO(new Date(TODAY.getFullYear(), 0, 1)));
  const [customTo,      setCustomTo]      = useState(toISO(TODAY));
  const [allLeads,      setAllLeads]      = useState<Lead[]>([]);
  const [loadingLeads,  setLoadingLeads]  = useState(false);
  const [generated,     setGenerated]     = useState(false);
  const [generating,    setGenerating]    = useState(false);
  const [moduleOpen,    setModuleOpen]    = useState(false);
  // FIX 4: consistent string keys
  const [sourceMap,     setSourceMap]     = useState<Record<string, string>>({});

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

  // Load source map
  useEffect(() => {
    apiGet("/api/lead-sources")
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data ?? res?.sources ?? []);
        const map: Record<string, string> = {};
        list.forEach((s: any) => {
          if (s.id !== undefined && s.name) map[String(s.id)] = String(s.name);
        });
        setSourceMap(map);
      })
      .catch(() => {}); // silent — will fall back to field names on lead
  }, []);

  // Reset when config changes
  useEffect(() => {
    setGenerated(false);
    setReportResults([]);
  }, [reportType, period, customFrom, customTo]);

  // ── Date range ─────────────────────────────────────────────────────────────
  const dateRange = useMemo<DateRange>(() => {
    if (period === "custom") {
      return {
        from: new Date(customFrom + "T00:00:00"),
        to:   new Date(customTo   + "T23:59:59"),
      };
    }
    return getPeriodRange(period);
  }, [period, customFrom, customTo]);

  // ── Filtered leads (memoised) ──────────────────────────────────────────────
  const filteredLeads = useMemo(
    () => filterLeadsByDate(allLeads, reportType, dateRange),
    [allLeads, reportType, dateRange]
  );

  const previewData = useMemo<AnyRow[]>(
    () => (generated ? reportResults : []),
    [generated, reportResults]
  );

  const periodLabel = useMemo(() => {
    if (period === "custom") return `${customFrom} → ${customTo}`;
    return PERIODS.find(p => p.id === period)?.label ?? "";
  }, [period, customFrom, customTo]);

  // ── Generate ───────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    const tid = toast.loading("Generating report…");
    try {
      if (reportType === "attendance") {
        // FIX 6: Attendance has its own dedicated API fetch — never uses filteredLeads
        const url = `/api/attendance/all?start_date=${toISO(dateRange.from)}&end_date=${toISO(dateRange.to)}`;
        const res = await apiGet(url);
        const logs: any[] = Array.isArray(res) ? res : (res?.data ?? res?.logs ?? []);

        if (!logs.length) {
          setGenerated(false);
          toast.error("No attendance records found for this period", { id: tid });
          return;
        }

        const transformed = transformAttendance(logs);
        setReportResults(transformed);
        setGenerated(true);
        toast.success(`${transformed.length} staff records generated`, { id: tid });

      } else {
        // All other report types use filtered leads
        if (!filteredLeads.length) {
          setGenerated(false);
          toast.error("No records found for this period", { id: tid });
          return;
        }

        const transformed = transformLeads(reportType, filteredLeads, sourceMap);
        setReportResults(transformed);
        setGenerated(true);
        toast.success(`${transformed.length} records generated`, { id: tid });
      }
    } catch (err) {
      console.error("Report generation error:", err);
      toast.error("Failed to generate report", { id: tid });
    } finally {
      setGenerating(false);
    }
  }, [reportType, dateRange, filteredLeads, sourceMap]);

  const handleExportCSV = () =>
    exportCSV(previewData, `${reportType}_${period}_${toISO(TODAY)}.csv`);

  const activeModule = REPORT_MODULES.find(m => m.id === reportType) ?? REPORT_MODULES[0];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-12">
      <Toaster position="top-right" />

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
              <Globe size={16} className="text-white" />
            </span>
            Reporting Centre
          </h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1 flex items-center gap-2">
            Intelligence Unit
            {loadingLeads
              ? <span className="text-amber-500 animate-pulse">· Syncing data…</span>
              : <span className="text-emerald-500">· {allLeads.length} leads loaded</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-black uppercase hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm transition-all">
            <Printer size={13} /><span className="hidden sm:inline">Print</span>
          </button>
          <button type="button" onClick={handleExportCSV} disabled={!previewData.length}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-gray-900 dark:bg-gray-700 text-white rounded-xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            <Download size={13} /><span className="hidden sm:inline">Export CSV</span><span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* ── Mobile type picker ── */}
        <div className="lg:hidden">
          <button type="button" onClick={() => setModuleOpen(v => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-blue-600 text-white rounded-2xl shadow-lg">
            <div className="flex items-center gap-2.5">
              <span className="opacity-80">{activeModule.icon}</span>
              <div className="text-left">
                <p className="text-[11px] font-black uppercase tracking-widest">{activeModule.label}</p>
                <p className="text-[9px] text-blue-200">{activeModule.description}</p>
              </div>
            </div>
            <ChevronDown size={15} className={`transition-transform duration-200 ${moduleOpen ? "rotate-180" : ""}`} />
          </button>

          {moduleOpen && (
            <div className="mt-1.5 space-y-1.5">
              {REPORT_MODULES.filter(m => m.id !== reportType).map(mod => (
                <button key={mod.id} type="button"
                  onClick={() => { setReportType(mod.id); setModuleOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-left hover:border-blue-200 transition-all shadow-sm">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl shrink-0">{mod.icon}</div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-900 dark:text-gray-100">{mod.label}</p>
                    <p className="text-[10px] text-gray-400">{mod.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Desktop sidebar ── */}
        <div className="hidden lg:flex lg:col-span-1 flex-col gap-2">
          {REPORT_MODULES.map(mod => (
            <button key={mod.id} type="button"
              onClick={() => setReportType(mod.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left ${
                reportType === mod.id
                  ? "bg-blue-600 border-blue-600 text-white shadow-lg"
                  : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-700"
              }`}>
              <div className={`p-2 rounded-xl shrink-0 ${reportType === mod.id ? "bg-white/20" : "bg-blue-50 dark:bg-blue-900/30 text-blue-600"}`}>
                {mod.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{mod.label}</p>
                <p className={`text-[10px] mt-0.5 truncate ${reportType === mod.id ? "text-blue-100" : "text-gray-400"}`}>
                  {mod.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* ── Main area ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Period + generate */}
          <div className="bg-white dark:bg-gray-900 px-4 sm:px-5 py-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest shrink-0">Period:</span>
              {PERIODS.map(p => (
                <button key={p.id} type="button" onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    period === p.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>

            {period === "custom" && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                <Calendar size={13} className="text-blue-600 shrink-0" />
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="bg-transparent text-[11px] font-bold outline-none dark:text-white" />
                <ArrowRight size={11} className="text-gray-300 hidden sm:block" />
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="bg-transparent text-[11px] font-bold outline-none dark:text-white" />
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap text-[10px]">
                <span className="font-black text-gray-400 uppercase tracking-widest">Scope:</span>
                <span className="font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full">{periodLabel}</span>
                <span className="text-gray-400 font-medium">
                  {reportType === "attendance"
                    ? "· Fetched on Generate"
                    : `· ${filteredLeads.length} leads in range`}
                </span>
              </div>

              <div className="flex gap-2">
                {generated && (
                  <button type="button" onClick={() => { setGenerated(false); setReportResults([]); }}
                    className="flex items-center gap-1 px-3.5 py-2 text-rose-500 text-[10px] font-black uppercase hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors">
                    <X size={12} /> Clear
                  </button>
                )}
                <button type="button" onClick={handleGenerate} disabled={generating || loadingLeads}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95">
                  {generating
                    ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</>
                    : loadingLeads ? "Syncing…" : "Generate"
                  }
                </button>
              </div>
            </div>
          </div>

          {/* Results table */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">

            <div className="px-4 sm:px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex justify-between items-center gap-3">
              <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest min-w-0">
                <FileSpreadsheet size={13} className="text-emerald-500 shrink-0" />
                <span className="truncate">{activeModule.label}</span>
                <span className="text-gray-300 dark:text-gray-700 shrink-0">·</span>
                <span className="text-blue-600 dark:text-blue-400 truncate">{periodLabel}</span>
              </div>
              <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                {previewData.length} records
              </span>
            </div>

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
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] min-w-[560px]">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 text-left">
                      {HEADERS[reportType].map(h => (
                        <th key={h} className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
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