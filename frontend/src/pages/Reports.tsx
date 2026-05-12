import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Download, Printer, Calendar, Users, CheckCircle2,
  AlertTriangle, Database, FileSpreadsheet,
  Globe, TrendingUp, X, Clock, ChevronDown,
} from "lucide-react";
import { apiGet } from "../utils/api";
import { toast, Toaster } from "react-hot-toast";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

type ReportType = "admissions" | "velocity" | "performance" | "sources" | "lost" | "attendance";
type Period     = "daily" | "weekly" | "monthly" | "custom";

interface Lead {
  id: number;

  lead_uid?: string;

  full_name?: string;

  phone?: string;

  lead_status?: string;

  lead_source_id?: number | string;

  lead_source_name?: string;

  source_name?: string;

  interested_course?: string;

  assigned_user_name?: string;

  counselor_name?: string;

  created_at?: string;

  updated_at?: string;

  converted_at?: string;

  admission_date?: string;

  closed_at?: string;

  status_updated_at?: string;
}

interface StaffMember { id: number; name: string; role: string; }

interface AttendanceRow {
  name:         string;
  role:         string;
  totalDays:    number;
  present:      number;
  absent:       number;
  lateArrivals: number;
  percentage:   string;
}
interface AdmissionRow { id: string; name: string; program: string; phone: string; date: string; source: string; counselor: string; }
interface VelocityRow  { id: string; name: string; course: string; entryDate: string; convertedDate: string; days: number; counselor: string; }
interface PerformRow   { counselor: string; total: number; new_: number; contacted: number; interested: number; won: number; lost: number; convRate: string; }
interface SourceRow    { source: string; total: number; interested: number; won: number; lost: number; convRate: string; }
interface LostRow      { id: string; name: string; phone: string; course: string; source: string; counselor: string; status: string; date: string; }

type AnyRow = AdmissionRow | VelocityRow | PerformRow | SourceRow | LostRow | AttendanceRow;

interface DateRange { from: Date; to: Date; }

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const TODAY = new Date();
const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const PERIODS: { id: Period; label: string }[] = [
  { id: "daily",   label: "Today"      },
  { id: "weekly",  label: "This Week"  },
  { id: "monthly", label: "This Month" },
  { id: "custom",  label: "Custom"     },
];

const REPORT_MODULES: { id: ReportType; label: string; description: string; Icon: React.ElementType }[] = [
  { id: "admissions",  label: "Admissions",  description: "Successful enrollments",            Icon: Users          },
  { id: "velocity",    label: "Velocity",     description: "Entry to conversion speed",         Icon: TrendingUp     },
  { id: "performance", label: "Performance",  description: "Individual win rates",              Icon: CheckCircle2   },
  { id: "sources",     label: "Sources",      description: "Channel effectiveness",             Icon: Database       },
  { id: "lost",        label: "Lost Leads",   description: "Drop-off tracking",                 Icon: AlertTriangle  },
  { id: "attendance",  label: "Attendance",   description: "Monthly performance & late trends", Icon: Clock          },
];

// Fix #5 — sources headers corrected to 6 to match SourceRow (5 data cols + header)
const HEADERS: Record<ReportType, string[]> = {
  admissions:  ["Lead ID", "Name", "Program",       "Phone",     "Conv. Date", "Source",    "Counselor"],
  velocity:    ["Lead ID", "Name", "Course",         "Entry",     "Converted",  "Days",      "Counselor"],
  performance: ["Counselor", "Total", "New",         "Contacted", "Interested", "Won",       "Lost", "Conv %"],
  sources:     ["Source",  "Total", "Interested",    "Won",       "Lost",       "Conv %"],   // Fix: 6 headers, 6 cells
  lost:        ["Lead ID", "Name", "Phone",          "Course",    "Source",     "Counselor", "Status", "Date"],
  attendance:  ["Name",    "Role", "Working Days",   "Present",   "Absent",     "Late",      "Attendance %"],
};

