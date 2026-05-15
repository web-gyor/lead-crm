import React, { useState } from "react";
import { apiPut } from "../utils/api";
import { toast } from "react-hot-toast"; 
import { 
  Zap, 
  Phone, 
  MessageSquare, 
  MessagesSquare, 
  Mail, 
  Info,
  LayoutList,
  Settings2,
  ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom"; // Use navigate instead of window.location for SPA speed
import WhatsAppTemplateModal from "./WhatsAppTemplateModal";
import SMSTemplateModal from "./SMSTemplateModal"; 
import EmailTemplateModal from "./EmailTemplateModal"; 

interface CommSettings {
  is_call_recording_enabled: boolean;
  is_sms_template_enabled: boolean;
  is_whatsapp_automation_enabled: boolean;
  is_email_trigger_enabled: boolean;
  telephony_provider: string;
}

interface CommunicationsTabProps {
  settings: CommSettings;
  setSettings: React.Dispatch<React.SetStateAction<CommSettings>>;
  SectionCard: React.ComponentType<{ title: string; children: React.ReactNode }>;
  Field: React.ComponentType<{ label: string; children: React.ReactNode }>;
  inputCls: string;
}

const CommunicationsTab: React.FC<CommunicationsTabProps> = ({ 
  settings, 
  setSettings, 
  SectionCard, 
  Field, 
  inputCls 
}) => {
  const navigate = useNavigate();
  const [isWATemplateOpen, setIsWATemplateOpen] = useState(false);
  const [isSMSTemplateOpen, setIsSMSTemplateOpen] = useState(false);
  const [isEmailTemplateOpen, setIsEmailTemplateOpen] = useState(false);

const toggle = async (key: keyof CommSettings) => {
  if (!settings) return;

  const currentValue = settings[key];
  const newValue = !currentValue;

  // instant UI update
  setSettings((prev) => ({
    ...prev,
    [key]: newValue
  }));

  try {

    // SEND ONLY ONE FIELD
    const payload = {
      [key]: newValue ? 1 : 0
    };

    console.log("TOGGLE PAYLOAD:", payload);

    const response = await apiPut(
      "/api/settings",
      payload
    );

    console.log("SETTINGS SAVE RESPONSE:", response);

    if (response?.data?.success || response?.success) {

      toast.success("Preference Saved");

      window.dispatchEvent(
        new Event("settings-updated")
      );

    } else {
      throw new Error("Update failed");
    }

  } catch (err) {

    console.error("Toggle Error:", err);

    // rollback
    setSettings((prev) => ({
      ...prev,
      [key]: currentValue
    }));

    toast.error("Database sync failed");
  }
};

  const ChannelRow = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    active, 
    onClick, 
    color, 
    badge,
    isLast = false,
    mode = "toggle" 
  }: any) => (
    <div className={`flex items-center justify-between py-4 ${!isLast ? "border-b border-gray-50 dark:border-gray-800" : ""}`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm transition-opacity ${active ? 'opacity-100' : 'opacity-40'} ${color}`}>
          <Icon size={16} strokeWidth={2.5} />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">{title}</p>
            {badge && (
              <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded-md tracking-widest transition-colors ${
                active ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30" : "bg-gray-100 text-gray-400"
              }`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{subtitle}</p>
        </div>
      </div>

      {mode === "toggle" ? (
        <button
          onClick={onClick}
          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
            active ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
          }`}
        >
          <span className={`${active ? "translate-x-5" : "translate-x-1"} inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm`} />
        </button>
      ) : (
        <button
          onClick={onClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-all border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95"
        >
          <Settings2 size={12} className="opacity-70" />
          <span className="text-[10px] font-black uppercase tracking-wider">Manage</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Module Header Note */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 flex gap-3 items-start shadow-sm shadow-blue-500/5">
        <Zap size={14} className="text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-2">
            Communication Engine <span className="h-1 w-1 rounded-full bg-blue-300 animate-pulse" />
          </p>
          <p className="text-[12px] text-blue-700/70 dark:text-blue-400/70 font-medium leading-relaxed">
            Manage your interaction channels. Master switches here control the AI Automation Engine globally across all lead workflows.
          </p>
        </div>
      </div>

   <SectionCard title="Automation Master Switches">
  {/* WhatsApp Row */}
  <ChannelRow 
    icon={MessagesSquare}
    title="WhatsApp Automation"
    subtitle={settings.is_whatsapp_automation_enabled ? "Rules Engine: Online" : "Rules Engine: Global Disable"}
    active={settings.is_whatsapp_automation_enabled}
    onClick={() => toggle('is_whatsapp_automation_enabled')}
    color="bg-emerald-600"
    badge={settings.is_whatsapp_automation_enabled ? "Active" : "Disabled"}
  />

  {/* NEW: SMS Row */}
  <ChannelRow 
    icon={MessageSquare}
    title="SMS Automation"
    subtitle={settings.is_sms_template_enabled ? "Direct API: Online" : "Direct API: Global Disable"}
    active={settings.is_sms_template_enabled}
    onClick={() => toggle('is_sms_template_enabled')}
    color="bg-blue-500"
    badge={settings.is_sms_template_enabled ? "Active" : "Disabled"}
  />

  {/* Email Row */}
  <ChannelRow 
    icon={Mail}
    title="Email Automation"
    subtitle={settings.is_email_trigger_enabled ? "Auto-Followups: Online" : "Auto-Followups: Paused"}
    active={settings.is_email_trigger_enabled}
    onClick={() => toggle('is_email_trigger_enabled')}
    color="bg-purple-600"
    badge={settings.is_email_trigger_enabled ? "Active" : "Disabled"}
  />

        {/* DASHBOARD LINK CARD */}
        <div 
          onClick={() => navigate("/automation")}
          className="mt-4 p-4 border border-blue-100 dark:border-blue-900/20 bg-blue-50/30 dark:bg-blue-900/5 rounded-xl flex items-center justify-between group cursor-pointer hover:border-blue-300 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Zap size={14} fill="currentColor" />
            </div>
            <div>
              <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase">Go to Automation Dashboard</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Configure rules, delays & triggers</p>
            </div>
          </div>
          <ExternalLink size={14} className="text-blue-600 group-hover:translate-x-1 transition-transform" />
        </div>
      </SectionCard>

      <SectionCard title="Template Library & Voice">
         {/* CALLS */}
         <ChannelRow 
          icon={Phone}
          title="Call Recording"
          subtitle="System: Cloud Voice Integration"
          active={settings.is_call_recording_enabled}
          onClick={() => toggle('is_call_recording_enabled')}
          color="bg-blue-600"
        />

        <div className="px-4 py-2 mt-2 bg-gray-50/50 dark:bg-gray-800/40 border-y border-gray-100 dark:border-gray-800">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Library Management</p>
        </div>

        <ChannelRow 
          icon={LayoutList}
          title="WhatsApp Templates"
          subtitle="Pre-approved message assets"
          mode="manage"
          onClick={() => setIsWATemplateOpen(true)}
          color="bg-emerald-500"
        />

        <ChannelRow 
          icon={MessageSquare}
          title="SMS Library"
          subtitle="Short message sequences"
          mode="manage"
          onClick={() => setIsSMSTemplateOpen(true)}
          color="bg-blue-400"
        />

        <ChannelRow 
          icon={Mail}
          title="Email Library"
          subtitle="Rich-text layout editor"
          mode="manage"
          onClick={() => setIsEmailTemplateOpen(true)}
          color="bg-purple-500"
          isLast={true}
        />

         {/* DASHBOARD LINK CARD */}
        <div 
          onClick={() => navigate("/communication")}
          className="mt-4 p-4 border border-blue-100 dark:border-blue-900/20 bg-blue-50/30 dark:bg-blue-900/5 rounded-xl flex items-center justify-between group cursor-pointer hover:border-blue-300 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Zap size={14} fill="currentColor" />
            </div>
            <div>
              <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase">Go to Communication Dashboard</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Rec calls, Send Whatsapp, SMS, and Email. </p>
            </div>
          </div>
          <ExternalLink size={14} className="text-blue-600 group-hover:translate-x-1 transition-transform" />
        </div>
      </SectionCard>

      {/* Provider Selection */}
      {settings.is_call_recording_enabled && (
        <SectionCard title="Telephony Provider">
          <Field label="Active Service Provider">
            <select 
              value={settings.telephony_provider}
              onChange={(e) => setSettings(p => ({ ...p, telephony_provider: e.target.value }))}
              className={inputCls}
            >
              <option value="none">Manual Calling Only</option>
              <option value="exotel">Exotel (India/Kerala)</option>
              <option value="twilio">Twilio (Global/Gulf)</option>
            </select>
          </Field>
        </SectionCard>
      )}

      {/* Modals remain the same */}
      <WhatsAppTemplateModal isOpen={isWATemplateOpen} onClose={() => setIsWATemplateOpen(false)} inputCls={inputCls} />
      <SMSTemplateModal isOpen={isSMSTemplateOpen} onClose={() => setIsSMSTemplateOpen(false)} inputCls={inputCls} />
      <EmailTemplateModal isOpen={isEmailTemplateOpen} onClose={() => setIsEmailTemplateOpen(false)} inputCls={inputCls} />
    </div>
  );
};

export default CommunicationsTab;