// src/pages/Settings.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { apiGet, apiPut } from "../utils/api";
import {
  Save, Upload, Building2, User, X, Image as ImageIcon,
  Settings as SettingsIcon, Eye, EyeOff,
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────────────────────

const INPUT_CLS =
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-gray-50/50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold placeholder:font-normal placeholder:text-gray-400";

const TABS = [
  { id: "company", label: "Company", icon: <Building2 size={14} /> },
  { id: "account", label: "Account", icon: <User size={14} /> },
] as const;

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
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">
        {label}
      </label>
      {children}
    </div>
  );
}

interface PasswordInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
}

function PasswordInput({ value, onChange, placeholder = "••••••••", error }: PasswordInputProps) {
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
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>("company");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [savedLogoUrl, setSavedLogoUrl] = useState("");
  const [newLogoPreview, setNewLogoPreview] = useState("");
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);

  const [company, setCompany] = useState<CompanyForm>({
    name: "", phone: "", email: "", address: "", website: "",
  });

  const [account, setAccount] = useState<AccountForm>({
    fullName: "", email: "",
    currentPassword: "", newPassword: "", confirmPassword: "",
  });

  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet("/api/settings");
      if (data) {
        setCompany({
          name:    data.company_name    ?? "",
          phone:   data.company_phone   ?? "",
          email:   data.company_email   ?? "",
          address: data.company_address ?? "",
          website: data.company_website ?? "",
        });
        setSavedLogoUrl(data.logo_url ?? "");
        setNewLogoPreview("");
        setNewLogoFile(null);
        setAccount((prev) => ({
          ...prev,
          fullName: data.admin_name  ?? "",
          email:    data.admin_email ?? "",
        }));
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // ── Logo handlers ──────────────────────────────────────────────────────────

  const displayLogo = newLogoPreview || savedLogoUrl;

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }
    setNewLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setNewLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setNewLogoPreview("");
    setNewLogoFile(null);
    setSavedLogoUrl("");
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (account.newPassword && account.newPassword !== account.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      setSaving(true);
      const response = await apiPut("/api/settings", {
        company_name:     company.name,
        company_phone:    company.phone,
        company_email:    company.email,
        company_address:  company.address,
        company_website:  company.website,
        logo_url:         newLogoPreview || savedLogoUrl,
        admin_name:       account.fullName,
        admin_email:      account.email,
        new_password:     account.newPassword     || null,
        current_password: account.currentPassword || null,
      });

      if (response) {
        toast.success("Settings saved successfully");
        window.dispatchEvent(new Event("settingsUpdated"));
        setAccount((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));
        await fetchSettings();
      }
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err?.message ?? "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const passwordMismatch =
    !!account.confirmPassword && account.newPassword !== account.confirmPassword;

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Loading Settings…
        </p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="px-3 py-5 sm:px-6 sm:py-8">
      <Toaster position="top-right" />

      <div className="max-w-2xl mx-auto space-y-5">

        {/* ── Header ── */}
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
              <SettingsIcon size={16} className="text-white" />
            </span>
            Settings
          </h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">
            Agency Profile & Security
          </p>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                "flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl",
                activeTab === tab.id
                  ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300",
              ].join(" ")}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════
            COMPANY TAB
        ══════════════════════════════ */}
        {activeTab === "company" && (
          <div className="space-y-4">

            {/* Logo */}
            <SectionCard title="Company Logo">
              <div className="flex items-center gap-4 sm:gap-5">
                {/* Preview */}
                <div className="relative shrink-0">
                  <div className={[
                    "w-20 h-20 rounded-2xl border-2 flex items-center justify-center overflow-hidden transition-all",
                    displayLogo
                      ? "border-blue-200 bg-white dark:bg-gray-800 shadow-md"
                      : "border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800",
                  ].join(" ")}>
                    {displayLogo ? (
                      <img
                        src={displayLogo}
                        alt="Company logo"
                        className="w-full h-full object-contain p-2"
                        onError={() => setSavedLogoUrl("")}
                      />
                    ) : (
                      <ImageIcon size={24} className="text-gray-300" />
                    )}
                  </div>
                  {displayLogo && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      aria-label="Remove logo"
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-md"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>

                {/* Upload controls */}
                <div className="flex-1 space-y-2 min-w-0">
                  <input
                    ref={logoInputRef}
                    id="logo-upload"
                    type="file"
                    accept="image/png, image/jpeg, image/svg+xml, image/webp"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-[10px] font-black uppercase tracking-widest"
                  >
                    <Upload size={13} />
                    {displayLogo ? "Change Logo" : "Upload Logo"}
                  </label>
                  <p className="text-[9px] text-gray-400 font-medium">
                    PNG, JPG, SVG or WebP · Max 2MB
                  </p>
                  {newLogoFile && (
                    <p className="text-[9px] text-emerald-600 font-black uppercase truncate">
                      ✓ {newLogoFile.name}
                    </p>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* Company fields */}
            <SectionCard title="Company Information">
              <Field label="Agency Name">
                <input
                  value={company.name}
                  onChange={(e) => setCompany((p) => ({ ...p, name: e.target.value }))}
                  className={INPUT_CLS}
                  placeholder="e.g. WebGyor Media"
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Phone">
                  <input
                    value={company.phone}
                    onChange={(e) => setCompany((p) => ({ ...p, phone: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="+91 00000 00000"
                    inputMode="tel"
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={company.email}
                    onChange={(e) => setCompany((p) => ({ ...p, email: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="hello@company.com"
                    inputMode="email"
                  />
                </Field>
              </div>

              <Field label="Website">
                <input
                  value={company.website}
                  onChange={(e) => setCompany((p) => ({ ...p, website: e.target.value }))}
                  className={INPUT_CLS}
                  placeholder="https://yoursite.com"
                  inputMode="url"
                />
              </Field>

              <Field label="Address">
                <textarea
                  value={company.address}
                  onChange={(e) => setCompany((p) => ({ ...p, address: e.target.value }))}
                  rows={2}
                  className={`${INPUT_CLS} resize-none`}
                  placeholder="Full office address"
                />
              </Field>
            </SectionCard>
          </div>
        )}

        {/* ══════════════════════════════
            ACCOUNT TAB
        ══════════════════════════════ */}
        {activeTab === "account" && (
          <div className="space-y-4">
            <SectionCard title="Profile">
              <Field label="Full Name">
                <input
                  value={account.fullName}
                  onChange={(e) => setAccount((p) => ({ ...p, fullName: e.target.value }))}
                  className={INPUT_CLS}
                  placeholder="Your full name"
                  autoComplete="name"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={account.email}
                  onChange={(e) => setAccount((p) => ({ ...p, email: e.target.value }))}
                  className={INPUT_CLS}
                  placeholder="you@example.com"
                  inputMode="email"
                  autoComplete="email"
                />
              </Field>
            </SectionCard>

            <SectionCard title="Change Password">
              <Field label="Current Password">
                <PasswordInput
                  value={account.currentPassword}
                  onChange={(v) => setAccount((p) => ({ ...p, currentPassword: v }))}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="New Password">
                  <PasswordInput
                    value={account.newPassword}
                    onChange={(v) => setAccount((p) => ({ ...p, newPassword: v }))}
                  />
                </Field>
                <Field label="Confirm Password">
                  <PasswordInput
                    value={account.confirmPassword}
                    onChange={(v) => setAccount((p) => ({ ...p, confirmPassword: v }))}
                    error={passwordMismatch}
                  />
                </Field>
              </div>

              {passwordMismatch && (
                <p className="text-[10px] text-red-500 font-black uppercase tracking-widest">
                  Passwords do not match
                </p>
              )}
            </SectionCard>
          </div>
        )}

        {/* ── Save button ── */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || passwordMismatch}
          className="w-full sm:w-auto sm:ml-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all active:scale-95"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save size={14} />
              Save Settings
            </>
          )}
        </button>

      </div>
    </div>
  );
}