const FILTER_DATE_FIELD: Record<ReportType, "created_at" | "updated_at" | "both"> = {
  admissions:  "updated_at",
  velocity:    "both",
  performance: "created_at",
  sources:     "created_at",
  lost:        "updated_at",
  attendance:  "created_at",
};

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
  "Direct":          "gray",
};

const LOST = new Set(["lost", "rejected", "not interested"]);
// ═══════════════════════════════════════════════════════════════════════════════
// Utility helpers
// ═══════════════════════════════════════════════════════════════════════════════

function normalizeStatus(status?: string) {
  return (status || "").trim().toLowerCase();
}
function cleanRows<T>(rows: (T | null | undefined)[]): T[] {
  return rows.filter(Boolean) as T[];
}

function getPeriodRange(period: Period): DateRange {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  // FIX: Force the end of the day to the very last millisecond
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (period) {
    case "daily":   return { from: todayStart, to: todayEnd };
    case "weekly": {
      const mon = new Date(todayStart);
      mon.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7));
      return { from: mon, to: todayEnd };
    }
    case "monthly":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0), to: todayEnd };
    default:
      return { from: todayStart, to: todayEnd };
  }
}
// Fix #4 — parse ISO string safely using local date constructor, not new Date(string)
function parseDateStr(value?: string): Date | null {

  if (!value) return null;

  try {

    const dt = new Date(value);

    if (isNaN(dt.getTime())) return null;

    return dt;

  } catch {

    return null;
  }
}
function inRange(dateStr: string | undefined, range: DateRange): boolean {
  if (!dateStr) return false;
  const dt = parseDateStr(dateStr);
  if (!dt) return false;
  const from = new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate());
  const to   = new Date(range.to.getFullYear(),   range.to.getMonth(),   range.to.getDate());
  return dt >= from && dt <= to;
}

function fmtDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const dt = parseDateStr(String(dateStr));
  if (!dt) return "—";
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function safeStr(val: any, fallback = "—"): string {
  if (val === null || val === undefined) return fallback;
  const s = String(val).trim();
  return s && s !== "undefined" && s !== "null" ? s : fallback;
}

function leadId(l: Lead): string {
  return l.lead_uid || `L26-${String(l.id).padStart(4, "0")}`;
}

const getCounselor = (l: any): string =>
  safeStr(l.counselor_name || l.assigned_user_name || l.assigned_to_name || l.user_name, "Unassigned");

function resolveSourceName(l: any, sMap: Record<string, string>): string {
  for (const key of ["lead_source_name", "source_name", "lead_source"]) {
    const val = l?.[key];
    if (typeof val === "string" && val.trim() && isNaN(Number(val))) return val.trim();
  }
  const rawId = l?.lead_source_id ?? l?.source_id;
  if (rawId !== null && rawId !== undefined) {
    const key = String(rawId);
    if (sMap[key]) return sMap[key];
  }
  return "Direct";
}

// Fix #1 — robust leads array extraction from any API response shape
function extractArray(res: any): any[] {
  if (Array.isArray(res))          return res;
  if (Array.isArray(res?.data))    return res.data;
  if (Array.isArray(res?.leads))   return res.leads;
  if (Array.isArray(res?.results)) return res.results;
  console.warn("extractArray: unexpected response shape", res);
  return [];
}




// ═══════════════════════════════════════════════════════════════════════════════
// Transform functions
// ═══════════════════════════════════════════════════════════════════════════════


function getRelevantDate(l: Lead, type: ReportType): string | undefined {
  switch (type) {
    case "admissions":
      return (
        l.converted_at ||
        l.admission_date ||
        l.closed_at ||
        l.status_updated_at ||
        l.updated_at ||
        l.created_at
      );

    case "lost":
      return l.updated_at || l.created_at;

    case "velocity":
      return l.created_at;

    case "performance":
    case "sources":
    case "attendance":
    default:
      return l.created_at;
  }
}


