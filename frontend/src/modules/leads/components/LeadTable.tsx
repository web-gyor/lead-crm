import React, { useMemo, useCallback } from 'react';
import { LeadRow } from './LeadRow';
import PaginationFooter from '../components/PaginationFooter'; 

interface Lead {
  id: number;
  full_name: string;
  parent_name?: string;
  phone?: string;
  city?: string;
  interested_course?: string;
  lead_status?: string;
  lead_quality?: string;
  next_follow_up_date?: string;
  created_at?: string;
  updated_at?: string;
  status_updated_at?: string;
  first_contacted_at?: string;
  counselor_name?: string;
  assigned_user_name?: string;
  counselor_remarks?: string;
  source_name?: string;
  lead_source_name?: string;
  lead_source_id?: number;
  education?: string;
  passing_year?: string | number;
}

interface LeadTableProps {
  leads: Lead[];
  loading: boolean;
  isAdmin: boolean;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  rowsPerPage: number;
  setRowsPerPage: React.Dispatch<React.SetStateAction<number>>;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  onEdit: (lead: Lead) => void;
  onView: (lead: Lead) => void; 
  onDelete: (id: number) => void;
  getFollowUpStatus: (date?: string) => "overdue" | "today" | "future" | null;
  fmtDate: (iso?: string) => string;
  sourceOptions: any[];
  selectedLeads: number[];
  setSelectedLeads: React.Dispatch<React.SetStateAction<number[]>>;
  activeStatus: string;
  onRestore: (ids: number[]) => void;
  // 🚀 NEW PROP: Forces parent status badge component to recount numbers dynamically
  onActionSuccess?: () => void; 
}

export const LeadTable = React.memo(({
  leads,
  loading,
  isAdmin,
  currentPage,
  totalPages,
  totalCount,
  rowsPerPage,
  setRowsPerPage,
  setCurrentPage,
  onEdit,
  onView, 
  onDelete,
  getFollowUpStatus,
  fmtDate,
  sourceOptions,
  selectedLeads,
  setSelectedLeads,
  activeStatus,
  onRestore,
  onActionSuccess // 🚀 Destructure the callback handler
}: LeadTableProps) => {

  const safeLeads = useMemo(() => Array.isArray(leads) ? leads : [], [leads]);

  const isAllSelected = useMemo(() => 
    safeLeads.length > 0 && safeLeads.every(l => selectedLeads.includes(l.id)),
    [safeLeads, selectedLeads]
  );

  const handleSelectAllToggle = useCallback(() => {
    if (isAllSelected) {
      const pageIds = safeLeads.map(l => l.id);
      setSelectedLeads(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      const newIds = safeLeads.map(l => l.id).filter(id => !selectedLeads.includes(id));
      setSelectedLeads(prev => [...prev, ...newIds]);
    }
  }, [isAllSelected, safeLeads, setSelectedLeads]);

  // 🚀 Wrap restore actions to automatically signal the status badge counter context
  const handleInterceptRestore = useCallback((ids: number[]) => {
    if (typeof onRestore === 'function') {
      onRestore(ids);
    }
    if (typeof onActionSuccess === 'function') {
      // Fires dynamic counter refresh pipeline track
      setTimeout(() => onActionSuccess(), 100); 
    }
  }, [onRestore, onActionSuccess]);

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 overflow-hidden shadow-sm">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-[1100px]">
          <thead className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10 select-none">
            <tr className="text-[9px] font-black text-slate-400 dark:text-slate-500 tracking-wider uppercase">
              <th className="px-4 py-3.5 w-12 text-center align-middle">
                <input type="checkbox" checked={isAllSelected} onChange={handleSelectAllToggle} className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700 focus:ring-blue-500/20 cursor-pointer accent-blue-600" />
              </th>
              <th className="px-3 py-3.5 w-12 text-center">#</th>
              <th className="px-3 py-3.5">ID / Entry Date</th>
              <th className="px-3 py-3.5">Student / Contact</th>
              <th className="px-3 py-3.5">Course </th>
              <th className="px-3 py-3.5">Edu / Year</th>
              <th className="px-3 py-3.5">Source </th>
              <th className="px-3 py-3.5">Status </th>
              <th className="px-3 py-3.5">Quality</th>
              <th className="px-3 py-3.5">Follow-up </th>
              <th className="px-3 py-3.5">Assigned </th>
              <th className="px-3 py-3.5"> Remarks</th>
              <th className="px-3 py-3.5 text-right pr-6 min-w-[140px]">
                {activeStatus === "Cold Storage" ? "Vault Actions" : "Row Actions"}
              </th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-medium text-slate-600 dark:text-slate-300">
            {loading ? (
              <tr><td colSpan={13} className="py-20 text-center text-[10px] font-black uppercase text-slate-400 animate-pulse">Loading admission profiles...</td></tr>
            ) : safeLeads.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-20 text-center text-[10px] font-black uppercase text-slate-400">
                  {activeStatus === "Cold Storage" ? "No archived records inside Cold Storage" : "No active profiles match filters"}
                </td>
              </tr>
            ) : (
              safeLeads.map((lead, idx) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  index={(currentPage - 1) * rowsPerPage + idx + 1}
                  isAdmin={isAdmin}
                  onEdit={onEdit}
                  onView={onView} 
                  onDelete={onDelete}
                  getFollowUpStatus={getFollowUpStatus}
                  fmtDate={fmtDate}
                  sourceOptions={sourceOptions}
                  isSelected={selectedLeads.includes(lead.id)}
                  onToggleSelect={() => setSelectedLeads(prev => prev.includes(lead.id) ? prev.filter(id => id !== lead.id) : [...prev, lead.id])}
                  activeStatus={activeStatus}
                  onRestore={handleInterceptRestore} // 🚀 Intercepts inline single row restorations
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800/80">
        <PaginationFooter
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </div>
  );
});

LeadTable.displayName = 'LeadTable';