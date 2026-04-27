import React from 'react';
import { Trash2, X } from 'lucide-react';

interface DeleteModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  title,
  message,
  onClose,
  onConfirm,
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-md pointer-events-auto">
      <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center transform transition-all animate-in fade-in zoom-in duration-200 border border-gray-100 dark:border-gray-800">
        
        {/* Warning Icon */}
        <div className="mx-auto w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-4">
          <Trash2 size={24} className="text-red-600 dark:text-red-400" />
        </div>

        {/* Text Content */}
        <h3 className="text-[13px] font-black uppercase tracking-widest mb-1 text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-6 font-medium leading-relaxed">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-red-600/20"
          >
            {isDeleting ? (
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/30 border-t-white" />
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;