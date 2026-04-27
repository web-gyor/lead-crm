// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Clock, Zap, MessageCircle, Target, Phone,
  Globe, Smartphone, UserPlus, TrendingUp, BarChart2,
  ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle,
  AlertCircle, Calendar, Award, Activity,
} from "lucide-react";
import { apiGet } from "../utils/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function pct(num: number, den: number): number {
  return den > 0 ? Math.round((num / den) * 100) : 0;
}

// ─── Mini sparkline bar ────────────────────────────────────────────────────────

function SparkBars({ data, color = "#2563eb" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-px h-8 w-full">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all duration-500"
          style={{
            height: `${Math.max(8, Math.round((v / max) * 100))}%`,
            backgroundColor: i === data.length - 1 ? color : color + "55",
          }}
        />
      ))}
    </div>
  );
}

// ─── Radial progress ring ─────────────────────────────────────────────────────

function Ring({ pct: p, size = 56, stroke = 5, color = "#2563eb" }: {
  pct: number; size?: number; stroke?: number; color?: string;
}) {
  const r   = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (p / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#e5e7eb" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
    </svg>
  );
}

// ─── Funnel bar ───────────────────────────────────────────────────────────────

function FunnelBar({ label, val, total, color, icon }: {
  label: string; val: number; total: number; color: string; icon: React.ReactNode;
}) {
  const w = pct(val, total);
  return (
    <div className="flex items-center gap-3">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">{label}</span>
          <span className="text-[11px] font-black text-gray-900 dark:text-white tabular-nums">{fmt(val)}</span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${w}%`, backgroundColor: color.includes("blue") ? "#2563eb" : color.includes("amber") ? "#d97706" : color.includes("emerald") ? "#059669" : color.includes("red") ? "#dc2626" : color.includes("violet") ? "#7c3aed" : color.includes("indigo") ? "#4f46e5" : "#6b7280" }}
          />
        </div>
      </div>
      <span className="text-[10px] font-bold text-gray-400 tabular-nums w-8 text-right">{w}%</span>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({ label, value, sub, icon, trend, spark, accent, loading }: {
  label: string; value: string | number; sub: string;
  icon: React.ReactNode; trend?: number; spark?: number[];
  accent: string; loading: boolean;
}) {
  const up = (trend ?? 0) >= 0;
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>
          {icon}
        </div>
        {trend !== undefined && !loading && (
          <span className={`flex items-center gap-0.5 text-[10px] font-black ${up ? "text-emerald-600" : "text-red-500"}`}>
            {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 mb-1">{label}</p>
        <p className="text-2xl font-black tabular-nums tracking-tighter text-gray-900 dark:text-white">
          {loading ? <span className="inline-block w-12 h-6 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /> : value}
        </p>
        <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase">{sub}</p>
      </div>
      {spark && spark.length > 0 && !loading && (
        <SparkBars data={spark} color={accent.includes("blue") ? "#2563eb" : accent.includes("emerald") ? "#059669" : accent.includes("amber") ? "#d97706" : accent.includes("violet") ? "#7c3aed" : "#6b7280"} />
      )}
    </div>
  );
}


// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats,   setStats]   = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState<"daily" | "weekly" | "monthly">("daily");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user  = localStorage.getItem("user");
    if (!token || !user) { localStorage.clear(); window.location.href = "/login"; }
  }, []);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await apiGet("/api/leads/dashboard-data");
        if (res) {
          setStats({
            ...res,
            recentLeads:    res.recentLeads    || res.newLeads || [],
            sourceStats:    res.sourceStats    || [],
            conversionRate: res.conversionRate ||
              (res.statusStats?.converted && res.totalLeads
                ? Math.round((res.statusStats.converted / res.totalLeads) * 100) : 0),
          });
        }
      } catch { setStats({}); }
      finally  { setLoading(false); }
    };
    fetch();
  }, []);

  const k = stats || {};
  const ss = k.statusStats || {};

  // ── Chart data ───────────────────────────────────────────────────────────

  const chartMap = {
    daily:   { data: (k.dailyConversions   || []).map((d: any) => ({ ...d, label: new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" }) })), title: "7 Days"   },
    weekly:  { data: k.weeklyConversions   || [], title: "6 Weeks"  },
    monthly: { data: k.monthlyConversions  || [], title: "6 Months" },
  };
  const active     = chartMap[period];
  const totalsBar  = active.data.reduce((a: number, d: any) => a + (Number(d.total)     || 0), 0);
  const convBar    = active.data.reduce((a: number, d: any) => a + (Number(d.converted) || 0), 0);
  const rateBar    = pct(convBar, totalsBar);
  const maxBar     = Math.max(...active.data.map((d: any) => Number(d.total) || 0), 1);

  // ── Source config ─────────────────────────────────────────────────────────

  const SOURCES = [
    { id: 1,  name: "WhatsApp",   icon: <MessageCircle size={13} />, color: "#10b981" },
    { id: 2,  name: "Phone Call", icon: <Phone size={13} />,         color: "#3b82f6" },
    { id: 3,  name: "Walk-in",    icon: <UserPlus size={13} />,      color: "#8b5cf6" },
    { id: 4,  name: "Website",    icon: <Globe size={13} />,         color: "#6366f1" },
    { id: 5,  name: "Referral",   icon: <Users size={13} />,         color: "#f59e0b" },
    { id: 6,  name: "Social",     icon: <Smartphone size={13} />,    color: "#ec4899" },
    { id: 7,  name: "Meta Ads",   icon: <Target size={13} />,        color: "#1d4ed8" },
    { id: 8,  name: "Google Ads", icon: <Target size={13} />,        color: "#059669" },
    { id: 9,  name: "Import",     icon: <Zap size={13} />,           color: "#64748b" },
    { id: 10, name: "Other",      icon: <Globe size={13} />,         color: "#9ca3af" },
  ];

  const totalLeads = k.totalLeads || 1;

  

  return (
    <div className="space-y-5 pb-8 animate-in fade-in duration-500">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <span className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-600/30 shrink-0">
              <Activity size={14} className="text-white" />
            </span>
            Admissions Dashboard
          </h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-0.5">
            Real-time · Enquiry Intelligence
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => navigate("/leads/followup-leads")}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all">
            <Clock size={12} /> Follow-ups
          </button>
          <button onClick={() => navigate("/leads/new")}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm shadow-blue-600/20 active:scale-95 transition-all">
            <Zap size={12} /> New Leads
          </button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard loading={loading} label="Total Enquiries" value={fmt(k.totalLeads || 0)}
          sub={`+${k.newToday || 0} today`} accent="bg-blue-50 dark:bg-blue-900/20"
          icon={<Users size={16} className="text-blue-600" />}
          spark={(k.dailyConversions || []).slice(-7).map((d: any) => Number(d.total) || 0)} />
        <KPICard loading={loading} label="Conversion Rate" value={`${k.conversionRate || 0}%`}
          sub={`${ss.converted || 0} admissions`} accent="bg-emerald-50 dark:bg-emerald-900/20"
          icon={<Award size={16} className="text-emerald-600" />}
          trend={k.conversionRate || 0}
          spark={(k.dailyConversions || []).slice(-7).map((d: any) => Number(d.converted) || 0)} />
        <KPICard loading={loading} label="Pending Follow-ups" value={fmt(k.pendingFollowUps || 0)}
          sub="Scheduled actions" accent="bg-amber-50 dark:bg-amber-900/20"
          icon={<Clock size={16} className="text-amber-600" />} />
        <KPICard loading={loading} label="High Intent" value={fmt(k.highIntentLeads || 0)}
          sub="Hot + Interested" accent="bg-violet-50 dark:bg-violet-900/20"
          icon={<Zap size={16} className="text-violet-600" />} />
      </div>

      {/* ── Middle row: Funnel + Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* FUNNEL */}
        <div className="lg:col-span-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <BarChart2 size={14} className="text-blue-600" />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">Pipeline Funnel</h2>
            <span className="ml-auto text-[10px] font-black text-gray-400 tabular-nums">{fmt(k.totalLeads || 0)} total</span>
          </div>
          <div className="p-4 space-y-3.5">
            <FunnelBar label="New"        val={ss.new       || 0} total={totalLeads} color="bg-blue-50"    icon={<UserPlus  size={13} className="text-blue-600"    />} />
            <FunnelBar label="Contacted"  val={ss.contacted || 0} total={totalLeads} color="bg-indigo-50"  icon={<Phone     size={13} className="text-indigo-600"  />} />
            <FunnelBar label="Interested" val={ss.interested|| 0} total={totalLeads} color="bg-violet-50"  icon={<Target    size={13} className="text-violet-600"  />} />
            <FunnelBar label="Follow-up"  val={ss.followup  || 0} total={totalLeads} color="bg-amber-50"   icon={<Clock     size={13} className="text-amber-600"   />} />
            <FunnelBar label="Converted"  val={ss.converted || 0} total={totalLeads} color="bg-emerald-50" icon={<CheckCircle2 size={13} className="text-emerald-600" />} />
            <FunnelBar label="Lost"       val={ss.lost      || 0} total={totalLeads} color="bg-red-50"     icon={<XCircle   size={13} className="text-red-500"     />} />
          </div>

          {/* Conversion ring summary */}
          <div className="mx-4 mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex items-center gap-3">
            <div className="relative shrink-0">
              <Ring pct={k.conversionRate || 0} size={52} stroke={5} color="#059669" />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-emerald-600">
                {k.conversionRate || 0}%
              </span>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Overall Conversion</p>
              <p className="text-sm font-black text-gray-900 dark:text-white">{ss.converted || 0} <span className="text-[10px] font-bold text-gray-400">admitted</span></p>
              <p className="text-[9px] text-gray-400 font-bold">{(ss.lost || 0) + (ss.notInterested || 0)} lost / rejected</p>
            </div>
          </div>
        </div>

        {/* CHART */}
        <div className="lg:col-span-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-blue-600" />
              <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">Conversion Trend</h2>
            </div>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg sm:ml-auto">
              {(["daily", "weekly", "monthly"] as const).map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all ${
                    period === p ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}>
                  {p === "daily" ? "7D" : p === "weekly" ? "6W" : "6M"}
                </button>
              ))}
            </div>
          </div>

          {/* Summary chips */}
          <div className="px-4 pt-4 grid grid-cols-3 gap-2">
            {[
              { l: "Volume",    v: fmt(totalsBar), c: "text-gray-900 dark:text-white" },
              { l: "Admitted",  v: fmt(convBar),   c: "text-blue-600"    },
              { l: "Rate",      v: `${rateBar}%`,  c: "text-emerald-600" },
            ].map((s) => (
              <div key={s.l} className="text-center py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{s.l}</p>
                <p className={`text-lg font-black tabular-nums ${s.c}`}>{loading ? "—" : s.v}</p>
              </div>
            ))}
          </div>

          {/* Dual bars */}
          <div className="flex-1 px-4 pb-4 pt-4">
            {loading ? (
              <div className="h-36 bg-gray-50 dark:bg-gray-800 rounded-xl animate-pulse" />
            ) : active.data.length === 0 ? (
              <div className="h-36 flex items-center justify-center text-[10px] font-black text-gray-400 uppercase tracking-widest">No data</div>
            ) : (
              <>
                <div className="flex items-end gap-1.5 h-36 w-full">
                  {active.data.map((d: any, i: number) => {
                    const total  = Number(d.total)     || 0;
                    const conv   = Number(d.converted) || 0;
                    const totalH = Math.max(4, Math.round((total / maxBar) * 100));
                    const convH  = Math.max(0, Math.round((conv  / maxBar) * 100));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[8px] font-black px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none shadow-xl">
                          {total} leads · {conv} admitted · {pct(conv, total)}%
                        </div>
                        <div className="w-full flex items-end gap-px h-32">
                          <div className="flex-1 bg-blue-100 dark:bg-blue-900/30 rounded-t transition-all duration-700" style={{ height: `${totalH}%` }} />
                          <div className="flex-1 bg-blue-600 rounded-t transition-all duration-700" style={{ height: `${convH}%` }} />
                        </div>
                        <span className="text-[8px] font-black text-gray-400 uppercase truncate w-full text-center">{d.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-5 mt-3 justify-center">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-blue-100 dark:bg-blue-900/50" />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Enquiries</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Admissions</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom row: Recent Feed + Source Matrix ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* RECENT FEED */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <Activity size={14} className="text-blue-600" />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">Recent Enquiries</h2>
            <button onClick={() => navigate("/leads")} className="ml-auto text-[10px] font-black text-blue-600 hover:underline uppercase tracking-widest">
              All →
            </button>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-[340px] overflow-y-auto">
            {loading ? (
              [1,2,3,4,5].map((i) => (
                <div key={i} className="h-14 p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/2" />
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/3" />
                  </div>
                </div>
              ))
            ) : (k.recentLeads && k.recentLeads.length > 0) ? (
              k.recentLeads.slice(0, 10).map((lead: any, i: number) => {
                const statusColor =
                  lead.lead_status === "Converted"   ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : lead.lead_status === "Interested" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                  : lead.lead_status === "Follow-up"  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  : lead.lead_status === "Lost"       ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
                return (
                  <div key={i} className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors cursor-pointer" onClick={() => navigate("/leads")}>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-black text-[11px] shrink-0 shadow-sm">
                      {lead.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-gray-900 dark:text-white truncate">{lead.full_name}</p>
                      <p className="text-[9px] text-gray-400 font-bold truncate">{lead.interested_course || "General Inquiry"}</p>
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${statusColor}`}>
                      {lead.lead_status}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-gray-400 text-sm">No recent activity</div>
            )}
          </div>
        </div>

        {/* SOURCE MATRIX */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <BarChart2 size={14} className="text-blue-600" />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">Source Performance</h2>
          </div>
          <div className="p-4">
            {/* Table header */}
            <div className="grid grid-cols-12 text-[8px] font-black uppercase tracking-[0.15em] text-gray-400 pb-2 border-b border-gray-100 dark:border-gray-800 mb-2">
              <div className="col-span-4">Channel</div>
              <div className="col-span-2 text-right">Leads</div>
              <div className="col-span-2 text-right">Admitted</div>
              <div className="col-span-2 text-right">Rate</div>
              <div className="col-span-2 text-right">Share</div>
            </div>

            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
              {SOURCES.map((src) => {
                const sd = (k.sourceStats || []).find((s: any) =>
                  Number(s.id) === src.id ||
                  s.name?.toLowerCase().includes(src.name.toLowerCase().split(" ")[0])
                ) || { value: 0, converted: 0, percentage: 0 };

                const total    = Number(sd.value)     || 0;
                const conv     = Number(sd.converted) || 0;
                const rate     = pct(conv, total);
                const share    = Math.round(sd.percentage || pct(total, k.totalLeads || 1));
                if (total === 0 && !loading) return null;

                return (
                  <div key={src.id} className="grid grid-cols-12 items-center py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <div className="col-span-4 flex items-center gap-2">
                      <span style={{ color: src.color }} className="shrink-0">{src.icon}</span>
                      <span className="text-[10px] font-black text-gray-700 dark:text-gray-300 truncate">{src.name}</span>
                    </div>
                    <div className="col-span-2 text-right text-[11px] font-black text-gray-900 dark:text-white tabular-nums">{fmt(total)}</div>
                    <div className="col-span-2 text-right text-[11px] font-black text-emerald-600 tabular-nums">{fmt(conv)}</div>
                    <div className="col-span-2 text-right">
                      <span className={`text-[10px] font-black tabular-nums ${rate >= 20 ? "text-emerald-600" : rate >= 10 ? "text-amber-600" : "text-gray-500"}`}>
                        {rate}%
                      </span>
                    </div>
                    <div className="col-span-2 pr-0">
                      <div className="flex items-center gap-1 justify-end">
                        <div className="w-10 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${share}%`, backgroundColor: src.color }} />
                        </div>
                        <span className="text-[8px] font-bold text-gray-400 tabular-nums w-5 text-right">{share}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {loading && [1,2,3,4,5].map((i) => (
                <div key={i} className="h-8 bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>

            {/* Today alert strip */}
            {!loading && (k.newToday || 0) > 0 && (
              <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
                <AlertCircle size={12} className="text-blue-600 shrink-0" />
                <p className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">
                  {k.newToday} new enquiries today — action required
                </p>
                <button onClick={() => navigate("/leads/new")} className="ml-auto text-[10px] font-black text-blue-600 hover:underline shrink-0 uppercase">
                  View →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}