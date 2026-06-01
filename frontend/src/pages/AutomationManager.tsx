import React, { useState, useEffect } from "react";
import { Zap, Clock, MessageSquare, Mail, Smartphone, Plus, Trash2, Power, Settings2, Loader2, ChevronRight } from "lucide-react";
import { apiGet, apiDelete, apiPut } from "../utils/api";
import { toast } from "react-hot-toast";
import AddRuleModal from "../components/automation/AddRuleModal";

const AutomationManager = () => {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');
  const [rules, setRules] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null); 
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  // 1. Load Rules & Global Settings from Central Configurations Hub
  const fetchData = async () => {
    setLoading(true);
    try {
      const [rulesRes, settingsRes] = await Promise.all([
        apiGet("/api/automation-rules"),
        apiGet(`/api/settings?t=${Date.now()}`)
      ]);

      setRules(rulesRes.data || []);
      const rawData = settingsRes?.data || settingsRes || {};
      
      const normalized = {
        ...rawData,
        is_whatsapp_automation_enabled: Number(rawData.is_whatsapp_automation_enabled) === 1,
        is_sms_template_enabled: Number(rawData.is_sms_template_enabled) === 1,
        is_email_trigger_enabled: Number(rawData.is_email_trigger_enabled) === 1,
      };

      setSettings(normalized);
    } catch (err) {
      console.error("Automation Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const isChannelEnabled = () => {
    if (loading || !settings) return true;
    const mapping: Record<string, string> = {
      whatsapp: "is_whatsapp_automation_enabled",
      sms: "is_sms_template_enabled",
      email: "is_email_trigger_enabled",
    };
    return settings[mapping[activeTab]] === true;
  };

  useEffect(() => {
    fetchData();
    const handleSettingsUpdate = () => fetchData();
    window.addEventListener("settings-updated", handleSettingsUpdate);
    return () => {
      window.removeEventListener("settings-updated", handleSettingsUpdate);
    };
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this rule? This will stop all pending messages in the queue.")) return;
    try {
      await apiDelete(`/api/automation-rules/${id}`);
      toast.success("Rule deleted");
      fetchData();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const toggleStatus = async (rule: any) => {
    try {
      const updated = { ...rule, is_active: !rule.is_active };
      await apiPut(`/api/automation-rules/${rule.id}`, updated);
      setRules(rules.map(r => r.id === rule.id ? updated : r));
      toast.success(updated.is_active ? "Rule Activated" : "Rule Paused");
    } catch (err) {
      toast.error("Update failed");
    }
  };

  return (
    <div className="space-y-4 pb-12 text-sm text-slate-900 dark:text-slate-100 font-normal antialiased max-w-6xl mx-auto p-4">
      
      {/* 🎰 AUTOMATION HEADER DECK LAYER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4 select-none w-full shrink-0">
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
            <Zap size={14} className="text-white" fill="currentColor" />
          </div>
          <div>
            <nav className="flex items-center gap-1 text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">
              <span>Automation Engine</span>
              <ChevronRight size={10} strokeWidth={3} className="text-slate-300" />
              <span className="text-slate-600 dark:text-slate-400">Workflows</span>
            </nav>
            
            <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide leading-none">
              AI Workflow Orchestrator
            </h1>
            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1.5 leading-none flex items-center gap-1.5">
              <span>Core Auto-Pilot Node</span>
              <span className="inline-block w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
              <span>{rules.filter(r => r.type === activeTab).length} Active Rule Chains</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button 
            type="button"
            onClick={() => { setEditingRule(null); setIsModalOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-xs cursor-pointer"
          >
            <Plus size={12} strokeWidth={3} />
            <span>New {activeTab} Rule</span>
          </button>
        </div>
      </div>

      {/* ─── Segmented Channel Navigation Tabs ─── */}
      <div className="flex gap-1.5 bg-slate-100/80 dark:bg-slate-950/40 p-1 rounded-xl w-max border border-slate-200/40 dark:border-slate-800/50 select-none">
        {[
          { id: 'whatsapp', icon: MessageSquare, label: 'WhatsApp', color: 'text-emerald-500' },
          { id: 'sms', icon: Smartphone, label: 'SMS', color: 'text-amber-500' },
          { id: 'email', icon: Mail, label: 'Email', color: 'text-purple-500' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                isActive 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/40 dark:border-slate-800/40' 
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Icon size={12} className={isActive ? tab.color : ''} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Global Warning Banner Node ─── */}
      {!loading && !isChannelEnabled() && (
        <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 dark:border-rose-500/30 px-3 py-2.5 rounded-xl text-rose-700 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider animate-in slide-in-from-top-2 duration-150 ease-out max-w-none">
          <div className="flex items-center gap-1.5 flex-1 leading-none">
            <Power size={12} strokeWidth={3} className="text-rose-600 animate-pulse" />
            <span>Channel Master Switch is Offline</span>
            <span className="inline-block w-1 h-1 rounded-full bg-rose-300 dark:bg-rose-700" />
            <span className="font-normal text-slate-500 dark:text-slate-400 lowercase tracking-tight">
              all {activeTab} background workflows are currently frozen cluster-wide.
            </span>
          </div>
          <button 
            type="button"
            onClick={() => window.location.href='/settings?tab=communication'}
            className="px-2.5 py-1 bg-white dark:bg-slate-900 text-rose-600 dark:text-white border border-rose-200 dark:border-slate-700 rounded-lg text-[9px] font-black uppercase transition-all hover:bg-rose-50/50 cursor-pointer shadow-none shrink-0"
          >
            Adjust Settings
          </button>
        </div>
      )}

      {/* ─── Workflow Matrix Data View ─── */}
      <div className="grid gap-3 pt-1">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={24} />
          </div>
        ) : rules.filter(r => r.type === activeTab).length > 0 ? (
          rules.filter(r => r.type === activeTab).map(rule => (
            <div 
              key={rule.id} 
              className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl shadow-xs transition-all ${
                !isChannelEnabled() ? 'opacity-50 grayscale-[0.4]' : ''
              }`}
            >
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 lg:gap-6 flex-1 w-full lg:w-auto">
                  
                  {/* Step 1: Trigger Status */}
                  <div className="flex items-center gap-2.5 min-w-[140px]">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner shrink-0">
                      <Zap size={14} fill="currentColor" />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Trigger Status</p>
                      <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase mt-1 leading-none">{rule.trigger_status}</p>
                    </div>
                  </div>

                  <ChevronRight size={12} className="text-slate-200 dark:text-slate-800 hidden lg:block" />

                  {/* Step 2: Delay Value */}
                  <div className="flex items-center gap-2.5 min-w-[120px]">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner shrink-0">
                      <Clock size={14} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Wait Delay</p>
                      <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase mt-1 leading-none">
                        {rule.delay_value === 0 ? "Instant Execution" : `${rule.delay_value} ${rule.delay_unit}`}
                      </p>
                    </div>
                  </div>

                  <ChevronRight size={12} className="text-slate-200 dark:text-slate-800 hidden lg:block" />

                  {/* Step 3: Template Execution Content */}
                  <div className="flex items-center gap-2.5 min-w-[180px] max-w-xs truncate">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-inner shrink-0 ${
                      activeTab === 'whatsapp' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : 
                      activeTab === 'sms' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600' : 'bg-purple-50 dark:bg-purple-950/40 text-purple-600'
                    }`}>
                      {activeTab === 'whatsapp' ? <MessageSquare size={14}/> : activeTab === 'sms' ? <Smartphone size={14}/> : <Mail size={14}/>}
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Execute Content</p>
                      <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 mt-1 bg-slate-50 dark:bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800 uppercase truncate leading-tight">
                        {rule.template_name || "Raw Template Schema"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Control Panel Action Deck */}
                <div className="flex items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-50 dark:border-slate-800/40 w-full lg:w-auto justify-end shrink-0">
                  <button 
                    type="button"
                    onClick={() => toggleStatus(rule)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all shadow-none cursor-pointer ${
                      rule.is_active ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                    }`}
                  >
                    <Power size={11} strokeWidth={3} />
                    <span>{rule.is_active ? 'Online' : 'Paused'}</span>
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => { setEditingRule(rule); setIsModalOpen(true); }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-all cursor-pointer"
                  >
                    <Settings2 size={14} />
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800/80 rounded-2xl bg-slate-50/20 dark:bg-slate-900/10 select-none">
            <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl shadow-xs flex items-center justify-center text-slate-300 dark:text-slate-700 mb-4 animate-pulse">
              <Zap size={24} />
            </div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No active {activeTab} workflows</p>
            <button 
              type="button"
              onClick={() => setIsModalOpen(true)} 
              className="mt-3 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase hover:underline underline-offset-4 cursor-pointer"
            >
              Configure New Rule
            </button>
          </div>
        )}
      </div>

      <AddRuleModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchData}
        type={activeTab}
        editingRule={editingRule}
      />
    </div>
  );
};

export default AutomationManager;