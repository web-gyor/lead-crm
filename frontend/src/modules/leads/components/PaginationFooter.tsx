import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationFooterProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  rowsPerPage: number;
  setRowsPerPage: React.Dispatch<React.SetStateAction<number>>;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  mobile?: boolean;
}

export default function PaginationFooter({
  currentPage,
  totalPages,
  totalCount,
  rowsPerPage,
  setRowsPerPage,
  setCurrentPage,
  mobile = false,
}: PaginationFooterProps) {
  
  const { startItem, endItem } = useMemo(() => {
    if (totalCount === 0) return { startItem: 0, endItem: 0 };
    const start = (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(currentPage * rowsPerPage, totalCount);
    return { startItem: start, endItem: end };
  }, [currentPage, rowsPerPage, totalCount]);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 w-full select-none text-xs font-medium text-slate-400 dark:text-slate-500`}>
      {/* Items count display */}
      <div className="text-center sm:text-left order-2 sm:order-1">
        Showing <span className="text-slate-700 dark:text-slate-300 font-semibold">{startItem}</span> to <span className="text-slate-700 dark:text-slate-300 font-semibold">{endItem}</span> of <span className="text-slate-700 dark:text-slate-300 font-semibold">{totalCount}</span> records
      </div>
      
      {/* Action Selectors and Chevrons */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 order-1 sm:order-2 w-full sm:w-auto">
        {/* Rows selector dropdown */}
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select 
            value={rowsPerPage} 
            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} 
            className="pl-3 pr-8 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl outline-none font-semibold cursor-pointer appearance-none"
          >
            {[10, 15, 25, 50, 100].map((size) => (<option key={size} value={size}>{size}</option>))}
          </select>
        </div>

        {/* Step buttons control group */}
        <div className="flex items-center gap-1">
          <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className="p-1.5 border border-slate-200 dark:border-slate-700 text-slate-500 rounded-xl disabled:opacity-30 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><ChevronsLeft size={14} /></button>
          <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} className="p-1.5 border border-slate-200 dark:border-slate-700 text-slate-500 rounded-xl disabled:opacity-30 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><ChevronLeft size={14} /></button>
          
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold mx-1 tabular-nums">
            {currentPage} / {totalPages}
          </span>
          
          <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)} className="p-1.5 border border-slate-200 dark:border-slate-700 text-slate-500 rounded-xl disabled:opacity-30 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><ChevronRight size={14} /></button>
          <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} className="p-1.5 border border-slate-200 dark:border-slate-700 text-slate-500 rounded-xl disabled:opacity-30 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><ChevronsRight size={14} /></button>
        </div>
      </div>
    </div>
  );
}