import React, { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

interface MarkAllConfirmProps {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MarkAllConfirm({ count, onConfirm, onCancel }: MarkAllConfirmProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onCancel]);

  return (
    <div 
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center border border-gray-100 dark:border-gray-800">
        <div className="mx-auto w-11 h-11 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 size={20} className="text-emerald-600" />
        </div>
        <h3 id="confirm-title" className="text-sm font-bold text-gray-900 dark:text-white mb-1">Mark All Done?</h3>
        <p id="confirm-desc" className="text-xs text-gray-500 dark:text-gray-400 mb-5">
          Clear follow-up dates for {count} lead{count !== 1 ? "s" : ""} in the current view.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}