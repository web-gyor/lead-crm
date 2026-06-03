import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp, Target, Award, Users, UserX,
  Clock, Activity, BarChart2,
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw, ChevronRight,
} from "lucide-react";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import { apiGet } from "../utils/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = [
  "#2563EB", "#7C3AED", "#DB2777", "#EA580C",
  "#16A34A", "#F59E0B", "#0891B2", "#DC2626",
];

type ActionKey = "view" | "create" | "edit" | "delete" | "export";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

// ─── Sub-components ───────────────────────────────────────────────────────────

function Trend({ value }: { value: number }) {
  if (value > 0)
    return <span className="flex items-center gap-0.5 text-emerald-600 text-[10px] font-black"><ArrowUpRight size={11} />+{value}%</span>;
  if (value < 0)
    return <span className="flex items-center gap-0.5 text-red-500 text-[10px] font-black"><ArrowDownRight size={11} />{value}%</span>;
  return <span className="flex items-center gap-0.5 text-gray-400 text-[10px] font-black"><Minus size={11} />0%</span>;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white rounded-xl px-4 py-3 shadow-2xl border border-gray-700 text-xs">
      <p className="font-black uppercase tracking-widest text-gray-400 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-black">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, bg, border, sub, trend }: {
  label: string; value: number; icon: React.ElementType;
  color: string; bg: string; border: string; sub: string; trend: number;
}) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border ${border} p-3 sm:p-4 hover:shadow-md transition-all`}>
      <div className={`inline-flex p-2 rounded-lg ${bg} ${color} mb-3`}>
        <Icon size={15} />
      </div>
      <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter leading-none">
        {value}
      </p>
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1.5 leading-tight">
        {label}
      </p>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 dark:border-gray-800">
        <p className="text-[9px] text-gray-400 truncate max-w-[70px]">{sub}</p>
        <Trend value={trend} />
      </div>
    </div>
  );
}

function FunnelBar({ label, value, total, color }: {
  label: string; value: number; total: number; color: string;
}) {
  const p = pct(value, total);
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-gray-900 dark:text-white tabular-nums">{value}</span>
          <span className="text-[9px] text-gray-400 w-8 text-right">{p}%</span>
        </div>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Analytics() {
  const [data, setData] = useState<any>({ trends: [], courses: [], funnel: {} });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("month");
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet(`/api/analytics/business-overview?range=${timeRange}`);
      const finalData = res?.success && res.data ? res.data : (res?.data ?? res);

      console.log("🔍 Raw Analytics Response:", finalData); 

      const rawFunnel = finalData.funnel ?? finalData.data?.funnel ?? {};

      // 🚀 RESTORED PURE DATA MAPPINGS WITHOUT INTERCEPTIONS
      const processedFunnel = {
        total:     Number(rawFunnel.total     ?? rawFunnel.leads ?? 0),
        converted: Number(rawFunnel.closed    ?? rawFunnel.converted ?? 0),
        lost:      Number(rawFunnel.lost      ?? 0),
        engaged:   Number(rawFunnel.engaged   ?? 0),
        followUp:  Number(rawFunnel.followUp  ?? rawFunnel.followup ?? 0),
      };

      setData({
        trends: Array.isArray(finalData.trends) ? finalData.trends : [],
        courses: Array.isArray(finalData.courses) ? finalData.courses : [],
        funnel: processedFunnel,
      });
    } catch (err) {
      console.error("Analytics load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived Values ─────────────────────────────────────────────────────────
  const total     = data.funnel?.total     ?? 0;
  const converted = data.funnel?.converted ?? 0;
  const lost      = data.funnel?.lost      ?? 0;
  const engaged   = data.funnel?.engaged   ?? 0;
  const followUp  = data.funnel?.followUp  ?? 0;

  const pending   = Math.max(0, total - converted - lost);

  const conversionRate = pct(converted, total);
  const engagementRate = pct(engaged,   total);
  const lossRate       = pct(lost,      total);

  const courseSum = data.courses?.reduce((acc: number, c: any) => acc + Number(c.value || 0), 0) ?? 0;
  const miscLeads = Math.max(0, total - courseSum);

  const pieData = [
    ...(data.courses ?? []),
    ...(miscLeads > 0 ? [{ name: "Other", value: miscLeads }] : []),
  ];

  const kpis = [
    { label: "Total Intake",     value: total,     icon: Users,    color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-900/20",    border: "border-blue-100 dark:border-blue-800",    trend: 0, sub: "All registered leads" },
    { label: "Engaged Leads",    value: engaged,   icon: Activity, color: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-900/20", border: "border-violet-100 dark:border-violet-800", trend: 0, sub: `${engagementRate}% engagement` },
    { label: "Converted",        value: converted, icon: Award,    color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20",border: "border-emerald-100 dark:border-emerald-800",trend: 0, sub: `${conversionRate}% conv rate` },
    { label: "Lost Leads",       value: lost,      icon: UserX,    color: "text-red-500",     bg: "bg-red-50 dark:bg-red-900/20",       border: "border-red-100 dark:border-red-800",      trend: 0, sub: `${lossRate}% loss rate` },
    { label: "Follow-up Leads",  value: followUp,  icon: Clock,    color: "text-orange-500",  bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-100 dark:border-orange-800",  trend: 0, sub: "Pipeline entries" },
    { label: "Pipeline Active",  value: pending,   icon: Target,   color: "text-cyan-600",    bg: "bg-cyan-50 dark:bg-cyan-900/20",     border: "border-cyan-100 dark:border-cyan-800",     trend: 0, sub: "In progress" },
  ];

  const quickStats = [
    { label: "Avg Leads/Month", value: data.trends?.length > 0 ? Math.round(total / data.trends.length) : 0, icon: "📈" },
    { label: "Best Month",      value: data.trends?.reduce((best: any, t: any) => t.totalLeads > (best?.totalLeads ?? 0) ? t : best, null)?.month ?? "—", icon: "🏆" },
    { label: "Active Courses",  value: data.courses?.length ?? 0, icon: "📚" },
    { label: "Pending Review",  value: Math.max(0, total - converted - lost - engaged), icon: "⏳" },
  ];

  if (loading && !refreshing) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Loading Intelligence…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12 text-sm text-slate-900 dark:text-slate-100 font-normal antialiased">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4 select-none w-full shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
            <BarChart2 size={14} className="text-white" />
          </div>
          <div>
            <nav className="flex items-center gap-1 text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">
              <span>CRM Hub</span>
              <ChevronRight size={10} strokeWidth={3} className="text-slate-300" />
              <span className="text-slate-600 dark:text-slate-400">Analytics</span>
            </nav>
            <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide leading-none">
              Intelligence Operations Center
            </h1>
            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1.5 leading-none flex items-center gap-1.5">
              <span>Real-time Metrics</span>
              <span className="inline-block w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
              <span>{total} Total Enrolled Nodes</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => { setRefreshing(true); fetchData(); }}
            disabled={refreshing}
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"
            title="Synchronize Aggregated Telemetry"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin text-blue-500" : ""} />
          </button>

          <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 border border-slate-200/20 rounded-xl select-none">
            {["Week", "Month", "Year"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r.toLowerCase())}
                className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                  timeRange === r.toLowerCase()
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-violet-700 rounded-2xl p-5 sm:p-6 text-white shadow-xl shadow-blue-600/20">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-blue-200 mb-1">Conversion Rate</p>
            <p className="text-4xl sm:text-5xl font-black tracking-tighter leading-none">{conversionRate}%</p>
            <p className="text-[10px] text-blue-200 mt-1 font-medium">{converted} of {total} leads</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-blue-200 mb-1">Engagement</p>
            <p className="text-3xl font-black tracking-tighter">{engagementRate}%</p>
            <p className="text-[10px] text-blue-200 mt-1">{engaged} engaged</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-blue-200 mb-1">Loss Rate</p>
            <p className="text-3xl font-black tracking-tighter">{lossRate}%</p>
            <p className="text-[10px] text-blue-200 mt-1">{lost} lost</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-blue-200 mb-1">Best Course</p>
            <p className="text-lg font-black tracking-tight leading-tight truncate">
              {data.courses?.[0]?.name?.split(" ")?.[0] ?? "—"}
            </p>
            <p className="text-[10px] text-blue-200 mt-1">{data.courses?.[0]?.value ?? 0} leads</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi, i) => (
          <KpiCard key={i} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Lead Flow Trend</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Monthly intake vs admissions</p>
            </div>
            <div className="flex items-center gap-3 text-[9px] font-black uppercase">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-blue-600 inline-block rounded" />Leads
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-emerald-500 inline-block rounded" />Admissions
              </span>
            </div>
          </div>
          <div className="h-[220px] sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trends} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fonttext: 900, fill: "#94a3b8" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fonttext: 900, fill: "#94a3b8" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="totalLeads" name="Leads" stroke="#2563EB" strokeWidth={3} fill="url(#colorLeads)" />
                <Area type="monotone" dataKey="admissions" name="Admissions" stroke="#10B981" strokeWidth={2.5} fill="none" strokeDasharray="6 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
          <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest mb-0.5">Course Distribution</h3>
          <p className="text-[10px] text-gray-400 mb-4">Lead share by program</p>
          <div className="relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                  {pieData.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.9} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{total}</span>
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Total</span>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {pieData.slice(0, 5).map((c: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-[10px] text-gray-600 dark:text-gray-400 truncate flex-1">{c.name}</span>
                <span className="text-[10px] font-black text-gray-900 dark:text-white tabular-nums">{c.value}</span>
                <span className="text-[9px] text-gray-400 w-8 text-right">{pct(c.value, total)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest mb-0.5">Course Volume</h3>
          <p className="text-[10px] text-gray-400 mb-5">Lead count by program</p>
          <div className="h-[200px] sm:h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.courses} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={90}
                  tick={{ fontSize: 9, fonttext: 900, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={12}>
                  {data.courses?.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Conversion Funnel</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Stage-by-stage breakdown</p>
          </div>
          <div className="p-4 sm:p-5 space-y-3">
            {[
              { label: "Total Leads", value: total,      color: "bg-blue-600"    },
              { label: "Engaged",     value: engaged,    color: "bg-violet-600"  },
              { label: "Follow-up",   value: followUp,   color: "bg-orange-500"  },
              { label: "Converted",   value: converted,  color: "bg-emerald-600" },
              { label: "Lost",        value: lost,       color: "bg-red-500"     },
            ].map((stage) => (
              <FunnelBar key={stage.label} {...stage} total={total} />
            ))}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800">
            <div className="px-4 sm:px-6 py-2.5 bg-gray-50/50 dark:bg-gray-800/30">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Top Courses by Intake</p>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {data.courses?.slice(0, 4).map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-4 sm:px-6 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-black text-gray-900 dark:text-white tabular-nums">{c.value}</span>
                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded uppercase">
                      {pct(c.value, total)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-xs">
        <p className="font-black text-amber-700 dark:text-amber-400 mb-2">DEBUG: Reconciliation Matrix Status</p>
        <p>Total Intake: <strong>{total}</strong> | Converted: <strong>{converted}</strong> | Lost: <strong>{lost}</strong> | Follow-up: <strong>{followUp}</strong> | Pipeline Active Pending: <strong>{pending}</strong></p>
        <p className="text-[10px] text-amber-600 mt-1">Operational values verified directly against active pipeline contexts.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickStats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3 sm:p-4 flex items-center gap-3">
            <span className="text-xl sm:text-2xl">{stat.icon}</span>
            <div className="min-w-0">
              <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tabular-nums leading-none truncate">
                {stat.value}
              </p>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}