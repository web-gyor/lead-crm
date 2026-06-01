import React, { useState } from "react";
import { LayoutList, MessageSquare, Mail, Settings2, ExternalLink, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import WhatsAppTemplateModal from "../../../components/WhatsAppTemplateModal";
import SMSTemplateModal from "../../../components/SMSTemplateModal"; 
import EmailTemplateModal from "../../../components/EmailTemplateModal";

// 🎯 SWAPPED: Integrated unified application design toast context hook
import { useToast } from "../../../hooks/useToast";

interface TemplateLibraryProps {
  SectionCard: React.ComponentType<{ title: string; children: React.ReactNode }>;
  inputCls: string;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({ SectionCard, inputCls }) => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [isWATemplateOpen, setIsWATemplateOpen] = useState(false);
  const [isSMSTemplateOpen, setIsSMSTemplateOpen] = useState(false);
  const [isEmailTemplateOpen, setIsEmailTemplateOpen] = useState(false);

  const LibraryRow = ({ icon: Icon, title, subtitle, onClick, color, isLast = false }: any) => (
    <div className={`flex items-center justify-between py-4 ${!isLast ? "border-b border-gray-50 dark:border-gray-800" : ""}`}>
      <div className="flex items-center gap-3 select-none">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm ${color}`}>
          <Icon size={16} strokeWidth={2.5} />
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">{title}</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{subtitle}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-all border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95 cursor-pointer text-[10px] font-black uppercase tracking-wider"
      >
        <Settings2 size={12} className="opacity-70" />
        <span>Manage</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <SectionCard title="Library Asset Management">
        <LibraryRow icon={LayoutList} title="WhatsApp Templates" subtitle="Pre-approved message assets" onClick={() => setIsWATemplateOpen(true)} color="bg-emerald-500" />
        <LibraryRow icon={MessageSquare} title="SMS Library" subtitle="Short message sequences" onClick={() => setIsSMSTemplateOpen(true)} color="bg-blue-400" />
        <LibraryRow icon={Mail} title="Email Library" subtitle="Rich-text layout editor catalog" onClick={() => setIsEmailTemplateOpen(true)} color="bg-purple-500" isLast={true} />

        <div onClick={() => navigate("/communication")} className="mt-4 p-4 border border-blue-100 dark:border-blue-900/20 bg-blue-50/30 dark:bg-blue-900/5 rounded-xl flex items-center justify-between group cursor-pointer hover:border-blue-300 transition-all select-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md"><Zap size={14} /></div>
            <div>
              <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase">Go to Communication Hub</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Review dispatch ratios and delivery timeline histories</p>
            </div>
          </div>
          <ExternalLink size={14} className="text-blue-600 group-hover:translate-x-1 transition-transform" />
        </div>
      </SectionCard>

      <WhatsAppTemplateModal isOpen={isWATemplateOpen} onClose={() => setIsWATemplateOpen(false)} inputCls={inputCls} />
      <SMSTemplateModal isOpen={isSMSTemplateOpen} onClose={() => setIsSMSTemplateOpen(false)} inputCls={inputCls} />
      <EmailTemplateModal isOpen={isEmailTemplateOpen} onClose={() => setIsEmailTemplateOpen(false)} inputCls={inputCls} />
    </div>
  );
};