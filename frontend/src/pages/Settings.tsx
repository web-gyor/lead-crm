import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Save, Upload, Building2, User, X, Image as ImageIcon, 
  Settings as SettingsIcon, Eye, EyeOff, Link2, Globe, 
  MessageSquare, Facebook, Share2 
} from "lucide-react";
import { apiGet, apiPut } from "../utils/api";
import { toast, Toaster } from "react-hot-toast";
import ConfigModal from "../components/ConfigModal";

// ─── Constants ────────────────────────────────────────────────────────────────

const INPUT_CLS =
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-gray-50/50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold placeholder:font-normal placeholder:text-gray-400";

const TABS = [
  { id: "company", label: "Company", icon: <Building2 size={14} /> },
  { id: "account", label: "Account", icon: <User size={14} /> },
  { id: "integrations", label: "Integrations", icon: <Link2 size={14} /> },
] as const;

interface IntegrationSource {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const SOURCES: IntegrationSource[] = [
  { id: "meta", name: "Meta Lead Ads", icon: <Facebook size={20} />, description: "Capture leads from FB & Instagram", color: "bg-blue-600" },
  { id: "whatsapp", name: "WhatsApp Business", icon: <MessageSquare size={20} />, description: "Direct chat lead generation", color: "bg-emerald-500" },
  { id: "google", name: "Google Ads Form", icon: <Globe size={20} />, description: "Search and Display lead forms", color: "bg-red-500" },
  { id: "website", name: "Website Form", icon: <Globe size={20} />, description: "Elementor & Custom Webhooks", color: "bg-indigo-500" },
  { id: "linkedin", name: "LinkedIn Ads", icon: <Share2 size={20} />, description: "B2B Professional Lead Gen", color: "bg-blue-700" },
];

type TabId = (typeof TABS)[number]["id"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanyForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  website: string;
}

interface AccountForm {
  fullName: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function PasswordInput({ value, onChange, placeholder = "••••••••", error }: { value: string; onChange: (v: string) => void; placeholder?: string; error?: boolean }) {
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
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

function IntegrationCard({ source, isActive, onToggle, onEdit }: { 
  source: IntegrationSource; 
  isActive: boolean; 
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm flex items-center justify-between group">
      <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 ${source.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
          {source.icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">{source.name}</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase truncate">{source.description}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
        {isActive && (
          <button onClick={onEdit} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
            <SettingsIcon size={16} />
          </button>
        )}
        <button
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            isActive ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
          }`}
        >
          <span className={`${isActive ? "translate-x-6" : "translate-x-1"} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>("company");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [savedLogoUrl, setSavedLogoUrl] = useState("");
  const [newLogoPreview, setNewLogoPreview] = useState("");
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);

  const [company, setCompany] = useState<CompanyForm>({ name: "", phone: "", email: "", address: "", website: "" });
  const [account, setAccount] = useState<AccountForm>({ fullName: "", email: "", currentPassword: "", newPassword: "", confirmPassword: "" });

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<any>(null);

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
          website: data.company_website ?? "",
        });
        setSavedLogoUrl(data.logo_url ?? "");
        setAccount((prev) => ({
          ...prev,
          fullName: data.admin_name ?? "",
          email: data.admin_email ?? "",
        }));
      }
    } catch (err) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  useEffect(() => {
    const loadIntegrations = async () => {
      try {
        const res = await apiGet("/api/integrations");
        if (res?.data) {
          setActiveSources(res.data.filter((i: any) => i.is_active).map((i: any) => i.source_key));
        }
      } catch (err) { console.error(err); }
    };
    loadIntegrations();
  }, []);

  const handleToggleIntegration = async (sourceId: string, currentlyActive: boolean) => {
    if (!currentlyActive) {
      const source = SOURCES.find(s => s.id === sourceId);
      setSelectedSource(source);
    } else {
      try {
        await apiPut("/api/integrations/toggle", { source_key: sourceId, is_active: false, config_data: {} });
        setActiveSources(prev => prev.filter(id => id !== sourceId));
        toast.success("Integration Deactivated");
      } catch (err) { toast.error("Update failed"); }
    }
  };

