// src/pages/StaffPerformance.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, Calendar, Filter, BarChart3,
  CheckCircle2, RefreshCw, Activity, X, Download,
  ArrowUpRight, ArrowDownRight, Zap, RotateCcw, Trophy, ChevronRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { apiGet } from "../utils/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "daily" | "weekly" | "monthly" | "custom";
type SortKey = "performance_score" | "total_leads" | "conversions" | "success_rate" | "speed_score" | "consistency_score";

interface RawStaff {
  id:                 number;
  name:               string;
  role:               string;
  total_leads:        number;
  conversions:        number;
  prev_total_leads:   number;
  prev_conversions:   number;
  avg_response_hours?: number | null;
  followup_count?:     number;
}

interface ScoredStaff extends RawStaff {
  success_rate:      number;
  speed_score:       number;
  consistency_score: number;
  volume_score:      number;
  performance_score: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const toISO = (d: Date) => d.toISOString().split("T")[0];

const PERIODS = [
  { id: "daily",   label: "Today"      },
  { id: "weekly",  label: "This Week"  },
  { id: "monthly", label: "This Month" },
  { id: "custom",  label: "Custom"     },
] as const;

const AVATAR_COLORS = [
  "bg-blue-600","bg-violet-600","bg-rose-600","bg-emerald-600",
  "bg-amber-600","bg-cyan-600","bg-pink-600","bg-indigo-600",
];

// ─── Period helpers ───────────────────────────────────────────────────────────

function getPeriodDates(period: Period): { from: string; to: string } {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (period) {
    case "daily":
      return { from: toISO(today), to: toISO(now) };
    case "weekly": {
      const mon = new Date(today);
      mon.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      return { from: toISO(mon), to: toISO(now) };
    }
    case "monthly":
      return { from: toISO(new Date(today.getFullYear(), today.getMonth(), 1)), to: toISO(now) };
    default:
      return { from: toISO(today), to: toISO(now) };
  }
}

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const avatarColor = (name: string) =>
  AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const getInitials = (name: string) => {
  const p = (name || "").trim().split(" ").filter(Boolean);
  return p.length >= 2
    ? (p[0][0] + p[p.length - 1][0]).toUpperCase()
    : (p[0]?.[0] || "?").toUpperCase();
};

function processStaffData(raw: RawStaff[]): ScoredStaff[] {
  if (!raw.length) return [];

  // 🚀 INTERCEPT 1: Drop administrative roles before math modeling run execution
  const absoluteCleanRaw = raw.filter((r: RawStaff) => {
    const staffRole = String(r.role || "").trim().toLowerCase();
    return staffRole === "counselor" || staffRole === "telecaller";
  });

  if (!absoluteCleanRaw.length) return [];

  const maxLeads = Math.max(...absoluteCleanRaw.map(r => Number(r.total_leads) || 0), 1);

  const scored: ScoredStaff[] = absoluteCleanRaw.map(r => {
    const total = Number(r.total_leads) || 0;
    const conv  = Number(r.conversions) || 0;

    const successRate    = total > 0 ? Math.min(100, (conv / total) * 100) : 0;
    const speedScore     = calculateSpeedScore(r.avg_response_hours);
    const consistScore   = calculateConsistencyScore(r.followup_count, total, conv);
    const volumeNorm     = Math.round((total / maxLeads) * 100);
    const perfScore      = calculatePerformanceScore(successRate, volumeNorm, speedScore, consistScore);

    return {
      ...r,
      total_leads:       total,
      conversions:       conv,
      prev_total_leads:  Number(r.prev_total_leads) || 0,
      prev_conversions:  Number(r.prev_conversions) || 0,
      success_rate:      Math.round(successRate * 10) / 10,
      speed_score:       speedScore,
      consistency_score: consistScore,
      volume_score:      volumeNorm,
      performance_score: perfScore,
    };
  });
  
  return scored.sort((a, b) => b.performance_score - a.performance_score);
}

function calculateSpeedScore(avgHours: number | null | undefined): number {
  if (avgHours === null || avgHours === undefined) return 0;
  const h = Number(avgHours);
  if (!isFinite(h) || h < 0) return 0;
  if (h < 2)  return 100;
  if (h < 6)  return 80;
  if (h < 24) return 60;
  return 30;
}

// ─── Score formulas ───────────────────────────────────────────────────────────

function calculateConsistencyScore(followupCount: number | undefined, totalLeads: number, conversions: number): number {
  if (totalLeads <= 0) return 0;
  if (typeof followupCount === "number" && followupCount > 0) {
    return Math.min(100, Math.round((followupCount / totalLeads) * 100));
  }
  const convRate = (conversions / totalLeads) * 100;
  if (convRate >= 40) return 80;
  if (convRate >= 20) return 65;
  if (conversions > 0) return 50;
  return 30;
}

function DeltaBadge({ curr, prev }: { curr: number; prev: number }) {
  if (prev === 0 && curr === 0) return <span className="text-[10px] text-gray-300 dark:text-gray-600">—</span>;
  const d = curr - prev;
  if (d === 0) return <span className="text-[10px] text-gray-400">±0</span>;
  const up = d > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${up ? "text-emerald-600" : "text-red-500"}`}>
      {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}{Math.abs(d)}
    </span>
  );
}

// ─── Sub-Calculations ─────────────────────────────────────────────────────────

function calculatePerformanceScore(efficiencyScore: number, volumeScoreNorm: number, speedScore: number, consistencyScore: number): number {
  const raw = efficiencyScore * 0.40 + volumeScoreNorm * 0.20 + speedScore * 0.20 + consistencyScore * 0.20;
  return Math.round(Math.min(100, Math.max(0, raw)));
}

function RateBadge({ rate }: { rate: number }) {
  const cls =
    rate >= 50 ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
    : rate >= 20 ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800"
    : "bg-gray-100 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${cls}`}>
      {Number(rate).toFixed(1)}%
    </span>
  );
}

