import React, { useState, useEffect } from "react";
import { Zap, Clock, MessageSquare, Mail, Smartphone, Plus, Trash2, Power, Settings2, Loader2, ChevronRight, AlertCircle } from "lucide-react";
import { apiGet, apiDelete, apiPut } from "../utils/api";
import { toast } from "react-hot-toast";
import AddRuleModal from "../components/automation/AddRuleModal";

const AutomationManager = () => {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');
  const [rules, setRules] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null); // State for Master Switches
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  // 1. Load Rules & Global Settings
const fetchData = async () => {
  setLoading(true);
  try {
    const [rulesRes, settingsRes] = await Promise.all([
      apiGet("/api/automation-rules"),
      apiGet(`/api/settings?t=${Date.now()}`)
    ]);

    setRules(rulesRes.data || []);

    // Extracting data based on your specific backend response structure
    const rawData = settingsRes?.data || settingsRes || {};
    
    // Normalize everything to strict Booleans once here
    const normalized = {
      ...rawData,
      is_whatsapp_automation_enabled: Number(rawData.is_whatsapp_automation_enabled) === 1,
      is_sms_template_enabled: Number(rawData.is_sms_template_enabled) === 1,
      is_email_trigger_enabled: Number(rawData.is_email_trigger_enabled) === 1,
    };

    console.log("✅ DASHBOARD SYNCED:", normalized);
    setSettings(normalized);
  } catch (err) {
    console.error("Dashboard Sync Error:", err);
  } finally {
    setLoading(false);
  }
};
const isChannelEnabled = () => {
  // Always assume enabled during loading to prevent UI flicker
  if (loading || !settings) return true;

  const mapping: Record<string, string> = {
    whatsapp: "is_whatsapp_automation_enabled",
    sms: "is_sms_template_enabled",
    email: "is_email_trigger_enabled",
  };

  const key = mapping[activeTab];
  
  // Since we normalized in fetchData, this is now a simple boolean check
  return settings[key] === true;
};

useEffect(() => {
  fetchData();

  const handleSettingsUpdate = () => fetchData();

  // Listen for the custom "handshake" event from CommunicationsTab
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
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/20">
              <Zap size={20} fill="currentColor" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900 dark:text-white leading-none">
              AI Automation <span className="text-blue-600">Engine</span>
            </h1>
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-[52px]">Control WebGyor's auto-pilot workflows</p>
        </div>
        <button 
          onClick={() => { setEditingRule(null); setIsModalOpen(true); }}
          className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
        >
          <Plus size={16} /> New {activeTab} Rule
        </button>
      </div>

      {/* 2. Channel Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl w-fit border border-gray-200 dark:border-gray-800">
        {[
          { id: 'whatsapp', icon: MessageSquare, label: 'WhatsApp', color: 'text-emerald-500' },
          { id: 'sms', icon: Smartphone, label: 'SMS', color: 'text-amber-500' },
          { id: 'email', icon: Mail, label: 'Email', color: 'text-purple-500' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
              activeTab === tab.id ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <tab.icon size={14} className={activeTab === tab.id ? tab.color : ''} />
            {tab.label}
          </button>
        ))}
      </div>

  {/* 3. Global Status Alert & Master Sync */}
{!loading && !isChannelEnabled() && (
  <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl p-4 flex gap-4 items-center animate-in slide-in-from-top-4 duration-300 shadow-sm shadow-red-500/5">
    {/* Animated Power Icon */}
    <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/20 shrink-0">
      <Power size={18} className="animate-pulse" />
    </div>

    {/* Message Content */}
    <div className="flex-1">
      <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-0.5">
        Channel Globally Disabled
      </p>
      <p className="text-[12px] text-red-700/70 dark:text-red-400/70 font-medium leading-tight">
        The master switch for <span className="font-bold text-red-700 dark:text-red-400">{activeTab.toUpperCase()}</span> is OFF in Settings. All automation workflows for this channel are currently paused.
      </p>
    </div>

    {/* Action Button */}
    <button 
      onClick={() => window.location.href='/settings?tab=communication'}
      className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-[9px] font-black uppercase text-red-600 border border-red-200 dark:border-red-900/40 rounded-xl hover:bg-red-50 hover:scale-105 active:scale-95 transition-all shadow-sm"
    >
      Open Settings
    </button>
  </div>
)}
      {/* 4. Rules Workflow Grid */}
      <div className="grid gap-4">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
        ) : rules.filter(r => r.type === activeTab).length > 0 ? (
          rules.filter(r => r.type === activeTab).map(rule => (
            <div key={rule.id} className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all ${!isChannelEnabled() ? 'opacity-60 grayscale-[0.5]' : ''}`}>
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                
                {/* Visual Workflow Path */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 lg:gap-8 flex-1">
                  
                  {/* Step 1: Trigger */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 shadow-inner">
                      <Zap size={16} fill="currentColor" />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Trigger Status</p>
                      <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase mt-1.5">{rule.trigger_status}</p>
                    </div>
                  </div>

                  <ChevronRight size={14} className="text-gray-200 dark:text-gray-800 hidden lg:block" />

                  {/* Step 2: Delay */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 shadow-inner">
                      <Clock size={16} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Wait Time</p>
                      <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase mt-1.5">
                        {rule.delay_value === 0 ? "Instant" : `${rule.delay_value} ${rule.delay_unit}`}
                      </p>
                    </div>
                  </div>

                  <ChevronRight size={14} className="text-gray-200 dark:text-gray-800 hidden lg:block" />

                  {/* Step 3: Action */}
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-inner ${
                      activeTab === 'whatsapp' ? 'bg-emerald-50 text-emerald-600' : 
                      activeTab === 'sms' ? 'bg-amber-50 text-amber-600' : 'bg-purple-50 text-purple-600'
                    }`}>
                      {activeTab === 'whatsapp' ? <MessageSquare size={16}/> : activeTab === 'sms' ? <Smartphone size={16}/> : <Mail size={16}/>}
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Execute Content</p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-gray-50 dark:bg-gray-800 text-[10px] font-black text-gray-600 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-700 uppercase truncate max-w-[180px]">
                          {rule.template_name}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Control Panel */}
                <div className="flex items-center gap-2 pt-4 lg:pt-0 border-t lg:border-t-0 border-gray-50 w-full lg:w-auto justify-end">
                  <button 
                    onClick={() => toggleStatus(rule)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${
                      rule.is_active ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <Power size={12} />
                    {rule.is_active ? 'Online' : 'Paused'}
                  </button>
                  <button 
                    onClick={() => { setEditingRule(rule); setIsModalOpen(true); }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-90"
                  >
                    <Settings2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-90"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/30 dark:bg-gray-900/10">
             <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-xl shadow-sm flex items-center justify-center text-gray-300 mb-4 animate-pulse">
              <Zap size={28} />
            </div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">No active {activeTab} workflows</p>
            <button onClick={() => setIsModalOpen(true)} className="mt-4 text-[10px] font-black text-blue-600 uppercase hover:underline underline-offset-4">Configure New Rule</button>
          </div>
        )}
      </div>

      {/* Add Rule Modal */}
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