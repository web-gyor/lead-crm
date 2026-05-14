import React from "react";
import { 
  Zap, 
  Phone, 
  MessageSquare, 
  MessagesSquare, 
  Mail, 
  Info
} from "lucide-react";

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
 const toggle = (
  key:
    | "is_call_recording_enabled"
    | "is_sms_template_enabled"
    | "is_whatsapp_automation_enabled"
    | "is_email_trigger_enabled"
) => {
  setSettings((prev) => {
    const updated = {
      ...prev,
      [key]: !prev[key],
    };

    // reset provider if recording disabled
    if (
      key === "is_call_recording_enabled" &&
      prev.is_call_recording_enabled
    ) {
      updated.telephony_provider = "none";
    }

    return updated;
  });
};

  const ChannelRow = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    active, 
    onClick, 
    color, 
    badge,
    isLast = false 
  }: any) => (
    <div className={`flex items-center justify-between py-4 ${!isLast ? "border-b border-gray-50 dark:border-gray-800" : ""}`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm ${color}`}>
          <Icon size={16} strokeWidth={2.5} />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">{title}</p>
            {badge && (
              <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[8px] font-black uppercase rounded-full tracking-widest">
                {badge}
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase">{subtitle}</p>
        </div>
      </div>
      <button
        onClick={onClick}
        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
          active ? (badge ? "bg-emerald-500" : "bg-blue-600") : "bg-gray-200 dark:bg-gray-700"
        }`}
      >
        <span className={`${active ? "translate-x-5" : "translate-x-1"} inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Module Header Note */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 flex gap-3 items-start">
        <Zap size={14} className="text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-0.5">Communication Modules</p>
          <p className="text-[12px] text-blue-700/70 dark:text-blue-400/70 font-medium leading-relaxed">
            Enable specific channels to streamline lead interaction. Call Recording is currently the active core module.
          </p>
        </div>
      </div>

      <SectionCard title="Channel Configuration">
        {/* 1. Call Recording */}
        <ChannelRow 
          icon={Phone}
          title="Call Recording"
          subtitle="System: Fully Integrated"
          active={settings.is_call_recording_enabled}
          onClick={() => toggle('is_call_recording_enabled')}
          color="bg-blue-600"
        />

        {/* 2. SMS Templates */}
        <ChannelRow 
          icon={MessageSquare}
          title="SMS Templates"
          subtitle="Broadcast & Auto-reply"
          active={settings.is_sms_template_enabled}
          onClick={() => toggle('is_sms_template_enabled')}
          color="bg-emerald-500"
          badge="Coming Soon"
        />

        {/* 3. WhatsApp Automation */}
        <ChannelRow 
          icon={MessagesSquare}
          title="WhatsApp API"
          subtitle="Direct API Automation"
          active={settings.is_whatsapp_automation_enabled}
          onClick={() => toggle('is_whatsapp_automation_enabled')}
          color="bg-green-600"
          badge="In Dev"
        />

        {/* 4. Email Triggers */}
        <ChannelRow 
          icon={Mail}
          title="Email Triggers"
          subtitle="Automated Follow-ups"
          active={settings.is_email_trigger_enabled}
          onClick={() => toggle('is_email_trigger_enabled')}
          color="bg-purple-600"
          badge="Planned"
          isLast={true}
        />
      </SectionCard>

      {/* Provider Selection */}
      {settings.is_call_recording_enabled && (
        <SectionCard title="Telephony Provider">
          <div className="flex gap-3 items-start mb-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
            <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-gray-500 font-medium leading-relaxed uppercase font-bold">
              Select your active carrier. Configuration for API keys is managed in the <span className="text-blue-600">Integrations</span> tab.
            </p>
          </div>
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
    </div>
  );
};

export default CommunicationsTab;