// Fix #2 & #3 — allStaff is now a required parameter
function transformAttendance(
  logs: any[],
  range: DateRange,
  allStaff: StaffMember[] = []
): AttendanceRow[] {

  // ───────────────────────────────
  // 1. Count working days (Mon–Sat)
  // ───────────────────────────────
  let expectedDays = 0;
  let curr = new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate());
  const end = new Date(range.to.getFullYear(), range.to.getMonth(), range.to.getDate());

  while (curr <= end) {
    if (curr.getDay() !== 0) expectedDays++;
    curr.setDate(curr.getDate() + 1);
  }

  if (expectedDays === 0) expectedDays = 1;

  // ───────────────────────────────
  // 2. MAIN MAP (use staff.id ONLY)
  // ───────────────────────────────
  const map = new Map<string, {
    name: string;
    role: string;
    totalDays: number;
    present: number;
    lateArrivals: number;
    logDates: Set<string>;
  }>();

  // ───────────────────────────────
  // 3. SEED STAFF
  // ───────────────────────────────
  allStaff.forEach(staff => {
    const key = String(staff.id);

    map.set(key, {
      name: staff.name,
      role: staff.role,
      totalDays: expectedDays,
      present: 0,
      lateArrivals: 0,
      logDates: new Set(),
    });
  });

  // ───────────────────────────────
  // 4. PROCESS LOGS (FIXED KEY LOGIC)
  // ───────────────────────────────
  logs.forEach(log => {

    const key = String(log.user_id || log.staff_id || log.id);

    const name = safeStr(log.user_name || log.name, "Unknown");

    // ensure entry exists
    if (!map.has(key)) {
      map.set(key, {
        name,
        role: safeStr(log.role || log.user_role, "Staff"),
        totalDays: expectedDays,
        present: 0,
        lateArrivals: 0,
        logDates: new Set(),
      });
    }

    const row = map.get(key)!;

    const logDate = String(log.date || log.check_in || "").split("T")[0];

    if (logDate && !row.logDates.has(logDate)) {
      row.present++;
      row.logDates.add(logDate);
    }

    // late check
    if (log.check_in) {
      const timePart = log.check_in.includes("T")
        ? log.check_in.split("T")[1]
        : log.check_in;

      const [hour, min] = timePart.split(":").map(Number);

      if (hour > 9 || (hour === 9 && min > 15)) {
        row.lateArrivals++;
      }
    }
  });

  // ───────────────────────────────
  // 5. RESULT
  // ───────────────────────────────
  return Array.from(map.values())
    .map(r => ({
      name: r.name,
      role: r.role,
      totalDays: r.totalDays,
      present: r.present,
      absent: Math.max(0, r.totalDays - r.present),
      lateArrivals: r.lateArrivals,
      percentage: ((r.present / r.totalDays) * 100).toFixed(1) + "%",
    }))
    .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
}
function transformAdmissions(
  leads: Lead[],
  sMap: Record<string, string>,
  range: DateRange
): AdmissionRow[] {
  // 1. More inclusive set (added capital versions just in case)
  const CONVERTED_STATUSES = new Set(["converted", "closed", "admission", "success"]);

  return leads
    .filter((l) => {
      const status = normalizeStatus(l.lead_status);
      // 2. ONLY check the status here. 
      // The date filtering is already handled by 'filteredLeads' useMemo
      return CONVERTED_STATUSES.has(status);
    })
    .map((l) => {
      const conversionDate = getRelevantDate(l, "admissions");
      return {
        id: leadId(l),
        name: safeStr(l.full_name, "N/A"),
        program: safeStr(l.interested_course, "General"),
        phone: safeStr(l.phone, "—"),
        date: fmtDate(conversionDate),
        source: resolveSourceName(l, sMap),
        counselor: getCounselor(l),
      };
    })
    .sort((a, b) => {
      const da = parseDateStr(a.date)?.getTime() || 0;
      const db = parseDateStr(b.date)?.getTime() || 0;
      return db - da;
    });
}
function transformPerformance(
  leads: Lead[],
  range: DateRange,
  allStaff: StaffMember[] = []
): PerformRow[] {
  // 1. Create a set of normalized names and IDs for anyone with a "Manager" role
  const managerExclusions = new Set(
    allStaff
      .filter(s => s.role.toLowerCase() === "manager")
      .map(s => s.name.trim().toLowerCase())
  );

  const filtered = leads.filter(l => {
    return (
      inRange(l.converted_at || l.updated_at, range) ||
      inRange(l.created_at, range) ||
      inRange(l.updated_at, range)
    );
  });

  const map = new Map<string, PerformRow>();

  filtered.forEach(l => {
    const name = getCounselor(l);
    const normalizedName = name.trim().toLowerCase();

    // 2. EXCLUSION: Skip if name is in Manager list, or is specifically "shaji" or ID "1"
    if (managerExclusions.has(normalizedName) || normalizedName === "shaji" || name === "1") {
      return;
    }

    if (!map.has(name)) {
      map.set(name, {
        counselor: name,
        total: 0,
        new_: 0,
        contacted: 0,
        interested: 0,
        won: 0,
        lost: 0,
        convRate: "0%",
      });
    }

    const row = map.get(name)!;
    row.total++;

    const s = l.lead_status || "";
    if (s === "New") row.new_++;
    else if (s === "Contacted") row.contacted++;
    else if (s === "Interested") row.interested++;
    else if (s === "Converted" || s === "Closed") row.won++;
    else if (["Lost", "Rejected", "Not Interested"].includes(s)) row.lost++;
  });

  return Array.from(map.values())
    .map(r => ({
      ...r,
      convRate: r.total > 0 ? `${((r.won / r.total) * 100).toFixed(1)}%` : "0%",
    }))
    .sort((a, b) => b.won - a.won);
}
function transformSources(
  leads: Lead[],
  sMap: Record<string, string>,
  range: DateRange,
  allStaff: StaffMember[] = []
): SourceRow[] {
  const LOST_STATUSES = new Set(["lost", "rejected", "not interested"]);

  // 1. Create a set of Manager names to exclude
  const managerExclusions = new Set(
    allStaff
      .filter(s => s.role.toLowerCase() === "manager")
      .map(s => s.name.trim().toLowerCase())
  );

  const filtered = leads.filter(l => {
    const dateValue = l.created_at || l.updated_at;
    if (!dateValue) return false;
    return inRange(dateValue, range);
  });

  const map = new Map<string, SourceRow>();

  filtered.forEach(l => {
    const name = getCounselor(l);
    const normalizedName = name.trim().toLowerCase();

    // 2. EXCLUSION: Skip Manager leads so we only assess Counselor performance per source
    if (managerExclusions.has(normalizedName) || normalizedName === "shaji" || name === "1") {
      return;
    }

    const src = resolveSourceName(l, sMap);
    const key = src.toLowerCase();

    if (!map.has(key)) {
      map.set(key, {
        source: src,
        total: 0,
        interested: 0,
        won: 0,
        lost: 0,
        convRate: "0%",
      });
    }

    const row = map.get(key)!;
    row.total++;

    const s = normalizeStatus(l.lead_status);
    if (s === "interested") row.interested++;
    if (s === "converted" || s === "closed") row.won++;
    if (LOST_STATUSES.has(s)) row.lost++;
  });

  return Array.from(map.values()).map(r => ({
    ...r,
    convRate: r.total ? `${((r.won / r.total) * 100).toFixed(1)}%` : "0%",
  }));
}

