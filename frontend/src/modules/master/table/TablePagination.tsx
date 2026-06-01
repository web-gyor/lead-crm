import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange
}) => {
  const { startItem, endItem } = useMemo(() => {
    if (totalCount === 0) return { startItem: 0, endItem: 0 };
    const start = (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(currentPage * rowsPerPage, totalCount);
    return { startItem: start, endItem: end };
  }, [currentPage, rowsPerPage, totalCount]);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 select-none text-xs font-semibold text-slate-400 dark:text-slate-500">
      <div>
        Showing <span className="text-slate-700 dark:text-slate-300 font-bold">{startItem}</span> to{" "}
        <span className="text-slate-700 dark:text-slate-300 font-bold">{endItem}</span> of{" "}
        <span className="text-slate-700 dark:text-slate-300 font-bold">{totalCount}</span> metrics record slots
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span>Density Scale:</span>
          <div className="relative">
            <select
              value={rowsPerPage}
              onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
              className="px-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all cursor-pointer font-bold appearance-none pr-6"
            >
              {[10, 15, 25, 50].map((size) => (
                <option key={size} value={size}>{size} rows</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <span className="text-[8px]">▼</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange(1)}
            className="p-1.5 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl bg-white dark:bg-slate-900 disabled:opacity-30 transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ChevronsLeft size={13} />
          </button>
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="p-1.5 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl bg-white dark:bg-slate-900 disabled:opacity-30 transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ChevronLeft size={13} />
          </button>

          <span className="px-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold mx-0.5">
            {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="p-1.5 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl bg-white dark:bg-slate-900 disabled:opacity-30 transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ChevronRight size={13} />
          </button>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(totalPages)}
            className="p-1.5 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl bg-white dark:bg-slate-900 disabled:opacity-30 transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ChevronsRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};