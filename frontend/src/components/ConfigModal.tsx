import { X, Copy, CheckCircle2, ShieldCheck, HelpCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";

const INPUT_CLS = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-gray-50/50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold";

interface ConfigModalProps {
  source: { id: string; name: string; icon: React.ReactNode };
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: any;
}

export default function ConfigModal({ source, isOpen, onClose, onSave, initialConfig }: ConfigModalProps) {
  const [config, setConfig] = useState(initialConfig || {});

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              {source.icon}
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{source.name}</h2>
              <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Configuration</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Universal Webhook Section (For Meta, Google, Website) */}
          {(['meta', 'google', 'website', 'linkedin'].includes(source.id)) && (
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-emerald-500" />
                Step 1: Your Webhook URL
              </label>
              <div className="flex gap-2">
                <input 
                  readOnly 
                  value={`https://api.webgyor.com/v1/webhook/${source.id}/user_123`} 
                  className={`${INPUT_CLS} bg-gray-100 dark:bg-gray-800/50 font-mono text-[10px] text-gray-500`}
                />
                <button 
                  onClick={() => copyToClipboard(`https://api.webgyor.com/v1/webhook/${source.id}/user_123`)}
                  className="p-3 bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 rounded-xl hover:bg-gray-50"
                >
                  <Copy size={14} className="text-blue-600" />
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Fields based on Source */}
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1.5">
              <HelpCircle size={12} className="text-blue-500" />
              Step 2: Enter Credentials
            </p>

            {source.id === 'meta' && (
              <div className="space-y-1">
                <input 
                  placeholder="Verify Token (e.g. webgyor_secret_123)" 
                  className={INPUT_CLS} 
                  onChange={(e) => setConfig({...config, verifyToken: e.target.value})}
                  value={config.verifyToken || ''}
                />
                <p className="text-[9px] text-gray-400 font-bold px-1 uppercase tracking-tight">Set this same token inside Meta Business Suite</p>
              </div>
            )}

            {source.id === 'whatsapp' && (
              <div className="space-y-3">
                <input placeholder="Phone Number ID" className={INPUT_CLS} />
                <input placeholder="Permanent Access Token" className={INPUT_CLS} />
              </div>
            )}

            {source.id === 'website' && (
              <div className="space-y-1">
                <input 
                    placeholder="API Security Key" 
                    className={INPUT_CLS} 
                    value={config.apiKey || 'WG-AUTOGEN-8822'} 
                    readOnly
                />
                <p className="text-[9px] text-gray-400 font-bold px-1 uppercase tracking-tight">Use this key in your Website Form Header</p>
              </div>
            )}
          </div>

          {/* Verification Badge */}
          <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
            <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
            <p className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold uppercase leading-relaxed">
              Once saved, the system will start listening for {source.name} leads automatically.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(config)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
          >
            Save Config
          </button>
        </div>

      </div>
    </div>
  );
}