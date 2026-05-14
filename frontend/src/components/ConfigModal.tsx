import { useState, useEffect, useRef } from "react";
import {
  Save, Upload, Building2, User, Image as ImageIcon,
  Settings as SettingsIcon, Eye, EyeOff, Link2, Globe,
  MessageSquare, Facebook, Share2, Copy, Check,
  BookOpen, ExternalLink, ChevronRight, Zap, Phone, X,CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import type { IntegrationSource, IntegrationField } from "../pages/Settings";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  source: IntegrationSource;
  isOpen: boolean;
  initialValues?: Record<string, string>;
  onClose: () => void;
  onSave: (configData: Record<string, string>) => Promise<void>;
 
}

// ─── Docs links per source ────────────────────────────────────────────────────

const DOCS: Record<string, string> = {
  meta:      "https://developers.facebook.com/docs/marketing-api/guides/lead-ads/",
  whatsapp:  "https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/",
  google:    "https://support.google.com/google-ads/answer/9423234",
  website:   "https://developers.elementor.com/docs/hooks/form-new-record/",
  linkedin:  "https://learn.microsoft.com/en-us/linkedin/marketing/integrations/lead-gen/",
};

// ─── PasswordField ────────────────────────────────────────────────────────────

function SecretInput({
  field, value, onChange, hasError,
}: {
  field: IntegrationField;
  value: string;
  onChange: (v: string) => void;
  hasError: boolean;
}) {
  const [show, setShow] = useState(false);
  const isSecret = field.type === "password";

  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">
        {field.label}
        {!field.placeholder.toLowerCase().includes("optional") && (
          <span className="text-red-400 ml-0.5">*</span>
        )}
      </label>

      <div className="relative">
        <input
          type={isSecret && !show ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          autoComplete="off"
          spellCheck={false}
          className={`w-full border rounded-xl px-4 py-2.5 text-[13px] bg-gray-50 dark:bg-gray-800 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all
            font-mono placeholder:font-sans placeholder:text-gray-400
            ${hasError ? "border-red-300 dark:border-red-700" : "border-gray-200 dark:border-gray-700"}
            ${isSecret ? "pr-10" : ""}
          `}
        />
        {isSecret && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>

      <p className="text-[10px] text-gray-400 font-medium ml-1">{field.hint}</p>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function ConfigModal({ source, isOpen, initialValues = {}, onClose, onSave}: Props) {
  const [form, setForm]       = useState<Record<string, string>>({});
  const [errors, setErrors]   = useState<Record<string, boolean>>({});
  const [saving, setSaving]   = useState(false);
  const overlayRef            = useRef<HTMLDivElement>(null);
  const firstInputRef         = useRef<HTMLInputElement>(null);

  // Pre-fill form when modal opens or source changes
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, string> = {};
      source.fields.forEach((f) => { initial[f.key] = initialValues[f.key] ?? ""; });
      setForm(initial);
      setErrors({});
      setSaving(false);
    }
  }, [isOpen, source, initialValues]);

  // Focus first input after open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => firstInputRef.current?.focus(), 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // ─── Validate & submit ──────────────────────────────────────────────────

  const handleSave = async () => {
    // Required = fields where placeholder doesn't say "Optional"
    const newErrors: Record<string, boolean> = {};
    let hasError = false;

    source.fields.forEach((f) => {
      const isOptional = f.placeholder.toLowerCase().includes("optional");
      if (!isOptional && !form[f.key]?.trim()) {
        newErrors[f.key] = true;
        hasError = true;
      }
    });

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  // ─── Color from Tailwind class ─────────────────────────────────────────

  const rawColor = source.color.replace("bg-[", "").replace("]", "").replace("bg-", "");
  const iconBg   = rawColor.startsWith("#") ? rawColor : undefined;

  // ─── Render ────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    // Overlay — click outside to close
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cfg-modal-title"
        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
      >

       {/* ── Header ── */}
<div className="flex items-center justify-between p-5 pb-4 border-b border-gray-100 dark:border-gray-800">
  <div className="flex items-center gap-3">
    
    {/* ✅ Social Media Icon (Facebook, WhatsApp, etc.) */}
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
      style={iconBg ? { backgroundColor: iconBg } : { backgroundColor: source.bgColor }}
    >
      {/* We use source.Icon because that is how it is defined in your SOURCES array */}
      <source.Icon size={20} strokeWidth={2.5} />
    </div>
    
    <div>
      <h2 id="cfg-modal-title" className="text-sm font-black text-gray-900 dark:text-white tracking-tight">
        {source.name}
      </h2>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
        {source.description}
      </p>
    </div>
  </div>

  <button
    onClick={onClose}
    className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
    aria-label="Close"
  >
    <X size={16} />
  </button>
</div>

        {/* ── Body ── */}
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">

          {/* Setup steps */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 space-y-2.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Setup steps</p>
            {source.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[9px] font-black mt-0.5">
                  {i + 1}
                </span>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium leading-relaxed">{step}</p>
              </div>
            ))}
          </div>

          {/* Fields */}
          <div className="space-y-4">
            {source.fields.map((field, idx) => (
              <SecretInput
                key={field.key}
                field={field}
                value={form[field.key] ?? ""}
                onChange={(v) => {
                  setForm((p) => ({ ...p, [field.key]: v }));
                  setErrors((p) => ({ ...p, [field.key]: false }));
                }}
                hasError={!!errors[field.key]}
              />
            ))}
          </div>

          {/* Docs link */}
          {DOCS[source.id] && (
            <a
              href={DOCS[source.id]}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              <ExternalLink size={11} />
              View {source.name} documentation
            </a>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all"
          >
            {saving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Activating…
              </>
            ) : (
              <>
                <CheckCircle2 size={13} />
                Activate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}