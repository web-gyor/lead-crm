import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X, AlertTriangle, Info, ShieldAlert, Loader2 } from 'lucide-react';

// ─── TYPES & INTERFACES ───────────────────────────────────────────────────────

export type ModalVariant = 'danger' | 'warning' | 'info';
export type ModalSize = 'sm' | 'md' | 'lg';

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  closeOnOutsideClick?: boolean;
  size?: ModalSize;
  children: React.ReactNode;
}

interface ActionModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ModalVariant;
  size?: ModalSize;
}

// ─── COMPOSABLE MODAL SHELL (PORTAL + ACCESSIBILITY FOCUS TRAP) ───────────────

export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  closeOnOutsideClick = true,
  size = 'sm',
  children
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Esc key close tracking hooks
  useEffect(() => {
    if (!isOpen) return;
    previousFocus.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      
      // Strict Focus Tabbing Trap Management
      if (e.key === 'Tab' && containerRef.current) {
        const focusables = containerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            lastEl.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastEl) {
            firstEl.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Smooth container focus allocation override
    setTimeout(() => containerRef.current?.focus(), 50);

    // Lock global background overlay container document layer scrolling arrays
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousFocus.current?.focus();
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (closeOnOutsideClick && e.target === overlayRef.current) {
      onClose();
    }
  }, [closeOnOutsideClick, onClose]);

  if (!isOpen) return null;

  const sizeClasses: Record<ModalSize, string> = {
    sm: 'max-w-[360px]',
    md: 'max-w-md',
    lg: 'max-w-lg'
  };

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-slate-950/40 dark:bg-black/60 z-[99999] p-4 backdrop-blur-xs flex items-center justify-center pointer-events-auto select-none transition-all animate-in fade-in duration-150 ease-out"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className={`w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-slate-950/10 dark:shadow-black/40 outline-none transform transition-all animate-in fade-in zoom-in-95 duration-200 ease-out text-sm font-normal antialiased ${sizeClasses[size]}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

// ─── PREMIUM CRM ENTERPRISE REUSABLE ACTION FOOTER ───────────────────────────

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
  disabled?: boolean;
  variant?: ModalVariant;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({ title, onClose, disabled, variant = 'danger' }) => {
  const iconConfigs = {
    danger: { component: Trash2, ring: 'animate-pulse bg-rose-500/10 text-rose-600 dark:text-rose-400' },
    warning: { component: AlertTriangle, ring: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    info: { component: Info, ring: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' }
  };

  const Config = iconConfigs[variant];

  return (
    <div className="flex flex-col items-center text-center space-y-3.5 relative w-full">
      {/* Absolute micro boundary close escape click button anchor node */}
      <button
        type="button"
        onClick={onClose}
        disabled={disabled}
        className="absolute -top-1 -right-1 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors cursor-pointer disabled:opacity-30"
        aria-label="Close modal payload window context"
      >
        <X size={14} strokeWidth={2.5} />
      </button>

      {/* Layered circular icon background array framework indicator */}
      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-105 ${Config.ring}`}>
        <Config.component size={18} strokeWidth={2.5} />
      </div>

      <div className="space-y-1 w-full px-2">
        {/* Uppercase ultra-bold heading system execution signature */}
        <h2 className="text-[11px] font-black tracking-widest text-slate-900 dark:text-white uppercase leading-none">
          {title}
        </h2>
      </div>
    </div>
  );
};

// ─── PREMIUM ENTERPRISE ACTION FOOTER DECK BUTTON CONTAINER ─────────────────

interface ModalFooterProps {
  onClose: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
  confirmLabel: string;
  cancelLabel: string;
  variant: ModalVariant;
}

const ModalFooter: React.FC<ModalFooterProps> = ({
  onClose,
  onConfirm,
  isProcessing,
  confirmLabel,
  cancelLabel,
  variant
}) => {
  const variantClasses = {
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus:ring-rose-500/20 active:scale-98',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs focus:ring-amber-500/20 active:scale-98',
    info: 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs focus:ring-blue-500/20 active:scale-98'
  };

  return (
    <div className="flex items-center gap-2 w-full pt-1">
      <button
        type="button"
        onClick={onClose}
        disabled={isProcessing}
        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-40"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={isProcessing}
        className={`flex-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 disabled:opacity-40 select-none ${variantClasses[variant]}`}
      >
        {isProcessing ? (
          <Loader2 size={12} className="animate-spin text-white" strokeWidth={3} />
        ) : (
          <span>{confirmLabel}</span>
        )}
      </button>
    </div>
  );
};

// ─── CORE SYSTEM DESTRUCTIVE CONFIRMATION CONTEXT MODAL ───────────────────────

export const DeleteModal: React.FC<ActionModalProps> = ({
  isOpen,
  title,
  message,
  onClose,
  onConfirm,
  isProcessing = false,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  variant = 'danger',
  size = 'sm'
}) => {
  return (
    <ModalShell isOpen={isOpen} onClose={onClose} size={size}>
      <div className="space-y-4">
        {/* Reusable Header Area */}
        <ModalHeader title={title} onClose={onClose} disabled={isProcessing} variant={variant} />
        
        {/* Soft centered messaging typography payload block */}
        <div className="px-1 text-center select-text">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            {message}
          </p>
        </div>

        {/* Action Button Controls Deck Footer Area */}
        <ModalFooter
          onClose={onClose}
          onConfirm={onConfirm}
          isProcessing={isProcessing}
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
          variant={variant}
        />
      </div>
    </ModalShell>
  );
};

export default DeleteModal;