import React, { useState, useEffect, useCallback, useMemo } from "react";
import { apiGet, apiPut } from "../../utils/api";
import { useToast } from "../../hooks/useToast";

import { SettingsSidebar, SettingsGroup } from "./layout/SettingsSidebar";
import { SettingsHeader } from "./layout/SettingsHeader";

// Contextual Layout Sub-Section Modules
import { SettingsOverview } from "./sections/SettingsOverview";
import { CompanySettings } from "./sections/CompanySettings";
import { LeadCapture } from "./sections/LeadCapture";
import { LeadAutomation } from "./sections/LeadAutomation.tsx";
import { TemplateLibrary } from "./sections/TemplateLibrary";
import { CallRecording } from "./sections/CallRecording";
import { Backup } from "./sections/Backup";

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 rounded-2xl space-y-4 shadow-3xs">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800 pb-2 select-none">{title}</p>
    {children}
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">{label}</label>
    {children}
  </div>
);

export default function SettingsDashboardHub() {
  const { addToast } = useToast();
  const [activeGroup, setActiveGroup] = useState<SettingsGroup>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [syncTime, setSyncTime] = useState("");

  const [company, setCompany] = useState({ 
    name: "", 
    phone: "", 
    email: "", 
    address: "", 
    website: "", 
    logo_url: "", 
    agency_contact_name: "", 
    agency_contact_email: "", 
    logo_file: null as File | null 
  });
  const [account, setAccount] = useState({ fullName: "", email: "" });
  const [commSettings, setCommSettings] = useState({
    is_call_recording_enabled: false,
    is_sms_template_enabled: false,
    is_whatsapp_automation_enabled: false,
    is_email_trigger_enabled: false,
    telephony_provider: "none"
  });

  const cleanBaseUrl = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:4000").replace(/\/$/, "");

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiGet("/api/settings");
      const data = res?.data || res;
      if (!data) return;

      setCompany({
        name: data.company_name || "",
        phone: data.company_phone || "",
        email: data.company_email || "",
        address: data.company_address || "",
        website: data.company_website || "",
        logo_url: data.logo_url || "",
        agency_contact_name: data.agency_contact_name || "",
        agency_contact_email: data.agency_contact_email || "",
        logo_file: null
      });

      setAccount({
        fullName: data.admin_name || "",
        email: data.admin_email || ""
      });

      setCommSettings({
        is_call_recording_enabled: !!data.is_call_recording_enabled,
        is_sms_template_enabled: !!data.is_sms_template_enabled,
        is_whatsapp_automation_enabled: !!data.is_whatsapp_automation_enabled,
        is_email_trigger_enabled: !!data.is_email_trigger_enabled,
        telephony_provider: data.telephony_provider || "none"
      });

      setSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setIsDirty(false);
    } catch {
      addToast("Failed to synchronize cluster configurations", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // 🎯 CORE SYNCHRONIZATION EVENT INTERCEPTOR:
  // Listens for custom standalone component toggle switches to update the core state engine
  useEffect(() => {
    fetchSettings();
    
    const handleToggleSync = () => {
      console.log("[SETTINGS SYNC]: Standalone toggle operation processed. Re-fetching data schema...");
      fetchSettings();
    };

    window.addEventListener("settings-updated", handleToggleSync);
    window.addEventListener("settingsUpdated", handleToggleSync);
    
    return () => {
      window.removeEventListener("settings-updated", handleToggleSync);
      window.removeEventListener("settingsUpdated", handleToggleSync);
    };
  }, [fetchSettings]);

  const handleSave = async () => {
    if (saving) return;

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("company_name", company.name.trim());
      formData.append("company_phone", company.phone.trim());
      formData.append("company_email", company.email.trim());
      formData.append("company_address", company.address.trim());
      formData.append("company_website", company.website.trim());
      
      formData.append("agency_contact_name", company.agency_contact_name.trim());
      formData.append("agency_contact_email", company.agency_contact_email.trim());
      
      formData.append("is_call_recording_enabled", commSettings.is_call_recording_enabled ? "true" : "false");
      formData.append("is_sms_template_enabled", commSettings.is_sms_template_enabled ? "true" : "false");
      formData.append("is_whatsapp_automation_enabled", commSettings.is_whatsapp_automation_enabled ? "true" : "false");
      formData.append("is_email_trigger_enabled", commSettings.is_email_trigger_enabled ? "true" : "false");
      formData.append("telephony_provider", commSettings.telephony_provider);

      if (company.logo_file) {
        formData.append("logo", company.logo_file);
      } else {
        formData.append("logo_url", company.logo_url);
      }

      await apiPut("/api/settings", formData);
      addToast("Systems core config snapshot committed cleanly", "success");
      fetchSettings();
    } catch (err: any) {
      addToast(err?.response?.data?.error || "Data sync write exception rejected", "error");
    } finally {
      setSaving(false);
    }
  };

  const breadcrumbs = useMemo(() => {
    const groupLabels: Record<SettingsGroup, string> = {
      overview: "Control Dashboard Overview",
      company: "Company Settings & Admin Spec",
      'lead-capture': "Lead Capture Configuration Options",
      'lead-automation': "Active Lead Automation Switches",
      templates: "CRM Template Library Workspace",
      'call-recording': "Voice Trunk Telephony Gateways",
      backup: "Infrastructure Datastore Backups"
    };
    return ["Administration Hub", groupLabels[activeGroup]];
  }, [activeGroup]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 select-none">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent dark:border-blue-400 rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 animate-pulse">Synchronizing Cluster Parameters...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 transition-premium select-none">
      <SettingsHeader breadcrumbs={breadcrumbs} lastSaved={syncTime} isDirty={isDirty} onSave={handleSave} onRevert={fetchSettings} isSaving={saving} />

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <SettingsSidebar activeGroup={activeGroup} onGroupChange={setActiveGroup} />
        
        <div className="flex-1 w-full min-w-0 bg-transparent">
          {activeGroup === 'overview' && <SettingsOverview />}
          {activeGroup === 'company' && (
            <CompanySettings 
              company={company} 
              account={account}
              onCompanyChange={(p) => { setCompany(prev => ({ ...prev, ...p })); setIsDirty(true); }} 
              cleanBaseUrl={cleanBaseUrl} 
            />
          )}
          {activeGroup === 'lead-capture' && <LeadCapture settings={commSettings} onChange={(p) => { setCommSettings(prev => ({ ...prev, ...p })); setIsDirty(true); }} />}
          {activeGroup === 'lead-automation' && <LeadAutomation settings={commSettings} onChange={(p) => { setCommSettings(prev => ({ ...prev, ...p })); setIsDirty(true); }} SectionCard={SectionCard} />}
          {activeGroup === 'templates' && <TemplateLibrary SectionCard={SectionCard} inputCls="input-enterprise" />}
          
          {/* 🎯 FIXED: Passed down setSettings state dispatch modifier hook to prevent TypeErrors */}
          {activeGroup === 'call-recording' && (
            <CallRecording 
              settings={commSettings} 
              setSettings={setCommSettings} 
              SectionCard={SectionCard} 
              Field={Field} 
              inputCls="input-enterprise" 
            />
          )}
          
          {activeGroup === 'backup' && <Backup />}
        </div>
      </div>
    </div>
  );
}