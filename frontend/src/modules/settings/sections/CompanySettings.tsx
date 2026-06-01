import React, { useRef, useMemo } from 'react';
import { Upload, ImageIcon, ShieldCheck, User } from 'lucide-react';

interface CompanySettingsProps {
  company: { 
    name: string; 
    phone: string; 
    email: string; 
    address: string; 
    website: string; 
    logo_url: string; 
    agency_contact_name?: string; 
    agency_contact_email?: string;
  };
  account: {
    fullName: string;
    email: string;
  };
  onCompanyChange: (patch: any) => void;
  cleanBaseUrl: string;
}

export const CompanySettings: React.FC<CompanySettingsProps> = ({ 
  company, 
  account, 
  onCompanyChange, 
  cleanBaseUrl
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayLogo = useMemo(() => {
    if (!company?.logo_url) return "/default-logo.png";
    if (company.logo_url.startsWith('blob:') || company.logo_url.startsWith('data:')) {
      return company.logo_url;
    }
    return `${cleanBaseUrl}/${company.logo_url.replace(/^\//, '')}`;
  }, [company?.logo_url, cleanBaseUrl]);

  const handleLogoUploadClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreviewUrl = URL.createObjectURL(file);
    onCompanyChange({
      logo_url: localPreviewUrl,
      logo_file: file
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
        
        {/* Primary Forms Data Inputs Main Column Block */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* SECTION A: Agency Profile Data Inputs Card */}
          <div className="border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 rounded-2xl space-y-4 shadow-3xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800 pb-2 select-none">Agency Profile Specifications</p>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Enterprise Brand Name *</label>
                <input 
                  type="text" 
                  value={company?.name || ""} 
                  onChange={(e) => onCompanyChange({ name: e.target.value })} 
                  className="input-enterprise" 
                  placeholder="WebGyor Media Agency" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Primary Operations Hotline</label>
                  <input 
                    type="text" 
                    value={company?.phone || ""} 
                    onChange={(e) => onCompanyChange({ phone: e.target.value })} 
                    className="input-enterprise font-mono" 
                    placeholder="+91 00000 00000"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Corporate Billing Notification Email</label>
                  <input 
                    type="email" 
                    value={company?.email || ""} 
                    onChange={(e) => onCompanyChange({ email: e.target.value })} 
                    className="input-enterprise" 
                    placeholder="billing@webgyor.com"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Universal Domain Workspace Web Link</label>
                <input 
                  type="url" 
                  value={company?.website || ""} 
                  onChange={(e) => onCompanyChange({ website: e.target.value })} 
                  className="input-enterprise font-mono" 
                  placeholder="https://webgyormedia.com"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Registered Corporate Address</label>
                <textarea 
                  rows={3} 
                  value={company?.address || ""} 
                  onChange={(e) => onCompanyChange({ address: e.target.value })} 
                  className="input-enterprise resize-none leading-relaxed" 
                  placeholder="Agency corporate HQ details..."
                />
              </div>

              {/* Isolated organization public contact values */}
              <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4 space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">Primary Agency Contact Representative</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Representative Full Name</label>
                    <input 
                      type="text" 
                      value={company?.agency_contact_name || ""} 
                      onChange={(e) => onCompanyChange({ agency_contact_name: e.target.value })} 
                      className="input-enterprise" 
                      placeholder="Anand"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Public Representative Email</label>
                    <input 
                      type="email" 
                      value={company?.agency_contact_email || ""} 
                      onChange={(e) => onCompanyChange({ agency_contact_email: e.target.value })} 
                      className="input-enterprise" 
                      placeholder="contact@webgyor.com"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 🎯 REPLACED: Read-Only Authorization Session Track Badge */}
          <div className="border border-slate-200/60 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/20 p-5 rounded-2xl flex items-center justify-between shadow-3xs select-none">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center border border-blue-500/10">
                <User size={18} className="stroke-[2.2]" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Logged in as <span className="text-blue-600 dark:text-blue-400 font-extrabold">{account?.fullName || "Ajithkumar"}</span>
                </p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                  Authorized Session Scope: {account?.email || "admin@webgyor.com"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-wider border border-emerald-500/10">
              <ShieldCheck size={11} className="stroke-[2.5]" /> Super Admin Verified
            </div>
          </div>

        </div>

        {/* Side Column Drawer Assets Info Panels */}
        <div className="space-y-5">
          
          {/* White-Label Branding Asset Card */}
          <div className="border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 rounded-2xl h-fit space-y-4 shadow-3xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">White-Label Branding</p>
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-center select-none group">
              <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden shadow-3xs p-2.5 transition-transform duration-200 group-hover:scale-102">
                {company?.logo_url ? (
                  <img src={displayLogo} alt="Corporate logo footprint" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon size={20} className="text-slate-300" />
                )}
              </div>
              <div className="mt-4 space-y-1">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*" 
                  id="branding-logo-uploader" 
                  className="hidden" 
                  onChange={handleLogoUploadClick}
                />
                <label 
                  htmlFor="branding-logo-uploader" 
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white rounded-lg cursor-pointer text-[10px] font-bold uppercase tracking-wider shadow-3xs transition-all hover:opacity-90 active:scale-98"
                >
                  <Upload size={12} className="stroke-[2.5]" /> Upload Assets
                </label>
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tight pt-1">PNG, SVG layout bounds · Max 2MB File size</p>
              </div>
            </div>
          </div>

          {/* Access Perimeter Side Widget Controls */}
          <div className="border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 rounded-2xl space-y-4 shadow-3xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">Access Perimeter Controls</p>
            <div className="space-y-3.5">
              <div className="flex items-center justify-between select-none">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Two-Factor Authentication (2FA)</p>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Enforces OTP confirmation via mobile handset</p>
                </div>
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-[9px] font-black uppercase tracking-wider shrink-0">Active</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800/60 pt-3 select-none">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Session IP Isolation Lockout</p>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Terminates connection on anomalies</p>
                </div>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-400 dark:bg-slate-950 dark:text-slate-600 rounded text-[9px] font-black uppercase tracking-wider shrink-0">Disabled</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};