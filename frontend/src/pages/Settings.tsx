import { useState, useEffect, useCallback, useRef } from "react";
import {
  Save, Upload, Building2, User, Image as ImageIcon,
  Settings as SettingsIcon, Eye, EyeOff, Link2, Globe,
  MessageSquare, Facebook, Share2, Copy, Check,
  BookOpen, ExternalLink, ChevronRight, Zap, Phone,
  type LucideIcon,
} from "lucide-react";
import { apiGet, apiPut } from "../utils/api";
import { toast, Toaster } from "react-hot-toast";
import ConfigModal from "../components/ConfigModal";
import CommunicationsTab from "../components/CommunicationsTab";
// ─── Constants ────────────────────────────────────────────────────────────────

const INPUT_CLS =
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-gray-50/50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold placeholder:font-normal placeholder:text-gray-400";

const TABS = [
  { id: "company",      label: "Company",      Icon: Building2 },
  { id: "account",      label: "Account",      Icon: User      },
  { id: "integrations", label: "Integrations", Icon: Link2     },
   { id: "docs",         label: "Docs",         Icon: BookOpen  },
  { id: "communications", label: "Comm",       Icon: Phone     },
 
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Integration Sources ──────────────────────────────────────────────────────

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
  Icon: LucideIcon;      // ✅ component ref, not JSX
  bgColor: string;
  ringColor: string;
  description: string;
  color: string;         // kept for ConfigModal compat
  steps: string[];
  fields: IntegrationField[];
}

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

// Doc metadata (extends SOURCES with doc-specific fields)
const DOC_META: Record<string, { docUrl: string; docLabel: string; tags: string[] }> = {
  meta:      { docUrl: "https://developers.facebook.com/docs/marketing-api/guides/lead-ads/",           docLabel: "View Meta Lead Ads documentation",      tags: ["Facebook", "Instagram", "Lead Forms", "Marketing API"] },
  whatsapp:  { docUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/",             docLabel: "View WhatsApp Business documentation",   tags: ["WhatsApp", "Cloud API", "Webhooks", "Messaging"] },
  google:    { docUrl: "https://support.google.com/google-ads/answer/9423234",                          docLabel: "View Google Ads Form documentation",     tags: ["Google Ads", "Lead Forms", "Search", "Display"] },
  website:   { docUrl: "https://developers.elementor.com/docs/hooks/form-new-record/",                  docLabel: "View Website Form documentation",        tags: ["Elementor", "WordPress", "Webhook", "Custom Forms"] },
  linkedin:  { docUrl: "https://learn.microsoft.com/en-us/linkedin/marketing/integrations/lead-gen/",  docLabel: "View LinkedIn Lead Gen documentation",   tags: ["LinkedIn", "B2B", "Marketing API", "Lead Gen Forms"] },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanyForm {
  name: string; phone: string; email: string; address: string; website: string;
}

interface AccountForm {
  fullName: string; email: string;
  currentPassword: string; newPassword: string; confirmPassword: string;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">{label}</label>
      {children}
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder = "••••••••", error }: {
  value: string; onChange: (v: string) => void; placeholder?: string; error?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${INPUT_CLS} pr-11 ${error ? "border-red-300 focus:border-red-400" : ""}`}
      />
      <button type="button" onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

// ─── Integration Card ─────────────────────────────────────────────────────────

function IntegrationCard({ source, isActive, onToggle, onConfigure }: {
  source: IntegrationSource; isActive: boolean; onToggle: () => void; onConfigure: () => void;
}) {
  const { Icon } = source;
  return (
    <div className={`bg-white dark:bg-gray-900 border rounded-2xl p-4 shadow-sm flex items-center justify-between transition-all ${
      isActive ? "border-blue-200 dark:border-blue-800" : "border-gray-100 dark:border-gray-800"
    }`}>
      <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
        <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl flex items-center justify-center text-white shadow-md"
          style={{ backgroundColor: source.bgColor }}>
          <Icon size={18} strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">{source.name}</h3>
            {isActive && (
              <span className="shrink-0 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase rounded-full tracking-widest">
                Live
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase truncate">{source.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
        {isActive && (
          <button onClick={onConfigure}
            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
            title="Configure">
            <SettingsIcon size={15} />
          </button>
        )}
        <button
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            isActive ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
          }`}
          aria-label={`${isActive ? "Disable" : "Enable"} ${source.name}`}
        >
          <span className={`${isActive ? "translate-x-6" : "translate-x-1"} inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm`} />
        </button>
      </div>
    </div>
  );
}

// ─── Webhook Box ──────────────────────────────────────────────────────────────