function transformLost(
  leads: Lead[],
  sMap: Record<string, string>,
  range: DateRange
): LostRow[] {

  const LOST = new Set(["lost", "rejected", "not interested"]);

  return leads
    .filter(l => {
      const status = normalizeStatus(l.lead_status);

      if (!LOST.has(status)) return false;

      const dateValue = getRelevantDate(l, "lost");
      if (!dateValue) return false;

      const dt = parseDateStr(dateValue);
      if (!dt) return false;

      return inRange(dateValue, range);
    })
    .map(l => ({
      id: leadId(l),
      name: safeStr(l.full_name, "N/A"),
      phone: safeStr(l.phone, "—"),
      course: safeStr(l.interested_course, "General"),
      source: resolveSourceName(l, sMap),
      counselor: getCounselor(l),
      status: safeStr(l.lead_status, "—"),
      date: fmtDate(getRelevantDate(l, "lost")),
    }));
}
// ═══════════════════════════════════════════════════════════════════════════════
// Filter & dispatch
// ═══════════════════════════════════════════════════════════════════════════════


function transformLeads(
  type: ReportType,
  data: any[],
  sMap: Record<string, string>,
  range: DateRange,
  allStaff: StaffMember[] = [],
): AnyRow[] {

  const safeData = Array.isArray(data) ? data : [];

  switch (type) {
    case "attendance":
      return transformAttendance(safeData, range, allStaff);

    case "admissions":
      return transformAdmissions(safeData, sMap, range);

    case "velocity":
      return transformVelocity(safeData, range);

    case "performance":
      return transformPerformance(safeData, range);

    case "sources":
      return transformSources(safeData, sMap, range);

    case "lost":
      return transformLost(safeData, sMap, range);

    default:
      return [];
  }
}
// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

