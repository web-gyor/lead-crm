import React, { useEffect, useRef } from 'react';
import { RotateCcw, Trash2, X, Loader2 } from 'lucide-react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  isProcessing?: boolean;
  variant: 'cyan' | 'rose';
}

const BaseVaultModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel,
  onConfirm,
  isProcessing = false,
  variant
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, isProcessing]);

  if (!isOpen) return null;

  const themes = {
    cyan: {
      icon: RotateCcw,
      badge: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
      button: "bg-cyan-600 hover:bg-cyan-700 text-white focus:ring-cyan-500/20 shadow-xs"
    },
    rose: {
      icon: Trash2,
      badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 animate-pulse",
      button: "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500/20 shadow-xs"
    }
  };

  const current = themes[variant];

  return (
    <div className="fixed inset-0 p-4 backdrop-blur-xs bg-slate-950/40 flex items-center justify-center animate-in fade-in duration-150 select-none z-[99999]">
      <div className="absolute inset-0" onClick={() => !isProcessing && onClose()} />
      <div
        ref={containerRef}
        tabIndex={-1}
        className="w-full max-w-[360px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xl outline-none transform transition-all animate-in fade-in zoom-in-95 duration-200 text-sm font-normal antialiased relative z-10"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer rounded-lg disabled:opacity-30"
        >
          <X size={14} strokeWidth={2.5} />
        </button>

        <div className="space-y-4 flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${current.badge}`}>
            <current.icon size={18} strokeWidth={2.5} />
          </div>

          <div className="space-y-1">
            <h2 className="text-[11px] font-black tracking-widest text-slate-900 dark:text-white uppercase">
              {title}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed px-1">
              {message}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 h-9 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 disabled:opacity-40 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isProcessing}
              className={`flex-1 h-9 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 disabled:opacity-40 select-none ${current.button}`}
            >
              {isProcessing ? (
                <Loader2 size={12} className="animate-spin text-white" strokeWidth={3} />
              ) : (
                <span>{confirmLabel}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const VaultRestoreModal = React.memo((props: Omit<BaseModalProps, 'variant' | 'confirmLabel'>) => (
  <BaseVaultModal {...props} variant="cyan" confirmLabel="Restore Node" />
));

export const VaultWipeModal = React.memo((props: Omit<BaseModalProps, 'variant' | 'confirmLabel'>) => (
  <BaseVaultModal {...props} variant="rose" confirmLabel="Wipe Record" />
));