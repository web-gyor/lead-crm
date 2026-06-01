import React, { useState, useEffect } from "react";
import { 
  Facebook, MessageSquare, Globe, Share2, Copy, Check, Settings as SettingsIcon, Link2 
} from "lucide-react";
import { apiGet, apiPut } from "../../../utils/api";
import { useToast } from "../../../hooks/useToast";
import ConfigModal from "../../../components/ConfigModal";

// ─── Shared Structure Interfaces ─────────────────────────────────────────────
export interface IntegrationField {
  key: string;
  label: string;
  placeholder: string;
  hint: string;
  type?: "text" | "password";
}

export interface IntegrationSource {
  id: string;
  name: string;
  Icon: any;
  bgColor: string;
  ringColor: string;
  description: string;
  color: string;
  steps: string[];
  fields: IntegrationField[];
}

interface LeadCaptureProps {
  accountName?: string;
}

// ─── Data Matrix Constants ───────────────────────────────────────────────────
export const SOURCES: IntegrationSource[] = [
  {
    id: "meta",
    name: "Meta Lead Ads",
    Icon: Facebook,
    bgColor: "#1877F2",
    ringColor: "rgba(24,119,242,0.15)",
    description: "Capture leads from FB & Instagram",
    color: "bg-[#1877F2]",
    steps: [
      "Connect your Meta Business account in Business Suite",
      "Enable Lead Ads permissions for your app",
      "Paste your Page ID and Access Token below",
    ],
    fields: [
      { key: "page_id",      label: "Facebook Page ID",        placeholder: "1234567890", hint: "Found in Page Settings → Page Info" },
      { key: "access_token", label: "Page Access Token",       placeholder: "EAABs...",   hint: "Generate in Meta Business Suite → Settings → Tokens", type: "password" },
      { key: "form_id",      label: "Lead Form ID (optional)", placeholder: "Optional",   hint: "Leave blank to capture all forms on this page" },
    ],
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    Icon: MessageSquare,
    bgColor: "#25D366",
    ringColor: "rgba(37,211,102,0.15)",
    description: "Direct chat lead generation",
    color: "bg-[#25D366]",
    steps: [
      "Create a Meta app and enable the WhatsApp product",
      "Add the universal webhook URL under Webhooks → Messages",
      "Paste your Phone Number ID, Token, and Verify Token below",
    ],
    fields: [
      { key: "phone_id",     label: "Phone Number ID",         placeholder: "1234...",    hint: "WhatsApp Business API → Phone Numbers" },
      { key: "token",        label: "Permanent Access Token",  placeholder: "EAABs...",   hint: "Meta Developer Console → App Dashboard", type: "password" },
      { key: "verify_token", label: "Webhook Verify Token",    placeholder: "my_secret",  hint: "Any secret string — you choose it",      type: "password" },
    ],
  },
  {
    id: "google",
    name: "Google Ads Form",
    Icon: Globe,
    bgColor: "#EA4335",
    ringColor: "rgba(234,67,53,0.15)",
    description: "Search and Display lead forms",
    color: "bg-[#EA4335]",
    steps: [
      "Open Google Ads → Assets → Lead Forms",
      "Under Delivery, paste the universal webhook URL and set a secret",
      "Copy the Customer ID and Webhook Secret below",
    ],
    fields: [
      { key: "customer_id",    label: "Google Ads Customer ID", placeholder: "123-456-7890", hint: "10-digit number shown top-right in Ads dashboard" },
      { key: "webhook_secret", label: "Webhook Secret",          placeholder: "goog_...",     hint: "Set this in Google Ads → Lead Form → Webhook", type: "password" },
    ],
  },
  {
    id: "website",
    name: "Website Form",
    Icon: Globe,
    bgColor: "#6366F1",
    ringColor: "rgba(99,102,241,0.15)",
    description: "Elementor & Custom Webhooks",
    color: "bg-[#6366F1]",
    steps: [
      "In Elementor (or WPForms), go to Form Actions → Webhooks",
      "Set the destination URL to your universal webhook URL above",
      "Add request header X-Secret with the key below",
    ],
    fields: [
      { key: "secret_key", label: "Webhook Secret Key", placeholder: "wh_live_...", hint: "Add this as the X-Secret header in your form plugin", type: "password" },
    ],
  },
  {
    id: "linkedin",
    name: "LinkedIn Lead Gen",
    Icon: Share2,
    bgColor: "#0A66C2",
    ringColor: "rgba(10,102,194,0.15)",
    description: "B2B professional lead generation",
    color: "bg-[#0A66C2]",
    steps: [
      "Create a LinkedIn developer app with Marketing API access",
      "Enable Lead Sync Webhook in Campaign Manager",
      "Paste your Client ID, Secret, and Form ID below",
    ],
    fields: [
      { key: "client_id",     label: "LinkedIn Client ID", placeholder: "86abc...",               hint: "Developer Apps → App Credentials" },
      { key: "client_secret", label: "Client Secret",      placeholder: "XXXXXXXX",               hint: "Keep this private — never expose client-side", type: "password" },
      { key: "form_id",       label: "Lead Gen Form ID",   placeholder: "urn:li:leadGenForm:...", hint: "Campaign Manager → Lead Gen Forms" },
    ],
  },
];