  const handleEditConfig = (sourceId: string) => {
    const source = SOURCES.find(s => s.id === sourceId);
    setSelectedSource(source);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 2 * 1024 * 1024) {
      toast.error(file ? "Logo must be under 2MB" : "");
      return;
    }
    setNewLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setNewLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

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
      });
      if (response) {
        toast.success("Settings saved successfully");
        setAccount(p => ({ ...p, currentPassword: "", newPassword: "", confirmPassword: "" }));
        fetchSettings();
      }
    } catch (err: any) { toast.error(err?.message ?? "Save failed"); } finally { setSaving(false); }
  };

  const displayLogo = newLogoPreview || savedLogoUrl;
  const passwordMismatch = !!account.confirmPassword && account.newPassword !== account.confirmPassword;

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
            <span className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg"><SettingsIcon size={16} className="text-white" /></span>
            Settings
          </h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Agency Profile & Security</p>
        </div>

        {/* Tabs */}
        <div className="w-full overflow-x-auto no-scrollbar pb-1">
          <div className="flex gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-max sm:w-fit min-w-full">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center justify-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase transition-all rounded-xl flex-1 sm:flex-none ${activeTab === tab.id ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm" : "text-gray-500"}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-5">
          {activeTab === "company" && (
            <div className="space-y-4">
              <SectionCard title="Company Logo">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl border-2 flex items-center justify-center overflow-hidden border-blue-200 bg-white dark:bg-gray-800 shadow-md">
                    {displayLogo ? <img src={displayLogo} alt="Logo" className="w-full h-full object-contain p-2" /> : <ImageIcon size={24} className="text-gray-300" />}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" id="logo-up" />
                    <label htmlFor="logo-up" className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl cursor-pointer text-[10px] font-black uppercase tracking-widest"><Upload size={13} /> Change</label>
                    <p className="text-[9px] text-gray-400 uppercase font-black">PNG, JPG or SVG · Max 2MB</p>
                  </div>
                </div>
              </SectionCard>
              <SectionCard title="Company Information">
                <Field label="Agency Name"><input value={company.name} onChange={(e) => setCompany(p => ({ ...p, name: e.target.value }))} className={INPUT_CLS} /></Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Phone"><input value={company.phone} onChange={(e) => setCompany(p => ({ ...p, phone: e.target.value }))} className={INPUT_CLS} /></Field>
                  <Field label="Email"><input value={company.email} onChange={(e) => setCompany(p => ({ ...p, email: e.target.value }))} className={INPUT_CLS} /></Field>
                </div>
                <Field label="Website"><input value={company.website} onChange={(e) => setCompany(p => ({ ...p, website: e.target.value }))} className={INPUT_CLS} /></Field>
                <Field label="Address"><textarea value={company.address} onChange={(e) => setCompany(p => ({ ...p, address: e.target.value }))} rows={2} className={`${INPUT_CLS} resize-none`} /></Field>
              </SectionCard>
            </div>
          )}

          {activeTab === "account" && (
            <div className="space-y-4">
              <SectionCard title="Profile">
                <Field label="Full Name"><input value={account.fullName} onChange={(e) => setAccount(p => ({ ...p, fullName: e.target.value }))} className={INPUT_CLS} /></Field>
                <Field label="Email"><input value={account.email} onChange={(e) => setAccount(p => ({ ...p, email: e.target.value }))} className={INPUT_CLS} /></Field>
              </SectionCard>
              <SectionCard title="Change Password">
                <Field label="Current Password"><PasswordInput value={account.currentPassword} onChange={(v) => setAccount(p => ({ ...p, currentPassword: v }))} /></Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="New Password"><PasswordInput value={account.newPassword} onChange={(v) => setAccount(p => ({ ...p, newPassword: v }))} /></Field>
                  <Field label="Confirm Password"><PasswordInput value={account.confirmPassword} onChange={(v) => setAccount(p => ({ ...p, confirmPassword: v }))} error={passwordMismatch} /></Field>
                </div>
              </SectionCard>
            </div>
          )}

          {activeTab === "integrations" && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Lead Capture Status</p>
                <p className="text-xs text-blue-700/70 dark:text-blue-400/70 font-medium">Toggle your lead sources on to sync in real-time.</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {SOURCES.map((source) => (
                  <IntegrationCard
                    key={source.id}
                    source={source}
                    isActive={activeSources.includes(source.id)}
                    onToggle={() => handleToggleIntegration(source.id, activeSources.includes(source.id))}
                    onEdit={() => handleEditConfig(source.id)}
                  />
                ))}
              </div>
              <SectionCard title="Universal Webhook">
                <div className="flex gap-2">
                  <input readOnly value={`https://api.webgyor.com/v1/webhook/${account.fullName.toLowerCase().replace(/\s+/g, '-')}`} className={`${INPUT_CLS} bg-gray-100 dark:bg-gray-800/50 font-mono text-[10px]`} />
                  <button onClick={() => { navigator.clipboard.writeText(`https://api.webgyor.com/v1/webhook/${account.fullName.toLowerCase().replace(/\s+/g, '-')}`); toast.success("Copied"); }} className="px-6 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl text-[10px] font-black uppercase">Copy</button>
                </div>
              </SectionCard>
            </div>
          )}
        </div>

        {(activeTab === "company" || activeTab === "account") && (
          <div className="pt-4 flex justify-end">
            <button onClick={handleSave} disabled={saving || passwordMismatch} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
              {saving ? "Saving…" : <><Save size={14} /> Save Settings</>}
            </button>
          </div>
        )}
      </div>

      {selectedSource && (
        <ConfigModal 
          source={selectedSource}
          isOpen={!!selectedSource}
          onClose={() => setSelectedSource(null)}
          onSave={async (configData: any) => {
            try {
              await apiPut("/api/integrations/toggle", { source_key: selectedSource.id, is_active: true, config_data: configData });
              setActiveSources(prev => [...new Set([...prev, selectedSource.id])]);
              setSelectedSource(null);
              toast.success(`${selectedSource.name} Activated!`);
            } catch (err) { toast.error("Save failed"); }
          }}
        />
      )}
    </div>
  );
}