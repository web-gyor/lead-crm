// src/components/leads/PaginationFooter.tsx
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationFooterProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  rowsPerPage: number;
  setRowsPerPage: (n: number) => void;
  setCurrentPage: (fn: (p: number) => number) => void;
  label?: string;   // e.g. "Queue", "Results", "Leads"
  mobile?: boolean;
}

export default function PaginationFooter({
  currentPage, totalPages, totalCount,
  rowsPerPage, setRowsPerPage, setCurrentPage,
  label = "Results", mobile = false
}: PaginationFooterProps) {
  return (
    <div className={`px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 flex-wrap ${mobile ? 'rounded-xl border mt-1' : ''}`}>
      <div className="flex items-center gap-2">
        <select
          value={rowsPerPage}
          onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(() => 1); }}
          className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-[11px] font-bold outline-none"
        >
          {[15, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest hidden sm:inline">per page</span>
      </div>

      <div className="text-[11px] font-black uppercase text-gray-500">
        {label}:{' '}
        <span className="text-blue-600 mx-1">
          {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, totalCount || 0)}
        </span>
        of <span className="text-gray-900 dark:text-white">{totalCount || 0}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
          className={`w-8 h-8 flex items-center justify-center rounded-full border-2 transition-all ${
            currentPage === 1
              ? 'border-gray-100 text-gray-200 cursor-not-allowed'
              : 'border-gray-900 text-gray-900 hover:border-red-600 hover:text-red-600 dark:text-white active:scale-90'
          }`}
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>
        <span className="text-xs font-black bg-gray-900 text-white w-8 h-8 flex items-center justify-center rounded-full shadow-md ring-2 ring-white dark:ring-gray-800">
          {currentPage}
        </span>
        <button
          disabled={currentPage >= totalPages}
          onClick={() => setCurrentPage(p => p + 1)}
          className={`w-8 h-8 flex items-center justify-center rounded-full border-2 transition-all ${
            currentPage >= totalPages
              ? 'border-gray-100 text-gray-200 cursor-not-allowed'
              : 'border-gray-900 text-gray-900 hover:border-red-600 hover:text-red-600 dark:text-white active:scale-90'
          }`}
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}