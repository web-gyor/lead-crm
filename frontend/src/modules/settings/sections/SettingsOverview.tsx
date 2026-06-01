import React from 'react';
import { ShieldAlert, Activity, Radio, Database, ArrowUpRight } from 'lucide-react';

export const SettingsOverview: React.FC = () => {
  
  // Localized configuration for clean component independence
  const statusBadges = [
    { label: "Security Risk Score", value: "98 / 100", icon: ShieldAlert, color: "text-purple-600 bg-purple-500/10 border-purple-500/10 dark:text-purple-400" },
    { label: "API Engine Health", value: "100.0% Uptime", icon: Activity, color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/10 dark:text-emerald-400" },
    { label: "Webhook Queue Load", value: "0 Failed Slots", icon: Radio, color: "text-blue-600 bg-blue-500/10 border-blue-500/10 dark:text-blue-400" },
    { label: "Backup Ingestion State", value: "Synced (2h ago)", icon: Database, color: "text-slate-600 bg-slate-500/10 border-slate-500/10 dark:text-slate-400" }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* ─── UPPER GRID: Native Analytical Cluster Status Badges ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statusBadges.map((badge, idx) => {
          const Icon = badge.icon;
          return (
            <div 
              key={idx} 
              className="border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 rounded-2xl flex items-center justify-between shadow-3xs select-none"
            >
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{badge.label}</p>
                <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{badge.value}</p>
              </div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${badge.color}`}>
                <Icon size={16} strokeWidth={2.5} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── BOTTOM VIEWPORT CORES ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Quick Diagnostic Health Feeds Panel */}
        <div className="lg:col-span-2 border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 rounded-2xl space-y-4 shadow-3xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">Active Infrastructure Gateways</p>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-medium">
            {[
              { provider: 'WhatsApp Business Cloud API Core', type: 'Messaging Gateway', health: 'Operational', color: 'text-emerald-500 bg-emerald-500/10' },
              { provider: 'Exotel Telephony Bridge Service', type: 'Voice Infrastructure API', health: 'Operational', color: 'text-emerald-500 bg-emerald-500/10' },
              { provider: 'Meta Marketing Webhook Ingestion Pipe', type: 'Inbound Sync Channel', health: 'Operational', color: 'text-emerald-500 bg-emerald-500/10' },
              { provider: 'Google Ads Inbound Stream Listener', type: 'G-Ads Webhook Node', health: 'Idle Response Standby', color: 'text-blue-500 bg-blue-500/10' }
            ].map((node, i) => (
              <div key={i} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 select-none">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{node.provider}</p>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">{node.type}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 ${node.color}`}>
                  {node.health}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Shortcuts Panel Configuration Cards */}
        <div className="border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 rounded-2xl space-y-4 shadow-3xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">Global Administrative Actions</p>
          <div className="space-y-2">
            {[
              { action: 'Download Master Audit Logs', desc: 'Secure security transaction history' },
              { action: 'Initiate Manual DB Snapshot Backup', desc: 'Saves current data instantly' },
              { action: 'Flush Integration Redis Cache Buffer', desc: 'Forces instant configuration updates' }
            ].map((item, idx) => (
              <button 
                key={idx} 
                type="button" 
                className="w-full flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 text-left rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-all cursor-pointer group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase tracking-tight">{item.action}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{item.desc}</p>
                </div>
                <ArrowUpRight size={12} className="text-slate-300 dark:text-slate-700 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};