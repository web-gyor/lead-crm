import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, Clock, Zap, MessageCircle, Target, Phone, 
  Globe, Smartphone, UserPlus, Award 
} from "lucide-react";

import { apiGet } from "../../utils/api";

import { DashboardHeader } from "./components/DashboardHeader";
import { KPICard } from "./components/KPICard";
import { PipelineFunnel } from "./components/PipelineFunnel";
import { ConversionChart } from "./components/ConversionChart";
import { RecentLeads } from "./components/RecentLeads";
import { SourcePerformance } from "./components/SourcePerformance";

const formatShortNumericToken = (n: number): string => {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
};

const resolvePercentageRatio = (num: number, den: number): number => {
  return den > 0 ? Math.round((num / den) * 100) : 0;
};

const CHANNELS_ATTREBUTION_DECK = [
  { id: 1, name: "WhatsApp", icon: <MessageCircle size={13} />, color: "#10b981" },
  { id: 2, name: "Phone Call", icon: <Phone size={13} />, color: "#3b82f6" },
  { id: 3, name: "Walk-in", icon: <UserPlus size={13} />, color: "#8b5cf6" },
  { id: 4, name: "Website", icon: <Globe size={13} />, color: "#6366f1" },
  { id: 5, name: "Referral", icon: <Users size={13} />, color: "#f59e0b" },
  { id: 6, name: "Social Nodes", icon: <Smartphone size={13} />, color: "#ec4899" },
  { id: 7, name: "Meta Campaigns", icon: <Target size={13} />, color: "#1d4ed8" },
  { id: 8, name: "Google Ads Cluster", icon: <Target size={13} />, color: "#059669" },
  { id: 9, name: "System Bulk Ingestion", icon: <Zap size={13} />, color: "#64748b" },
  { id: 10, name: "Other Channels", icon: <Globe size={13} />, color: "#9ca3af" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!token || !user) {
      localStorage.clear();
      window.location.href = "/login";
    }
  }, []);

  // 🎯 FIXED PIPELINE TELEMETRY FETCH TARGET URL
  const syncPipelineMetrics = useCallback(async () => {
    setLoading(true);
    try {
      // 🚀 FIXED: Added ?period=${period} query binding parameter to the endpoint string natively
      const res = await apiGet(`/api/dashboard/dashboard-data?period=${period}`);
      if (res && res.success) {
        setStats({
          ...res,
          recentLeads: res.recentLeads || [],
          sourceStats: res.sourceStats || [],
          conversionRate: res.conversionRate || 0,
        });
      } else {
        setStats({});
      }
    } catch (err) {
      console.error("Telemetry snapshot capture dropped:", err);
      setStats({});
    } finally {
      setLoading(false);
    }
  }, [period]); // Monitored query hook handles dependencies explicitly now

  useEffect(() => {
    syncPipelineMetrics();
  }, [syncPipelineMetrics]);

  const chartTelemetryPayload = useMemo(() => {
    // 🚀 FIXED: Maps directly to the unified `res.activeData` response array sent by the server
    const activePeriodData = Array.isArray(stats?.activeData) ? stats.activeData : [];
    
    const configuredDataMap = activePeriodData.map((d: any, i: number) => {
      let resolvedLabel = d?.label || "";
      
      // Secondary fallback form parsing layer if label strings arrive unformatted
      if (!resolvedLabel && d?.date) {
        resolvedLabel = new Date(d.date).toLocaleDateString("en-IN", { 
          weekday: period === "daily" ? "short" : undefined,
          month: period === "monthly" ? "short" : undefined 
        });
      }

      return {
        ...d,
        label: resolvedLabel || (period === "weekly" ? `W${i + 1}` : `Node ${i + 1}`),
        total: Number(d?.total ?? 0),
        converted: Number(d?.converted ?? 0)
      };
    });

    const aggregateGrossVolume = configuredDataMap.reduce((acc: number, d: any) => acc + (Number(d.total) || 0), 0);
    const aggregateSecuredAdmissions = configuredDataMap.reduce((acc: number, d: any) => acc + (Number(d.converted) || 0), 0);
    const calculatedRatePercentage = resolvePercentageRatio(aggregateSecuredAdmissions, aggregateGrossVolume);
    
    // Fallback to the server-provided maxBar or compute boundary scale array dynamically
    const rawPeakBoundCeiling = Number(stats?.maxBar) || Math.max(...configuredDataMap.map((d: any) => Number(d.total) || 0), 10);

    return {
      dataList: configuredDataMap,
      grossTotal: aggregateGrossVolume,
      securedTotal: aggregateSecuredAdmissions,
      ratePercentage: calculatedRatePercentage,
      peakCeiling: rawPeakBoundCeiling
    };
  }, [stats, period]);

  const k = stats || {};
  const statusStatsObj = k.statusStats || {};

  const handleFollowupsRouting = useCallback(() => navigate("/leads/followup-leads"), [navigate]);
  const handleNewLeadsRouting = useCallback(() => navigate("/leads/new"), [navigate]);

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      <DashboardHeader 
        onFollowupsClick={handleFollowupsRouting}
        onNewLeadsClick={handleNewLeadsRouting}
        onRefreshClick={syncPipelineMetrics}
        loading={loading}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          loading={loading} 
          label="Total Enquiries" 
          value={formatShortNumericToken(k.totalLeads || 0)}
          sub={`+${k.newToday || 0} registered today`} 
          accent="bg-blue-50 dark:bg-blue-950/20"
          icon={<Users size={16} className="text-blue-600 dark:text-blue-400" />}
          spark={Array.isArray(k.activeData) ? k.activeData.map((d: any) => Number(d?.total) || 0) : [0,0,0,0,0,0,0]} 
        />
        <KPICard 
          loading={loading} 
          label="Conversion Quotient" 
          value={`${k.conversionRate || 0}%`}
          sub={`${statusStatsObj.converted || 0} admissions secured`} 
          accent="bg-emerald-50 dark:bg-emerald-950/20"
          icon={<Award size={16} className="text-emerald-600 dark:text-emerald-400" />}
          trend={k.conversionRate || 0}
          spark={Array.isArray(k.activeData) ? k.activeData.map((d: any) => Number(d?.converted) || 0) : [0,0,0,0,0,0,0]} 
        />
        <KPICard 
          loading={loading} 
          label="Pending Sync Actions" 
          value={formatShortNumericToken(k.pendingFollowUps || 0)}
          sub="Awaiting callback tracking" 
          accent="bg-amber-50 dark:bg-amber-950/20"
          icon={<Clock size={16} className="text-amber-600 dark:text-amber-400" />} 
        />
        <KPICard 
          loading={loading} 
          label="High Ingestion Intent" 
          value={formatShortNumericToken(k.highIntentLeads || 0)}
          sub="Hot prioritized pipeline nodes" 
          accent="bg-violet-50 dark:bg-violet-950/20"
          icon={<Zap size={16} className="text-violet-600 dark:text-violet-400" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4">
          <PipelineFunnel 
            statusStats={statusStatsObj}
            totalLeads={k.totalLeads || 1}
            conversionRate={k.conversionRate || 0}
          />
        </div>
        
        <div className="lg:col-span-8">
          <ConversionChart 
            period={period}
            setPeriod={setPeriod}
            loading={loading}
            activeData={chartTelemetryPayload.dataList}
            totalsBar={chartTelemetryPayload.grossTotal}
            convBar={chartTelemetryPayload.securedTotal}
            rateBar={chartTelemetryPayload.ratePercentage}
            maxBar={chartTelemetryPayload.peakCeiling}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5">
          <RecentLeads 
            loading={loading}
            recentLeads={k.recentLeads || []}
            navigate={navigate}
          />
        </div>

        <div className="lg:col-span-7">
          <SourcePerformance 
            sources={CHANNELS_ATTREBUTION_DECK}
            sourceStats={k.sourceStats || []}
            totalLeads={k.totalLeads || 1}
            loading={loading}
            newToday={k.newToday || 0}
            navigate={navigate}
          />
        </div>
      </div>
    </div>
  );
}