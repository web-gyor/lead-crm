import React from 'react';
import { Phone, MessageCircle, Edit3, Trash2 } from 'lucide-react';
// ✅ IMPORT THE CENTRAL RESPONSIVE COMPONENT
import PaginationFooter from '../../components/leads/PaginationFooter'; 

interface TableProps {
  leads: any[];
  loading: boolean;
  isAdmin: boolean;
  selectedLeads: number[];
  setSelectedLeads: React.Dispatch<React.SetStateAction<number[]>>;
  counselors: any[];
  sourceOptions: any[];
  currentPage: number;
  rowsPerPage: number;
  setRowsPerPage: (num: number) => void;
  setCurrentPage: (num: number) => void;
  totalPages: number;
  totalCount: number;
}

export const LeadTableUpgrade = React.memo(({
  leads, loading, isAdmin, selectedLeads, setSelectedLeads, sourceOptions, counselors, currentPage, rowsPerPage, setRowsPerPage, setCurrentPage, totalPages, totalCount
}: TableProps) => {
  
  const headers = ["#", "Created", "Student Details", "Interested Course", "Academics", "Channel Source", "Quality Rating", "Actions"];
  const allSelected = leads.length > 0 && selectedLeads.length === leads.length;

  const toggleAll = () => setSelectedLeads(allSelected ? [] : leads.map(l => l.id));
  const toggleOne = (id: number) => setSelectedLeads(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-3xs border border-gray-100 dark:border-gray-800/80 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="bg-gray-50/70 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 select-none">
            <tr className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              <th className="px-3 py-3 w-10 text-center">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-3.5 h-3.5 accent-indigo-600 rounded-md" />
              </th>
              {headers.map(h => <th key={h} className="px-3 py-2.5 font-bold">{h}</th>)}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60 text-gray-700 dark:text-gray-300 text-xs font-semibold">
            {loading ? (
              <tr><td colSpan={headers.length + 1} className="py-16 text-center text-xs font-black uppercase tracking-widest text-gray-400 animate-pulse">📡 Fetching data array blocks...</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={headers.length + 1} className="py-16 text-center text-xs font-black uppercase tracking-widest text-gray-400">📭 Zero active lead profiles loaded</td></tr>
            ) : (
              leads.map((lead, idx) => {
                const isChecked = selectedLeads.includes(lead.id);
                return (
                  <tr key={lead.id} className={`transition-colors hover:bg-gray-50/40 dark:hover:bg-gray-800/20 ${isChecked ? "bg-indigo-50/30 dark:bg-indigo-950/10" : ""}`}>
                    <td className="px-3 py-2 text-center align-middle">
                      <input type="checkbox" checked={isChecked} onChange={() => toggleOne(lead.id)} className="w-3.5 h-3.5 accent-indigo-600 rounded-md" />
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-400 tabular-nums">{(currentPage - 1) * rowsPerPage + idx + 1}</td>
                    <td className="px-3 py-2 font-mono text-gray-400">
                      {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-black text-gray-900 dark:text-white leading-none mb-1">{lead.full_name}</span>
                        <span className="text-[10px] text-gray-500 font-mono tracking-tight leading-none">{lead.phone}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 font-medium">{lead.interested_course || "General"}</td>
                    <td className="px-3 py-2 text-indigo-600 dark:text-indigo-400 uppercase tracking-tight font-black">{lead.qualification || "—"}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800 text-[10px] uppercase font-bold border border-gray-100 dark:border-gray-700">
                        {lead.source_name || "Direct Link"}
                      </span>
                    </td>
                    <td className="px-3 py-2 uppercase">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${
                        lead.lead_quality === 'hot' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-gray-50 text-gray-500'
                      }`}>
                        {lead.lead_quality || "unverified"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button type="button" className="text-indigo-500 hover:bg-indigo-50 p-1.5 rounded-lg"><Edit3 size={13} /></button>
                        <a href={`tel:${lead.phone}`} className="text-gray-400 hover:text-blue-500 p-1"><Phone size={13} /></a>
                        <a href={`https://wa.me/91${lead.phone}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-emerald-500 p-1"><MessageCircle size={13} /></a>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ FIXED FOOTER: Removed old hardcoded block, injected universal responsive footer components */}
      <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
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

LeadTableUpgrade.displayName = 'LeadTableUpgrade';