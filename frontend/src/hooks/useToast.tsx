import { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
interface ToastContextType {
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36).substring(2, 11);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      
      {/* ✅ FIX: Position container 80px down past your sticky tracking header and set z-[99999] */}
      <div className="fixed top-[80px] right-4 space-y-3 z-[99999] pointer-events-none select-none max-w-sm w-full px-4 sm:px-0">
        {toasts.map(toast => {
          // Systematically pair styles and icons matching your CRM styling tokens
          const styleConfig = {
            success: {
              border: "border-l-[4px] border-l-emerald-500",
              icon: <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
            },
            error: {
              border: "border-l-[4px] border-l-rose-500",
              icon: <AlertCircle size={15} className="text-rose-500 shrink-0" />
            },
            info: {
              border: "border-l-[4px] border-l-blue-500",
              icon: <Info size={15} className="text-blue-500 shrink-0" />
            }
          }[toast.type];

          return (
            <div 
              key={toast.id} 
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 shadow-xl rounded-xl text-slate-800 dark:text-slate-100 text-xs font-semibold tracking-tight ${styleConfig.border} transition-all animate-in slide-in-from-right-5 fade-in duration-200`}
            >
              {styleConfig.icon}
              <div className="flex-1 min-w-0 pr-1 leading-normal">
                {toast.message}
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

export const ToastContainer = () => <div />;