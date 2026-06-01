import React, { useMemo } from 'react';
import { LeadTable } from './LeadTable';
import { LeadMobileCard } from './LeadMobileCard';
// ✅ IMPORT THE REUSABLE PAGINATION FOOTER WE FIXED BETTER BEFORE
import PaginationFooter from '../components/PaginationFooter'; 

export const LeadDataDisplay = React.memo(({
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
}: any) => {

  return (
    <div className="w-full space-y-4">
      
      {/* ── DESKTOP VIEWPORT BLOCK ─────────────────────────────────────────── */}
      <div className="hidden sm:block w-full">
        <LeadTable
          leads={leads}
          loading={loading}
          isAdmin={isAdmin}
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          setCurrentPage={setCurrentPage}
          onEdit={onEdit}
          onView={onView} 
          onDelete={onDelete}
          getFollowUpStatus={getFollowUpStatus}
          fmtDate={fmtDate}
          sourceOptions={sourceOptions}
          selectedLeads={selectedLeads}
          setSelectedLeads={setSelectedLeads}
          activeStatus={activeStatus}
          onRestore={onRestore}
        />
      </div>

      {/* ── MOBILE RESPONSIVE CHIP LIST ────────────────────────────────────── */}
      <div className="sm:hidden space-y-4 px-2 w-full">
        {loading ? (
          <p className="py-12 text-center text-xs text-slate-400 animate-pulse">Loading leads…</p>
        ) : leads.length === 0 ? (
          <p className="py-12 text-center text-xs text-slate-400">No leads found</p>
        ) : (
          <>
            {leads.map((lead: any, idx: number) => (
              <LeadMobileCard
                key={lead.id}
                lead={lead}
                index={(currentPage - 1) * rowsPerPage + idx + 1}
                isAdmin={isAdmin}
                onEdit={onEdit}
                onView={onView} 
                onDelete={onDelete}
                getFollowUpStatus={getFollowUpStatus}
                fmtDate={fmtDate}
                activeStatus={activeStatus}
                onRestore={onRestore}
                isSelected={selectedLeads.includes(lead.id)}
                onToggleSelect={() => 
                  setSelectedLeads((prev: number[]) => 
                    prev.includes(lead.id) ? prev.filter(id => id !== lead.id) : [...prev, lead.id]
                  )
                }
              />
            ))}

            {/* ✅ FIXED: Replaced the old hardcoded look with our synced component */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm">
             <PaginationFooter
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                rowsPerPage={rowsPerPage}
                setRowsPerPage={setRowsPerPage}
                setCurrentPage={setCurrentPage}
              />
          
            </div>
          </>
        )}
      </div>
    </div>
  );
});

LeadDataDisplay.displayName = 'LeadDataDisplay';