import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface SlideOverFormProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  children: React.ReactNode;
}

export const SlideOverForm: React.FC<SlideOverFormProps> = ({
  isOpen,
  onClose,
  title,
  onSubmit,
  submitting,
  children
}) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none" role="dialog" aria-modal="true">
      <div className="absolute inset-0 overflow-hidden">
        {/* Backdrop overlay */}
        <div 
          className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-3xs transition-opacity animate-in fade-in duration-300" 
          onClick={onClose} 
        />

        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
          <div className="pointer-events-auto w-screen max-w-md transform bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl transition-all duration-300 ease-in-out animate-in slide-in-from-right duration-300 border-l border-slate-100 dark:border-slate-800">
            <form onSubmit={onSubmit} className="flex h-full flex-col divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              
              {/* Header section panel */}
              <div className="px-4 py-5 sm:px-6 surface-secondary">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {title}
                  </h2>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Form Content Area */}
              <div className="h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-5 no-scrollbar">
                {children}
              </div>

              {/* Sticky footer action controls */}
              <div className="flex flex-shrink-0 justify-end gap-3 px-4 py-4 sm:px-6 bg-slate-50/50 dark:bg-slate-950/40">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-slate-600 dark:text-slate-400 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-all cursor-pointer shadow-3xs disabled:opacity-60"
                >
                  {submitting ? "Processing Transaction..." : "Commit Metrics Data"}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
};