export const LeadCapture: React.FC<LeadCaptureProps> = ({ accountName = "webgyor-media" }) => {
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<IntegrationSource | null>(null);
  const [savedConfigs, setSavedConfigs] = useState<Record<string, Record<string, string>>>({});

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:4000";
  const projectSlug = accountName.toLowerCase().replace(/\s+/g, "-");
  const webhookUrl = `${API_BASE.replace(/\/$/, "")}/api/leads/capture?project_id=${projectSlug}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Sync Ingestion Data Channels Matrix States
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await apiGet("/api/integrations");
        if (res?.data && isMounted) {
          const active: string[] = [];
          const configs: Record<string, Record<string, string>> = {};
          res.data.forEach((i: any) => {
            if (i.is_active) active.push(i.source_key);
            if (i.config_data) configs[i.source_key] = i.config_data;
          });
          setActiveSources(active);
          setSavedConfigs(configs);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const handleToggle = (sourceId: string, currentlyActive: boolean) => {
    if (currentlyActive) {
      apiPut("/api/integrations/toggle", { source_key: sourceId, is_active: false, config_data: {} })
        .then(() => { 
          setActiveSources((prev) => prev.filter((id) => id !== sourceId)); 
          addToast("Integration deactivated successfully", "success"); 
        })
        .catch(() => addToast("Update configuration execution failure", "error"));
    } else {
      setSelectedSource(SOURCES.find((s) => s.id === sourceId) ?? null);
    }
  };

  const handleConfigure = (sourceId: string) => {
    setSelectedSource(SOURCES.find((s) => s.id === sourceId) ?? null);
  };

  const handleModalSave = async (configData: Record<string, string>) => {
    if (!selectedSource) return;
    try {
      await apiPut("/api/integrations/toggle", { source_key: selectedSource.id, is_active: true, config_data: configData });
      setActiveSources((prev) => [...new Set([...prev, selectedSource.id])]);
      setSavedConfigs((prev) => ({ ...prev, [selectedSource.id]: configData }));
      setSelectedSource(null);
      addToast(`${selectedSource.name} ingestion channel activated!`, "success");
    } catch { 
      addToast("Credentials validation rejected", "error"); 
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 select-none">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Syncing Webhook Configurations...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
      <div className="lg:col-span-2 space-y-5">
        
        {/* Core Trigger Info Switch Status Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 flex gap-3 items-start select-none">
          <Link2 size={14} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Lead Capture Channels Management</p>
            <p className="text-xs text-blue-700/70 dark:text-blue-400/70 font-medium leading-relaxed">
              Toggle a marketing channel source to register its webhook context. Use the <SettingsIcon size={11} className="inline -mt-0.5 mx-0.5" /> configurations action panel button to sync authentication tokens.
            </p>
          </div>
        </div>

        {/* Integration Grid Pipeline Sources mapping list */}
        <div className="grid grid-cols-1 gap-3">
          {SOURCES.map((source) => {
            const isActive = activeSources.includes(source.id);
            const Icon = source.Icon;

            return (
              <div 
                key={source.id} 
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 flex items-center justify-between shadow-3xs transition-all ${
                  isActive ? "border-blue-500/30 dark:border-blue-400/30 ring-1 ring-blue-500/5" : "border-slate-200/60 dark:border-slate-800/80"
                }`}
              >
                <div className="flex items-center gap-3.5 overflow-hidden select-none">
                  <div 
                    className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: source.bgColor }}
                  >
                    <Icon size={18} className="stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight truncate">{source.name}</h3>
                      {isActive && (
                        <span className="shrink-0 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-extrabold uppercase rounded tracking-widest">
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase mt-0.5 truncate">{source.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {isActive && (
                    <button 
                      onClick={() => handleConfigure(source.id)}
                      className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-slate-950/40 cursor-pointer"
                      title="Credential Settings"
                    >
                      <SettingsIcon size={14} className="stroke-[2.2]" />
                    </button>
                  )}
                  
                  {/* Modern System Switch Slider Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggle(source.id, isActive)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                      isActive ? "bg-blue-600 dark:bg-blue-500" : "bg-slate-200 dark:bg-slate-800"
                    }`}
                  >
                    <span className={`${isActive ? "translate-x-5" : "translate-x-1"} inline-block h-3 w-3 transform rounded-full bg-white shadow-3xs transition-transform`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Universal Inbound Pipeline Webhook */}
        <div className="border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 rounded-2xl space-y-3 shadow-3xs">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">Universal Ingestion Webhook Endpoint</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5 select-none">
              Route custom endpoints or third-party webhooks to this secure listener to ingest external lead streams into your active CRM queues.
            </p>
          </div>
          <div className="flex gap-2.5">
            <input 
              readOnly 
              value={webhookUrl} 
              className="input-enterprise bg-slate-50/60 dark:bg-slate-950/40 font-mono text-[10px] cursor-text select-all" 
            />
            <button 
              type="button" 
              onClick={copyToClipboard}
              className={`shrink-0 flex items-center gap-1.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border cursor-pointer ${
                copied 
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400" 
                  : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-300 hover:bg-slate-100 active:scale-98"
              }`}
            >
              {copied ? <Check size={12} className="stroke-[2.5]" /> : <Copy size={12} />}
              <span>{copied ? "Copied" : "Copy Endpoint"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Side Column Information Panel */}
      <div className="space-y-4 w-full select-none">
        <div className="border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 rounded-2xl space-y-2 shadow-3xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800 pb-1.5">Proxy Sync Health</p>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            All webhook endpoints stream down into a unified background process cluster. Ensure your inbound parameters map directly to target columns to prevent pipeline drops.
          </p>
        </div>
      </div>

      {/* Configuration Credentials Drawer Modal */}
      {selectedSource && (
        <ConfigModal
          source={selectedSource}
          isOpen={!!selectedSource}
          initialValues={savedConfigs[selectedSource.id] ?? {}}
          onClose={() => setSelectedSource(null)}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
};