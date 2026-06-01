import React from "react";
import { Phone } from "lucide-react";
import { apiPut } from "../../../utils/api";

// 🎯 SWAPPED: Wiped out react-hot-toast for your unified custom toast framework context hook
import { useToast } from "../../../hooks/useToast";

interface CommSettings {
  is_call_recording_enabled: boolean;
  is_sms_template_enabled: boolean;
  is_whatsapp_automation_enabled: boolean;
  is_email_trigger_enabled: boolean;
  telephony_provider: string;
}

interface CallRecordingTabProps {
  settings: CommSettings;
  setSettings: React.Dispatch<React.SetStateAction<CommSettings>>
  SectionCard: React.ComponentType<{ title: string; children: React.ReactNode }>;
  Field: React.ComponentType<{ label: string; children: React.ReactNode }>;
  inputCls: string;
}

export const CallRecording: React.FC<CallRecordingTabProps> = ({
  settings,
  setSettings,
  SectionCard,
  Field,
  inputCls
}) => {
  // 🎯 INJECT UNIFIED MODERN TOAST HOOK
  const { addToast } = useToast();

const toggleRecording = async () => {
    if (!settings) return;
    const currentValue = settings.is_call_recording_enabled;
    const newValue = !currentValue;

    // 🎯 STEP 1: Optimistically set the local state view
    setSettings((prev) => ({ ...prev, is_call_recording_enabled: newValue }));

    try {
      // 🎯 STEP 2: Pass explicit integer flags to line up with MySQL tinyint records
      const response = await apiPut("/api/settings", { 
        is_call_recording_enabled: newValue ? 1 : 0 
      }) as any;

      // 🎯 STEP 3: Handle both standardized response layouts safely
      if (response && (response.success || response.data?.success || response.status === 'success')) {
        addToast("Recording preference updated successfully", "success");
        
        // Match the exact string casing used by your MainLayout event listener:
        window.dispatchEvent(new Event("settingsUpdated"));
      } else {
        throw new Error("Invalid backend state confirmation received");
      }
    } catch (err) {
      console.error("[TOGGLE OPERATION ERROR]:", err);
      
      // 🎯 STEP 4: Roll back state seamlessly if the transactional query falls through
      setSettings((prev) => ({ ...prev, is_call_recording_enabled: currentValue }));
      addToast("Database connection failure", "error");
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <SectionCard title="Voice Log Routing Parameters">
        <div className="flex items-center justify-between py-2 select-none">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white bg-blue-600 shadow-sm transition-opacity ${settings.is_call_recording_enabled ? 'opacity-100' : 'opacity-40'}`}>
              <Phone size={16} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">Call Recording Monitor</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Record and bridge communication streams automatically</p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleRecording}
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors cursor-pointer ${settings.is_call_recording_enabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"}`}
          >
            <span className={`${settings.is_call_recording_enabled ? "translate-x-5" : "translate-x-1"} inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm`} />
          </button>
        </div>
      </SectionCard>

      {settings.is_call_recording_enabled && (
        <SectionCard title="Active Trunk Routing Gateway">
          <Field label="Active Telephony Carrier Provider">
            <select 
              value={settings.telephony_provider}
              onChange={(e) => setSettings(p => ({ ...p, telephony_provider: e.target.value }))}
              className={inputCls}
            >
              <option value="none">Manual Calling Operations (No API Bridging)</option>
              <option value="exotel">Exotel Cloud Telephony Link (Asia Trunk)</option>
              <option value="twilio">Twilio Programmable Voice SIP (Global Trunk)</option>
            </select>
          </Field>
        </SectionCard>
      )}
    </div>
  );
};