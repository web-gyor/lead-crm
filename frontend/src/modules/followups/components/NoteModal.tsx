import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { FollowUpLead } from "../../../types/followup";

interface NoteModalProps {
  lead: FollowUpLead;
  onClose: () => void;
  onSave: (text: string) => void;
}

export function NoteModal({ lead, onClose, onSave }: NoteModalProps) {
  const [text, setText] = useState((lead.counselor_remarks || lead.last_feedback || "").toString().trim());
  const modalRef = useRef<HTMLDivElement>(null);

  // Accessible Focus Management Matrix Latch Loop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div 
      role="dialog" 
      aria-modal="true"
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <div className="p-5">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Call Notes</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close notes modal"
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase mb-4 select-none">{lead.full_name}</p>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter notes about this interaction…"
            rows={4}
            aria-label="Interaction dynamic text remarks content box"
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-blue-400 resize-none transition-all dark:text-white placeholder-gray-400"
          />
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-gray-500 font-bold text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave(text.trim())}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}