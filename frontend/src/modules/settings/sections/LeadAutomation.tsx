import React from "react";
import { Zap, MessageSquare, MessagesSquare, Mail, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CommSettings {
  is_call_recording_enabled: boolean;
  is_sms_template_enabled: boolean;
  is_whatsapp_automation_enabled: boolean;
  is_email_trigger_enabled: boolean;
  telephony_provider: string;
}

interface LeadAutomationProps {
  settings: CommSettings;
  onChange: (patch: Partial<CommSettings>) => void;
  SectionCard: React.ComponentType<{ title: string; children: React.ReactNode }>;
}

export const LeadAutomation: React.FC<LeadAutomationProps> = ({ 
  settings, 
  onChange, 
  SectionCard 
}) => {
  const navigate = useNavigate();

  const handleToggle = (key: keyof CommSettings) => {
    onChange({ [key]: !settings[key] });
  };

  const ChannelRow = ({ icon: Icon, title, subtitle, active, onClick, color, badge, isLast = false }: any) => (
    <div className={`flex items-center justify-between py-4 ${!isLast ? "border-b border-gray-50 dark:border-gray-800" : ""}`}>
      <div className="flex items-center gap-3 select-none">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm transition-opacity ${active ? 'opacity-100' : 'opacity-40'} ${color}`}>
          <Icon size={16} strokeWidth={2.5} />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">{title}</p>
            {badge && (
              <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded-md tracking-widest ${active ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30" : "bg-gray-100 text-gray-400"}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{subtitle}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClick}
        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors cursor-pointer ${active ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"}`}
      >
        <span className={`${active ? "translate-x-5" : "translate-x-1"} inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* core status descriptive layout banner strip */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 flex gap-3 items-start shadow-sm select-none">
        <Zap size={14} className="text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Automation Core Engine</p>
          <p className="text-xs text-blue-700/70 dark:text-blue-400/70 font-medium leading-relaxed">
            Master runtime triggers configured here broadcast rule sequences globally across inbound pipeline entries.
          </p>
        </div>
      </div>

      <SectionCard title="Automation Master Triggers Switches">
        <ChannelRow icon={MessagesSquare} title="WhatsApp Rules Trigger" subtitle={settings.is_whatsapp_automation_enabled ? "AI Engine Broadcast: Online" : "AI Engine Broadcast: Global Deactivated"} active={settings.is_whatsapp_automation_enabled} onClick={() => handleToggle('is_whatsapp_automation_enabled')} color="bg-emerald-600" badge={settings.is_whatsapp_automation_enabled ? "Active" : "Disabled"} />
        <ChannelRow icon={MessageSquare} title="SMS Broadcast Engine" subtitle={settings.is_sms_template_enabled ? "Direct Gateway Routing: Online" : "Direct Gateway Routing: Deactivated"} active={settings.is_sms_template_enabled} onClick={() => handleToggle('is_sms_template_enabled')} color="bg-blue-500" badge={settings.is_sms_template_enabled ? "Active" : "Disabled"} />
        <ChannelRow icon={Mail} title="Email Follow-up Pipeline" subtitle={settings.is_email_trigger_enabled ? "Drip Trigger Action: Online" : "Drip Trigger Action: Paused"} active={settings.is_email_trigger_enabled} onClick={() => handleToggle('is_email_trigger_enabled')} color="bg-purple-600" badge={settings.is_email_trigger_enabled ? "Active" : "Disabled"} isLast={true} />

        <div onClick={() => navigate("/automation")} className="mt-4 p-4 border border-blue-100 dark:border-blue-900/20 bg-blue-50/30 dark:bg-blue-900/5 rounded-xl flex items-center justify-between group cursor-pointer hover:border-blue-300 transition-all select-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md"><Zap size={14} fill="currentColor" /></div>
            <div>
              <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase">Go to Automation Dashboard</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Configure lead rules, delays & triggers</p>
            </div>
          </div>
          <ExternalLink size={14} className="text-blue-600 group-hover:translate-x-1 transition-transform" />
        </div>
      </SectionCard>
    </div>
  );
};