function PerfBadge({ score }: { score: number }) {
  const { cls, icon } =
    score >= 75 ? { cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800", icon: "🏆" }
    : score >= 50 ? { cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800", icon: "⭐" }
    : score >= 25 ? { cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800", icon: "📈" }
    : { cls: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700", icon: "💡" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${cls}`}>
      {icon} {score}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
export default function StaffPerformance() {
  const [loading,         setLoading]         = useState(false);
  const [rawData,         setRawData]         = useState<RawStaff[]>([]);
  const [counselors,      setCounselors]      = useState<{ id: number; name: string; role?: string }[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("all");
  const [period,          setPeriod]          = useState<Period>("monthly");
  const [customFrom,      setCustomFrom]      = useState(toISO(new Date(new Date().getFullYear(), 0, 1)));
  const [customTo,        setCustomTo]        = useState(toISO(new Date()));
  const [sortKey,         setSortKey]         = useState<SortKey>("performance_score");
  const [showScores,      setShowScores]      = useState(false);

  const activeDates = period === "custom" ? { from: customFrom, to: customTo } : getPeriodDates(period);
  const periodLabel = period === "custom" ? `${customFrom} → ${customTo}` : PERIODS.find(p => p.id === period)?.label ?? "";

  // 🚀 FIXED: Clears dropdown box from holding onto admin users
  useEffect(() => {
    apiGet("/api/staff-performance/dropdown")
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        const clearList = list.filter((c: any) => {
          const r = String(c.role || "").trim().toLowerCase();
          return r === "counselor" || r === "telecaller";
        });
        setCounselors(clearList);
      })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setRawData([]);
    try {
      const res = await apiGet(`/api/staff-performance/comparison?from=${activeDates.from}&to=${activeDates.to}&staffId=${selectedStaffId}`);
      const rows: RawStaff[] = Array.isArray(res) ? res : (res?.data ?? []);
      
      const filteredRows = rows.filter((r: RawStaff) => {
        const staffRole = String(r.role || "").trim().toLowerCase();
        return staffRole === "counselor" || staffRole === "telecaller";
      });

      setRawData(filteredRows);
    } catch (error) {
      console.error("Critical error syncing performance array:", error);
      setRawData([]);
    } finally {
      setLoading(false);
    }
  }, [activeDates.from, activeDates.to, selectedStaffId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 🚀 FIXED: Strict operational fallback wrapper filter
  const data: ScoredStaff[] = useMemo(() => {
    const scored = processStaffData(rawData);
    const whitelist = scored.filter(s => {
      const r = String(s.role || "").trim().toLowerCase();
      return r === "counselor" || r === "telecaller";
    });
    if (sortKey === "performance_score") return whitelist;
    return [...whitelist].sort((a, b) => (Number(b[sortKey]) || 0) - (Number(a[sortKey]) || 0));
  }, [rawData, sortKey]);

  // 🚀 FIXED: Aggregated KPI Cards calculate values based exclusively on whitelisted users
  const { totalLeads, totalConverted, avgPerfScore } = useMemo(() => {
    return {
      totalLeads: data.reduce((s, r) => s + r.total_leads, 0),
      totalConverted: data.reduce((s, r) => s + r.conversions, 0),
      avgPerfScore: data.length > 0 ? Math.round(data.reduce((s, r) => s + r.performance_score, 0) / data.length) : 0
    };
  }, [data]);

  const globalRate = totalLeads > 0 ? ((totalConverted / totalLeads) * 100).toFixed(1) : "0.0";
  const hasFilter = selectedStaffId !== "all";

  // 🚀 FIXED: Excludes administrators from generated download report arrays
  const exportCSV = () => {
    if (!data.length) return;
    const rows = [["Rank", "Name", "Leads", "Conversions", "Rate%", "Speed", "Consistency", "Score"], ...data.map((s, i) => [i + 1, s.name, s.total_leads, s.conversions, `${s.success_rate.toFixed(1)}%`, s.speed_score, s.consistency_score, s.performance_score])];
    const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `performance_${period}_${toISO(new Date())}.csv` });
    a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4 pb-12 text-sm text-slate-900 dark:text-slate-100 font-normal antialiased">

      {/* FIXED HEADER DECK */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4 select-none w-full shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
            <Activity size={14} className="text-white" />
          </div>
          <div>
            <nav className="flex items-center gap-1 text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">
              <span>CRM Hub</span>
              <ChevronRight size={10} strokeWidth={3} className="text-slate-300" />
              <span className="text-slate-600 dark:text-slate-400">Performance</span>
            </nav>
            <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide leading-none">
              Staff Performance Matrix
            </h1>
            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1.5 leading-none flex items-center gap-1.5">
              <span>4-Dimension Analytics</span>
              <span className="inline-block w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
              <span>{periodLabel}</span>
              {loading && <span className="text-slate-400 animate-pulse">· Syncing…</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Ingestion Matrices"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>

          <button 
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer"
          >
            <Download size={12} strokeWidth={3} />
            <span>Export</span>
          </button>

          <button 
            type="button"
            onClick={() => setShowScores(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              showScores
                ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-950 shadow-xs"
                : "bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50"
            }`}
          >
            <Trophy size={12} strokeWidth={3} />
            <span>Scores</span>
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Staff Shown",    val: data.length,      color: "text-slate-700 dark:text-slate-200",    bg: "bg-white dark:bg-gray-900",           icon: <Users size={16} className="text-slate-400" />        },
          { label: "Total Leads",    val: totalLeads,       color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-50 dark:bg-blue-900/20",       icon: <BarChart3 size={16} className="text-blue-400" />      },
          { label: "Conversions",    val: totalConverted,   color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", icon: <CheckCircle2 size={16} className="text-emerald-400" /> },
          { label: "Avg Perf Score", val: avgPerfScore,     color: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-50 dark:bg-violet-900/20",   icon: <Trophy size={16} className="text-violet-400" />        },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm`}>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{s.label}</p>
              <p className={`text-2xl font-black ${s.color} leading-tight mt-0.5 tabular-nums`}>
                {loading ? "—" : s.val}
              </p>
            </div>
            {s.icon}
          </div>
        ))}
      </div>

      {/* FORMULA STRIP */}
      {showScores && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/40 rounded-xl px-4 py-3 animate-in fade-in duration-150">
          <p className="text-[9px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-2.5">
            Performance Score = Efficiency×40% + Volume×20% + Speed×20% + Consistency×20%
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: <CheckCircle2 size={11} />, label: "Efficiency", weight: "40%", color: "text-emerald-600", desc: "Conversion rate" },
              { icon: <Users size={11} />,        label: "Volume",      weight: "20%", color: "text-blue-600",    desc: "Leads (normalised)" },
              { icon: <Zap size={11} />,          label: "Speed",       weight: "20%", color: "text-amber-600",   desc: "First-contact time" },
              { icon: <RotateCcw size={11} />,    label: "Consistency", weight: "20%", color: "text-violet-600",  desc: "Follow-up discipline" },
            ].map(f => (
              <div key={f.label} className="flex items-start gap-2 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 border border-blue-100 dark:border-blue-800/40">
                <span className={`mt-0.5 shrink-0 ${f.color}`}>{f.icon}</span>
                <div>
                  <p className={`text-[10px] font-black uppercase ${f.color}`}>{f.label} <span className="text-gray-400 font-semibold">({f.weight})</span></p>
                  <p className="text-[9px] text-gray-400 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTER BAR MENU TRACKS */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm">
        <div className="px-3 py-2.5 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Filter size={13} className="text-gray-400" />
            <select value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium outline-none dark:text-white min-w-[140px]">
              <option value="all">All Staff</option>
              {counselors.map(c => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
            {PERIODS.map(p => (
              <button key={p.id} type="button" onClick={() => setPeriod(p.id)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all whitespace-nowrap ${
                  period === p.id
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}>
                {p.label}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div className="flex flex-wrap items-center gap-2 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs">
              <Calendar size={12} className="text-blue-600 shrink-0" />
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="bg-transparent outline-none font-medium dark:text-white text-xs" />
              <span className="text-gray-300 dark:text-gray-600 hidden sm:block">→</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="bg-transparent outline-none font-medium dark:text-white text-xs" />
            </div>
          )}

          {hasFilter && (
            <button onClick={() => setSelectedStaffId("all")}
              className="p-2 text-rose-400 hover:text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-lg transition-colors">
              <X size={14} />
            </button>
          )}

          <div className="ml-auto text-[11px] font-semibold text-gray-400 dark:text-gray-500 whitespace-nowrap">
            {data.length} staff · {globalRate}% rate
          </div>
        </div>
      </div>

      {/* 🚀 FIXED: RECHARTS BAR CHART VISUAL GRID MAPPING */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-blue-600" />
            <h3 className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Staff Comparison</h3>
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">{periodLabel}</span>
          </div>
          <div className="flex items-center gap-3 text-[9px] font-semibold text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gray-200 dark:bg-gray-700" /> Leads</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-600" /> Converted</span>
          </div>
        </div>

        <div className="px-2 py-4 h-[220px] sm:h-[260px]">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-7 h-7 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-300 dark:text-gray-700">
              <BarChart3 size={32} />
              <p className="text-[10px] font-semibold uppercase tracking-widest">No data for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 700, fill: "#9CA3AF" }} dy={8}
                  interval={0} tickFormatter={v => v.length > 8 ? v.slice(0, 7) + "…" : v} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 600, fill: "#9CA3AF" }} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(59,130,246,0.04)" }}
                  contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "11px", fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  formatter={(v, n) => [v, n === "total_leads" ? "Leads" : "Converted"]} />
                <Bar dataKey="total_leads" name="total_leads" fill="#E5E7EB" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="conversions"  name="conversions"  fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* EFFICIENCY RANKING TABLE */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <h3 className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Efficiency Ranking</h3>
          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 rounded-full">{data.length} staff</span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-14">
            <div className="w-7 h-7 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2">
            <Users className="text-gray-200 dark:text-gray-700" size={36} />
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">No data for this period</p>
          </div>
        ) : (
          <>
            {/* Mobile Table View */}
            <div className="md:hidden divide-y divide-gray-50 dark:divide-gray-800">
              {data.map((s, idx) => (
                <div key={s.id} className="px-4 py-3.5 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className={`w-9 h-9 rounded-xl ${avatarColor(s.name)} flex items-center justify-center text-white font-bold text-sm`}>
                        {getInitials(s.name)}
                      </div>
                      {idx === 0 && <span className="absolute -top-1.5 -right-1.5 text-xs">🏆</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-gray-900 dark:text-white truncate">{s.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-gray-400">{s.total_leads} leads</span>
                        <span className="text-gray-200 dark:text-gray-700">·</span>
                        <span className="text-[10px] text-emerald-600 font-semibold">{s.conversions} won</span>
                      </div>
                    </div>
                    <PerfBadge score={s.performance_score} />
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/60">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-8">#</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider min-w-[160px]">Counsellor</th>
                    <th className="px-3 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Leads</th>
                    <th className="px-3 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Converted</th>
                    <th className="px-3 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider">vs Prev</th>
                    <th className="px-3 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Rate</th>
                    <th className="px-3 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider min-w-[80px]">Pending</th>
                    <th className="px-3 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider">🏆 Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {data.map((s, idx) => {
                    const pending = Math.max(0, s.total_leads - s.conversions);
                    return (
                      <tr key={s.id} className="group transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-900/10">
                        <td className="px-4 py-3 text-[11px] font-bold text-gray-400 tabular-nums">
                          {idx === 0 ? "🏆" : idx === 1 ? "⭐" : idx === 2 ? "🥉" : idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg ${avatarColor(s.name)} flex items-center justify-center text-white font-bold text-[11px] shrink-0`}>
                              {getInitials(s.name)}
                            </div>
                            <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[140px]">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-[13px] font-bold text-gray-700 dark:text-gray-200 tabular-nums">{s.total_leads}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{s.conversions}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <DeltaBadge curr={s.conversions} prev={s.prev_conversions} />
                        </td>
                        <td className="px-3 py-3 text-center"><RateBadge rate={s.success_rate} /></td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-[12px] font-semibold tabular-nums ${pending > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-300 dark:text-gray-600"}`}>
                            {pending > 0 ? pending : "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center"><PerfBadge score={s.performance_score} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}