function WebhookBox({ projectSlug }: { projectSlug: string }) {
  const [copied, setCopied] = useState(false);
  const url = `http://127.0.0.1:4000/api/leads/capture?project_id=${projectSlug || "my-agency"}`;
  const copy = () => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  return (
    <SectionCard title="Universal Webhook">
      <p className="text-[10px] text-gray-400 font-semibold -mt-2">Point any integration to this URL to funnel leads into your pipeline.</p>
      <div className="flex gap-2">
        <input readOnly value={url} className={`${INPUT_CLS} bg-gray-100 dark:bg-gray-800/50 font-mono text-[10px] cursor-text`} />
        <button onClick={copy}
          className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            copied ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                   : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}>
          {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
        </button>
      </div>
    </SectionCard>
  );
}

// ─── Doc Card (used in Docs tab) ──────────────────────────────────────────────

function DocCard({ source, isExpanded, onToggle }: {
  source: IntegrationSource; isExpanded: boolean; onToggle: () => void;
}) {
  const { Icon } = source;
  const meta = DOC_META[source.id];

  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden transition-all duration-200"
      style={{ border: isExpanded ? `1px solid ${source.ringColor}` : "1px solid rgba(0,0,0,0.07)" }}
    >
      {/* Header */}
      <button onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 sm:p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
        <div className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-white shadow-md"
          style={{ backgroundColor: source.bgColor }}>
          <Icon size={20} strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{source.name}</p>
          <p className="text-[11px] text-gray-400 font-medium leading-snug mt-0.5 line-clamp-1">{source.description}</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          {meta.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              {tag}
            </span>
          ))}
        </div>
        <ChevronRight size={16} className={`shrink-0 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
      </button>

      {/* Expanded */}
      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 sm:px-5 py-5 space-y-5">
          <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed">{source.description}</p>

          {/* All tags */}
          <div className="flex flex-wrap gap-1.5">
            {meta.tags.map((tag) => (
              <span key={tag}
                className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border"
                style={{ borderColor: source.ringColor, color: source.bgColor }}>
                {tag}
              </span>
            ))}
          </div>

          {/* Steps */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Quick setup</p>
            {source.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full text-white flex items-center justify-center text-[9px] font-black mt-0.5"
                  style={{ backgroundColor: source.bgColor }}>
                  {i + 1}
                </span>
                <p className="text-[12px] text-gray-600 dark:text-gray-400 font-medium leading-relaxed">{step}</p>
              </div>
            ))}
          </div>

          {/* Doc link button */}
          <a href={meta.docUrl} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-white transition-opacity hover:opacity-90 active:scale-95"
            style={{ backgroundColor: source.bgColor }}>
            <BookOpen size={13} />
            {meta.docLabel}
            <ExternalLink size={11} className="opacity-70" />
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Docs Tab ─────────────────────────────────────────────────────────────────

function DocsTab() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const toggle = (id: string) => setExpanded((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 flex gap-3 items-start">
        <Zap size={14} className="text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-0.5">How to use this page</p>
          <p className="text-[12px] text-blue-700/70 dark:text-blue-400/70 font-medium leading-relaxed">
            Expand any integration to see its setup steps and open the official documentation.
            Configure credentials in <span className="font-black">Integrations</span> tab.
          </p>
        </div>
      </div>

      {/* Doc cards — one per source, reusing SOURCES data */}
      <div className="space-y-3">
        {SOURCES.map((source) => (
          <DocCard
            key={source.id}
            source={source}
            isExpanded={expanded === source.id}
            onToggle={() => toggle(source.id)}
          />
        ))}
      </div>

      <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-2">
        All integrations send leads to your universal webhook endpoint
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>("company");
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  const [savedLogoUrl, setSavedLogoUrl]     = useState("");
  const [newLogoPreview, setNewLogoPreview] = useState("");
  const [newLogoFile, setNewLogoFile]       = useState<File | null>(null);

  const [company, setCompany] = useState<CompanyForm>({ name: "", phone: "", email: "", address: "", website: "" });
  const [account, setAccount] = useState<AccountForm>({ fullName: "", email: "", currentPassword: "", newPassword: "", confirmPassword: "" });

  const logoInputRef = useRef<HTMLInputElement>(null);

  const [activeSources, setActiveSources]   = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<IntegrationSource | null>(null);
  const [savedConfigs, setSavedConfigs]     = useState<Record<string, Record<string, string>>>({});


  const [commSettings, setCommSettings] = useState({
    is_call_recording_enabled: false,
    is_sms_template_enabled: false,       // added for the new UI
    is_whatsapp_automation_enabled: false, // added for the new UI
    is_email_trigger_enabled: false,      // added for the new UI
    telephony_provider: "none"
  });

  // ─── Fetch ──────────────────────────────────────────────────────────────────

 const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet("/api/settings");
      if (data) {
        setCompany({ 
            name: data.company_name ?? "", 
            phone: data.company_phone ?? "", 
            email: data.company_email ?? "", 
            address: data.company_address ?? "", 
            website: data.company_website ?? "" 
        });
        setSavedLogoUrl(data.logo_url ?? "");
        setAccount((prev) => ({ ...prev, fullName: data.admin_name ?? "", email: data.admin_email ?? "" }));

        // PLACE THIS HERE
        setCommSettings({
          is_call_recording_enabled: !!data.is_call_recording_enabled,
          is_sms_template_enabled: false, 
          is_whatsapp_automation_enabled: false,
          is_email_trigger_enabled: false,
          telephony_provider: data.telephony_provider ?? "none"
        });
      }
    } catch { toast.error("Failed to load settings"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet("/api/integrations");
        if (res?.data) {
          const active: string[] = [];
          const configs: Record<string, Record<string, string>> = {};
          res.data.forEach((i: any) => {
            if (i.is_active) active.push(i.source_key);
            if (i.config_data) configs[i.source_key] = i.config_data;
          });
          setActiveSources(active);
          setSavedConfigs(configs);
        }
      } catch (err) { console.error(err); }
    })();
  }, []);

  // ─── Integration handlers ────────────────────────────────────────────────

  const handleToggle = (sourceId: string, currentlyActive: boolean) => {
    if (currentlyActive) {
      apiPut("/api/integrations/toggle", { source_key: sourceId, is_active: false, config_data: {} })
        .then(() => { setActiveSources((prev) => prev.filter((id) => id !== sourceId)); toast.success("Integration deactivated"); })
        .catch(() => toast.error("Update failed"));
    } else {
      setSelectedSource(SOURCES.find((s) => s.id === sourceId) ?? null);
    }
  };

  const handleConfigure = (sourceId: string) => setSelectedSource(SOURCES.find((s) => s.id === sourceId) ?? null);

  const handleModalSave = async (configData: Record<string, string>) => {
    if (!selectedSource) return;
    try {
      await apiPut("/api/integrations/toggle", { source_key: selectedSource.id, is_active: true, config_data: configData });
      setActiveSources((prev) => [...new Set([...prev, selectedSource.id])]);
      setSavedConfigs((prev) => ({ ...prev, [selectedSource.id]: configData }));
      setSelectedSource(null);
      toast.success(`${selectedSource.name} activated!`);
    } catch { toast.error("Save failed — check your credentials and try again"); }
  };

  // ─── Logo ───────────────────────────────────────────────────────────────

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2 MB"); return; }
    setNewLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setNewLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ─── Save ───────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (account.newPassword && account.newPassword !== account.confirmPassword) { 
        toast.error("New passwords do not match"); 
        return; 
    }
    try {
      setSaving(true);
      const response = await apiPut("/api/settings", {
        ...company, 
        logo_url: newLogoPreview || savedLogoUrl,
        admin_name: account.fullName, 
        admin_email: account.email,
        new_password: account.newPassword || null, 
        current_password: account.currentPassword || null,
        
        // PLACE THESE HERE
        is_call_recording_enabled: commSettings.is_call_recording_enabled,
        telephony_provider: commSettings.telephony_provider,
      });

      if (response) {
        toast.success("Settings saved successfully");
        setAccount((p) => ({ ...p, currentPassword: "", newPassword: "", confirmPassword: "" }));
        setNewLogoFile(null);
        fetchSettings();
      }
    } catch (err: any) { toast.error(err?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };
  const displayLogo      = newLogoPreview || savedLogoUrl;
  const passwordMismatch = !!account.confirmPassword && account.newPassword !== account.confirmPassword;
  const projectSlug      = account.fullName.toLowerCase().replace(/\s+/g, "-");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading Settings…</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-8">
      <Toaster position="top-right" />
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
            <span className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <SettingsIcon size={16} className="text-white" />
            </span>
            Settings
          </h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Agency Profile & Security</p>
        </div>

        {/* Tabs — now 4 tabs */}
        <div className="w-full overflow-x-auto no-scrollbar pb-1">
          <div className="flex gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-max sm:w-fit min-w-full">
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase transition-all rounded-xl flex-1 sm:flex-none ${
                  activeTab === id ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-5">

          {/* ── Company ── */}
          {activeTab === "company" && (
            <div className="space-y-4">
              <SectionCard title="Company Logo">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl border-2 flex items-center justify-center overflow-hidden border-blue-100 bg-white dark:bg-gray-800 shadow-md">
                    {displayLogo ? <img src={displayLogo} alt="Company logo" className="w-full h-full object-contain p-2" /> : <ImageIcon size={24} className="text-gray-300" />}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" id="logo-up" />
                    <label htmlFor="logo-up" className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl cursor-pointer text-[10px] font-black uppercase tracking-widest">
                      <Upload size={13} /> Change Logo
                    </label>
                    <p className="text-[9px] text-gray-400 uppercase font-black">PNG, JPG or SVG · Max 2 MB</p>
                  </div>
                </div>
              </SectionCard>
              <SectionCard title="Company Information">
                <Field label="Agency Name"><input value={company.name} onChange={(e) => setCompany((p) => ({ ...p, name: e.target.value }))} className={INPUT_CLS} /></Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Phone"><input value={company.phone} onChange={(e) => setCompany((p) => ({ ...p, phone: e.target.value }))} className={INPUT_CLS} /></Field>
                  <Field label="Email"><input value={company.email} onChange={(e) => setCompany((p) => ({ ...p, email: e.target.value }))} className={INPUT_CLS} /></Field>
                </div>
                <Field label="Website"><input value={company.website} onChange={(e) => setCompany((p) => ({ ...p, website: e.target.value }))} className={INPUT_CLS} /></Field>
                <Field label="Address"><textarea value={company.address} onChange={(e) => setCompany((p) => ({ ...p, address: e.target.value }))} rows={2} className={`${INPUT_CLS} resize-none`} /></Field>
              </SectionCard>
            </div>
          )}

          {/* ── Account ── */}
          {activeTab === "account" && (
            <div className="space-y-4">
              <SectionCard title="Profile">
                <Field label="Full Name"><input value={account.fullName} onChange={(e) => setAccount((p) => ({ ...p, fullName: e.target.value }))} className={INPUT_CLS} /></Field>
                <Field label="Email"><input value={account.email} onChange={(e) => setAccount((p) => ({ ...p, email: e.target.value }))} className={INPUT_CLS} /></Field>
              </SectionCard>
              <SectionCard title="Change Password">
                <Field label="Current Password"><PasswordInput value={account.currentPassword} onChange={(v) => setAccount((p) => ({ ...p, currentPassword: v }))} /></Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="New Password"><PasswordInput value={account.newPassword} onChange={(v) => setAccount((p) => ({ ...p, newPassword: v }))} /></Field>
                  <Field label="Confirm Password"><PasswordInput value={account.confirmPassword} onChange={(v) => setAccount((p) => ({ ...p, confirmPassword: v }))} error={passwordMismatch} /></Field>
                </div>
                {passwordMismatch && <p className="text-[10px] text-red-500 font-semibold">Passwords do not match</p>}
              </SectionCard>
            </div>
          )}

       {/* ── Integrations ── */}
          {activeTab === "integrations" && (
            <div className="space-y-5">
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Lead Capture Status</p>
                <p className="text-xs text-blue-700/70 dark:text-blue-400/70 font-medium">
                  Toggle a source to connect it. Use <SettingsIcon size={11} className="inline -mt-0.5" /> to update credentials anytime.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {SOURCES.map((source) => (
                  <IntegrationCard key={source.id} source={source}
                    isActive={activeSources.includes(source.id)}
                    onToggle={() => handleToggle(source.id, activeSources.includes(source.id))}
                    onConfigure={() => handleConfigure(source.id)}
                  />
                ))}
              </div>
              <WebhookBox projectSlug={projectSlug} />
            </div>
          )}

          {/* ── Communications ── MOVED INSIDE THE MAIN DIV */}
          {activeTab === "communications" && (
            <CommunicationsTab 
              settings={commSettings}
              setSettings={setCommSettings}
              SectionCard={SectionCard}
              Field={Field}
              inputCls={INPUT_CLS}
            />
          )}

          {/* ── Docs tab ── */}
          {activeTab === "docs" && <DocsTab />}
        </div>

        {/* Updated Save button condition to include Communications */}
        {(activeTab === "company" || activeTab === "account" || activeTab === "communications") && (
          <div className="pt-4 flex justify-end">
            <button onClick={handleSave} disabled={saving || passwordMismatch}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
              {saving ? "Saving…" : <><Save size={14} /> Save Settings</>}
            </button>
          </div>
        )}
      </div>

      {/* Config Modal stays at the bottom */}
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
}