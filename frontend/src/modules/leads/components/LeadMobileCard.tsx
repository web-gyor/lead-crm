import React, { useState, useEffect } from 'react';
import { Phone, MessageCircle, Edit3, Trash2, RotateCcw, Eye, Clock } from 'lucide-react';

interface LeadMobileCardProps {
  lead: any;
  index: number;
  isAdmin: boolean;
  onEdit: (lead: any) => void;
  onView: (lead: any) => void; 
  onDelete: (id: number) => void;
  getFollowUpStatus: (date?: string) => "overdue" | "today" | "future" | null;
  fmtDate: (iso?: string) => string;
  activeStatus?: string;
  onRestore?: (ids: number[]) => void;
  isSelected: boolean;      
  onToggleSelect: () => void;    
}

export const LeadMobileCard = React.memo(({ 
  lead, 
  index, 
  isAdmin, 
  onEdit, 
  onView, 
  onDelete, 
  getFollowUpStatus, 
  fmtDate,
  activeStatus,
  onRestore,
  isSelected,      
  onToggleSelect    
}: LeadMobileCardProps) => {
  const fuStatus = getFollowUpStatus(lead.next_follow_up_date);
  
  const normalizedActiveStatus = String(activeStatus || "").toLowerCase();
  const isColdStorageView = normalizedActiveStatus.includes("cold") || normalizedActiveStatus.includes("archive");

  // ✅ DESKTOP-STYLE LOCAL CONFIRMATION STATES FOR INLINE LABELS
  const [isRestoreConfirming, setIsRestoreConfirming] = useState(false);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);

  // Auto-dismiss confirmation overlays on click elsewhere
  useEffect(() => {
    if (!isRestoreConfirming && !isDeleteConfirming) return;
    const dismiss = () => { setIsRestoreConfirming(false); setIsDeleteConfirming(false); };
    window.addEventListener('click', dismiss);
    return () => window.removeEventListener('click', dismiss);
  }, [isRestoreConfirming, isDeleteConfirming]);

  // Compute card background and border colors systematically
  const cardTheme = React.useMemo(() => {
    if (isSelected) return "border-blue-400 bg-blue-50/30 ring-1 ring-blue-300 dark:border-blue-700 dark:bg-blue-950/10"; 
    if (fuStatus === "overdue") return "border-rose-200 bg-rose-50/20 dark:border-rose-900/40 dark:bg-rose-950/10";
    if (fuStatus === "today") return "border-blue-200 bg-blue-50/20 dark:border-blue-900/40 dark:bg-blue-950/10";
    return "border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900";
  }, [fuStatus, isSelected]);

  return (
    <div className={`rounded-xl border p-3.5 space-y-3 shadow-sm transition-transform active:scale-[0.995] select-none ${cardTheme}`}>
      
      {/* ── HEADER ROW ── */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <input 
            type="checkbox" 
            checked={isSelected}
            onChange={onToggleSelect}
            className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700 focus:ring-blue-500/20 cursor-pointer accent-blue-600 shrink-0 mr-1"
          />

          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
            {index}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {lead.full_name}
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-tight mt-0.5 truncate">
              {lead.interested_course || "General Enquiry"}
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wide bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/50 shrink-0">
          {lead.lead_status || "New"}
        </span>
      </div>

      {/* ── CENTRAL DATA MATRIX ── */}
      <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 font-medium text-slate-600 dark:text-slate-400 text-[11px]">
        <div className="min-w-0">
          <span className="text-[8px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">Contact Phone</span>
          <span className="font-mono text-slate-800 dark:text-slate-200 block truncate">
            {lead.phone ? `+91 ${lead.phone}` : "—"}
          </span>
        </div>
        <div className="min-w-0">
          <span className="text-[8px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">Target Destination</span>
          <span className="text-slate-800 dark:text-slate-200 block truncate">
            {lead.city || "—"}
          </span>
        </div>
      </div>

      {/* ── FOLLOW-UP INDICATOR ── */}
      {lead.next_follow_up_date && (
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium tracking-tight ${
          fuStatus === 'overdue' 
            ? 'bg-rose-100/70 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400' 
            : fuStatus === 'today'
              ? 'bg-blue-100/70 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
              : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
        }`}>
          <Clock size={11} className="shrink-0 opacity-80" />
          <span className="truncate">Follow-up: {fmtDate(lead.next_follow_up_date)}</span>
          {fuStatus === 'overdue' && <span className="font-bold uppercase text-[8px] ml-auto shrink-0 tracking-wider">Overdue</span>}
          {fuStatus === 'today' && <span className="font-bold uppercase text-[8px] ml-auto shrink-0 tracking-wider">Today</span>}
        </div>
      )}

      {/* ── ACTION FOOTER TOOLBAR ── */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-xl -mx-3.5 -mb-3.5 px-3.5 py-2 relative min-h-[40px]">
        <div className="flex items-center gap-3.5">
          <a 
            href={`tel:${lead.phone}`} 
            className="flex items-center gap-1 text-[11px] font-bold uppercase text-blue-600 dark:text-blue-400 tracking-wider hover:opacity-80 transition-opacity"
          >
            <Phone size={11} /> Call
          </a>
          <a 
            href={`https://wa.me/91${lead.phone?.replace(/\D/g, "")}`} 
            target="_blank" 
            rel="noreferrer" 
            className="flex items-center gap-1 text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider hover:opacity-80 transition-opacity"
          >
            <MessageCircle size={11} /> WhatsApp
          </a>
        </div>
        
        <div className="flex items-center gap-0.5">
          {(() => {
            let userObj: any = {};
            try { userObj = JSON.parse(localStorage.getItem('user') || '{}'); } catch { userObj = {}; }
            const userRole = String(userObj.role || '').toLowerCase();
            const hasFullPerms = isAdmin || 
                                 userObj.is_super_admin === 1 || userObj.is_super_admin === true ||
                                 userObj.is_branch_admin === 1 || userObj.is_branch_admin === true ||
                                 ['admin', 'super admin', 'branch admin'].includes(userRole);

            return isColdStorageView ? (
              <div className="relative flex items-center justify-end h-8">
                {/* Standard Base Icons State Group */}
                <div className={`flex items-center gap-1 transition-opacity ${isRestoreConfirming || isDeleteConfirming ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onView(lead); }} title="View Lead Profile" className="p-1.5 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"><Eye size={13} /></button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setIsDeleteConfirming(false); setIsRestoreConfirming(true); }} title="Restore Record" className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"><RotateCcw size={13} /></button>
                  {hasFullPerms && <button type="button" onClick={(e) => { e.stopPropagation(); setIsRestoreConfirming(false); setIsDeleteConfirming(true); }} title="Wipe Permanently" className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"><Trash2 size={13} /></button>}
                </div>

                {/* ✅ DESKTOP STYLE INLINE LABEL: COLD STORAGE RESTORE */}
                {isRestoreConfirming && (
                  <div onClick={(e) => e.stopPropagation()} className="absolute right-0 flex items-center gap-1.5 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900/30 px-2 rounded-xl h-7 z-20 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                    <span className="text-[9px] font-black text-cyan-700 dark:text-cyan-400 tracking-wider">Restore?</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsRestoreConfirming(false); }} className="px-1 text-[9px] font-black text-slate-400">No</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsRestoreConfirming(false); onRestore && onRestore([lead.id]); }} className="px-2.5 py-0.5 bg-cyan-600 text-white text-[9px] font-black rounded-md">Yes</button>
                  </div>
                )}

                {/* ✅ DESKTOP STYLE INLINE LABEL: COLD STORAGE PERMANENT WIPE */}
                {isDeleteConfirming && (
                  <div onClick={(e) => e.stopPropagation()} className="absolute right-0 flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 px-2 rounded-xl h-7 z-20 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                    <span className="text-[9px] font-black text-rose-700 dark:text-rose-400 tracking-wider">Wipe?</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsDeleteConfirming(false); }} className="px-1 text-[9px] font-black text-slate-400">No</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsDeleteConfirming(false); onDelete(lead.id); }} className="px-2.5 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded-md">Wipe</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative flex items-center justify-end h-8">
                {/* Standard Base Icons State Group */}
                <div className={`flex items-center gap-1 transition-opacity ${isDeleteConfirming ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                  <button type="button" onClick={() => onEdit(lead)} title="Edit Lead" className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"><Edit3 size={13} /></button>
                  {hasFullPerms && <button type="button" onClick={(e) => { e.stopPropagation(); setIsDeleteConfirming(true); }} title="Delete Lead" className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"><Trash2 size={13} /></button>}
                </div>

                {/* ✅ DESKTOP STYLE INLINE LABEL: PIPELINE PIPELINE DROP/DELETE */}
                {isDeleteConfirming && (
                  <div onClick={(e) => e.stopPropagation()} className="absolute right-0 flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 px-2 rounded-xl h-7 z-20 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                    <span className="text-[9px] font-black text-rose-700 dark:text-rose-400 tracking-wider">Delete?</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsDeleteConfirming(false); }} className="px-1 text-[9px] font-black text-slate-400">No</button>
                    <button 
                      type="button" 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        // Fires deletion routine immediately on the master tracking thread
                        onDelete(lead.id); 
                        // Safe micro-delay timeout guarantees query completion before state mutations reset UI views
                        setTimeout(() => setIsDeleteConfirming(false), 50); 
                      }} 
                      className="px-2.5 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded-md"
                    >
                      Drop
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
});

LeadMobileCard.displayName = 'LeadMobileCard';