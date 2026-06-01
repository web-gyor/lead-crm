import React from 'react';
import { TablePagination } from './TablePagination';

interface Column<T> {
  header: string;
  accessor: (item: T, index: number) => React.ReactNode;
  className?: string;
}

interface EnterpriseTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading: boolean;
  emptyMessage?: string;
  
  // Pagination Integration
  currentPage: number;
  totalPages: number;
  totalCount: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
}

export function EnterpriseTable<T>({
  data,
  columns,
  loading,
  emptyMessage = "No relational records matched parameters",
  currentPage,
  totalPages,
  totalCount,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange
}: EnterpriseTableProps<T>) {
  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/80 overflow-hidden shadow-3xs">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10 select-none">
            <tr className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
              <th className="px-5 py-3.5 w-14 text-center">#</th>
              {columns.map((col, idx) => (
                <th key={idx} className={`px-5 py-3.5 ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60 text-xs font-medium text-slate-600 dark:text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-16 text-center text-slate-400 dark:text-slate-500 tracking-wide font-medium animate-pulse">
                  📡 Synchronizing centralized relational table arrays...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-16 text-center text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => (
                <tr key={rowIdx} className="group border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-colors">
                  <td className="px-5 py-4 text-center font-mono text-[11px] text-slate-400 dark:text-slate-600">
                    {(currentPage - 1) * rowsPerPage + rowIdx + 1}
                  </td>
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={`px-5 py-4 ${col.className || ''}`}>
                      {col.accessor(item, rowIdx)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {!loading && data.length > 0 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          rowsPerPage={rowsPerPage}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
        />
      )}
    </div>
  );
}