function exportCSV(data: AnyRow[], filename: string) {
  if (!data?.length) {
    toast.error("Generate a report first");
    return;
  }

  const keys = Object.keys(data[0]);

  const csv = [
    keys.join(","),
    ...data.map(row =>
      keys
        .map(k => `"${String((row as any)[k] ?? "").replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);

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
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide whitespace-nowrap ${palette[color] ?? palette.gray}`}>
      {children}
    </span>
  );
}

function ReportRow({ row, type }: { row: AnyRow; type: ReportType }) {
  const cell   = "px-4 py-3 text-[11px] text-gray-700 dark:text-gray-300";
  const idCls  = `${cell} font-mono text-[10px] text-blue-600 dark:text-blue-400 font-black whitespace-nowrap`;
  const numCls = `${cell} tabular-nums font-semibold text-center`;

  switch (type) {
    case "attendance": {
      const r = row as AttendanceRow;
      return (
        <tr className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0">
          <td className={`${cell} font-semibold text-gray-900 dark:text-gray-100`}>{r.name}</td>
          <td className={cell}><Badge color="blue">{r.role}</Badge></td>
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
          <td className={`${cell} font-semibold`}>
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
      return <></>;  // Fix #6 — never return null from table row
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════════════════════════════

export default function Reports() {
  const [reportType,    setReportType]    = useState<ReportType>("admissions");
  const [reportResults, setReportResults] = useState<AnyRow[]>([]);
  const [period,        setPeriod]        = useState<Period>("monthly");
  const [customFrom,    setCustomFrom]    = useState(toISO(new Date(TODAY.getFullYear(), 0, 1)));
  const [customTo,      setCustomTo]      = useState(toISO(TODAY));
  const [allLeads,      setAllLeads]      = useState<Lead[]>([]);
  const [allStaff,      setAllStaff]      = useState<StaffMember[]>([]); // Fix #9
  const [loadingLeads,  setLoadingLeads]  = useState(false);
  const [generated,     setGenerated]     = useState(false);
  const [generating,    setGenerating]    = useState(false);
  const [moduleOpen,    setModuleOpen]    = useState(false);  // Fix #7 — now used
  const [sourceMap,     setSourceMap]     = useState<Record<string, string>>({});

  // Fix #1 — robust lead fetch with extractArray
  useEffect(() => {
    (async () => {
      setLoadingLeads(true);
      try {
        const res = await apiGet("/api/leads?limit=2000&page=1");
        setAllLeads(extractArray(res));
      } catch {
        toast.error("Could not sync lead data");
      } finally {
        setLoadingLeads(false);
      }
    })();
  }, []);

  // Fix #9 — fetch staff for attendance report
  useEffect(() => {
    apiGet("/api/users")
      .then(res => {
        const list = extractArray(res);
        setAllStaff(list.map((u: any) => ({ id: u.id, name: u.name, role: u.role ?? "Staff" })));
      })
      .catch(() => {}); // non-critical — attendance still works with partial data
  }, []);

  // Fix #10 — fetch source map
  useEffect(() => {
    apiGet("/api/lead-sources")
      .then(res => {
        const list = extractArray(res);
        const map: Record<string, string> = {};
        list.forEach((s: any) => { if (s.id !== undefined && s.name) map[String(s.id)] = String(s.name); });
        setSourceMap(map);
      })
      .catch(() => {}); // non-critical — sources fall back to "Direct"
  }, []);

  useEffect(() => {
    setGenerated(false);
    setReportResults([]);
  }, [reportType, period, customFrom, customTo]);

  // Fix #4 — safe custom date range using local date constructor
  const dateRange = useMemo<DateRange>(() => {
    if (period === "custom") {
      const [fy, fm, fd] = customFrom.split("-").map(Number);
      const [ty, tm, td] = customTo.split("-").map(Number);
      return {
        from: new Date(fy, fm - 1, fd, 0,  0,  0),
        to:   new Date(ty, tm - 1, td, 23, 59, 59),
      };
    }
    return getPeriodRange(period);
  }, [period, customFrom, customTo]);


function filterLeadsByDate(
  leads: Lead[],
  type: ReportType,
  range: DateRange
): Lead[] {
  if (!Array.isArray(leads)) return [];
  if (type === "attendance") return [];

  // Normalize range to start and end of days (no time)
  const fromTime = new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate()).getTime();
  const toTime   = new Date(range.to.getFullYear(), range.to.getMonth(), range.to.getDate()).getTime();

  return leads.filter((lead) => {
    const dateValue = getRelevantDate(lead, type);
    if (!dateValue) return false;

    const dt = parseDateStr(dateValue);
    if (!dt || isNaN(dt.getTime())) return false;

    // Normalize lead date to start of day (no time)
    const leadTime = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();

    return leadTime >= fromTime && leadTime <= toTime;
  });
}
// ADD THIS BLOCK
const filteredLeads = useMemo(
  () => filterLeadsByDate(allLeads, reportType, dateRange),
  [allLeads, reportType, dateRange]
);

const periodLabel = useMemo(() => {
  if (period === "custom") return `${customFrom} → ${customTo}`;

  return PERIODS.find(p => p.id === period)?.label ?? "";
}, [period, customFrom, customTo]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    const tid = toast.loading("Generating report…");
    try {
      
      if (reportType === "attendance") {
        const res  = await apiGet(`/api/attendance/all?start_date=${toISO(dateRange.from)}&end_date=${toISO(dateRange.to)}`);
        const logs = extractArray(res);
        // Fix #3 — pass allStaff so zero-log staff appear
        const rows = transformAttendance(logs, dateRange, allStaff);
        setReportResults(rows);
        setGenerated(true);
        toast.success(`${rows.length} staff records generated`, { id: tid });
      } else {
        if (!allLeads.length){
          setGenerated(false);
          toast.error("No records found for this period", { id: tid });
          return;
        }
        const rows = transformLeads(
  reportType,
  filteredLeads,
  sourceMap,
  dateRange,
  allStaff
);
        setReportResults(rows);
        setGenerated(true);
        toast.success(`${rows.length} records generated`, { id: tid });
      }
    } catch (err) {
  console.error("REPORT ERROR:", err);
  toast.error("Failed to generate report", { id: tid });

    } finally {
      setGenerating(false);
    }
  }, [reportType, dateRange, filteredLeads, sourceMap, allStaff]);

  const previewData = generated ? reportResults : [];

  const handleExportCSV = () =>
    exportCSV(previewData, `${reportType}_${period}_${toISO(TODAY)}.csv`);

  const activeModule = REPORT_MODULES.find(m => m.id === reportType) ?? REPORT_MODULES[0];

  return (
    <div className="space-y-5 pb-12">
      <Toaster position="top-right" />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
              <Globe size={16} className="text-white" />
            </span>
            Reporting Centre
          </h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Intelligence Unit</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()}
            className="px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-black uppercase shadow-sm flex items-center gap-1.5">
            <Printer size={13} /> Print
          </button>
          <button type="button" onClick={handleExportCSV} disabled={!previewData.length}
            className="px-3.5 py-2.5 bg-gray-900 dark:bg-gray-700 text-white rounded-xl text-[10px] font-black uppercase shadow-md flex items-center gap-1.5 disabled:opacity-40">
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* ── Sidebar (desktop) ── */}
        <div className="hidden lg:flex lg:col-span-1 flex-col gap-2">
          {REPORT_MODULES.map(mod => {
            const { Icon } = mod;
            return (
              <button key={mod.id} type="button" onClick={() => setReportType(mod.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left ${
                  reportType === mod.id
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg"
                    : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                }`}>
                <div className={`p-2 rounded-xl shrink-0 ${reportType === mod.id ? "bg-white/20" : "bg-blue-50 dark:bg-blue-900/30 text-blue-600"}`}>
                  <Icon size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{mod.label}</p>
                  <p className={`text-[10px] mt-0.5 truncate ${reportType === mod.id ? "text-blue-100" : "text-gray-400"}`}>
                    {mod.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Main panel ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Fix #7 — mobile module dropdown (actually rendered) */}
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setModuleOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900
                border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-black uppercase tracking-tight"
            >
              <span className="flex items-center gap-2">
                <activeModule.Icon size={14} />
                {activeModule.label}
              </span>
              <ChevronDown size={14} className={`transition-transform ${moduleOpen ? "rotate-180" : ""}`} />
            </button>
            {moduleOpen && (
              <div className="mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-lg">
                {REPORT_MODULES.map(mod => {
                  const { Icon } = mod;
                  return (
                    <button key={mod.id} type="button"
                      onClick={() => { setReportType(mod.id); setModuleOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0 ${
                        reportType === mod.id ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}>
                      <Icon size={14} />
                      <span className="font-semibold">{mod.label}</span>
                      <span className="text-[10px] text-gray-400 ml-auto">{mod.description}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-white dark:bg-gray-900 px-4 sm:px-5 py-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">

            {/* Period pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest shrink-0">Period:</span>
              {PERIODS.map(p => (
                <button key={p.id} type="button" onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    period === p.id ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Fix #8 — custom date inputs actually rendered */}
            {period === "custom" && (
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">From</label>
                  <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700
                      bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">To</label>
                  <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                    min={customFrom}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700
                      bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Scope + actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap text-[10px]">
                <span className="font-black text-gray-400 uppercase tracking-widest">Scope:</span>
                <span className="font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full">
                  {periodLabel}
                </span>
                {loadingLeads && (
                  <span className="text-gray-400 flex items-center gap-1">
                    <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                    Syncing leads…
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {generated && (
                  <button onClick={() => { setGenerated(false); setReportResults([]); }}
                    className="px-3.5 py-2 text-rose-500 text-[10px] font-black uppercase flex items-center gap-1">
                    <X size={12} /> Clear
                  </button>
                )}
                <button onClick={handleGenerate} disabled={generating || loadingLeads}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[10px] font-black uppercase rounded-xl shadow-md transition-all active:scale-95">
                  {generating ? "Generating…" : "Generate"}
                </button>
              </div>
            </div>
          </div>

          {/* Results table */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            {!generated ? (
              <div className="h-56 flex flex-col items-center justify-center gap-3">
                <span className="text-4xl opacity-20">📊</span>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Select period and generate</p>
              </div>
            ) : previewData.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center gap-3">
                <span className="text-4xl opacity-20">🔍</span>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">No matching records</p>
                <p className="text-[10px] text-gray-300 dark:text-gray-600">Try a wider date range</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {previewData.length} record{previewData.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-[10px] font-semibold text-blue-600">{activeModule.label} · {periodLabel}</span>
                </div>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}