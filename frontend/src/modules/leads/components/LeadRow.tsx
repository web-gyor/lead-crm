import React, { useState, useEffect } from 'react';
import { Edit3, Trash2, Phone, MessageCircle, Flame, Thermometer, Snowflake, Search, TrendingDown, RotateCcw, Eye } from 'lucide-react';

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

interface LeadRowProps {
  lead: Lead;
  index: number;
  isAdmin: boolean;
  onEdit: (lead: Lead) => void;
  onView: (lead: Lead) => void; 
  onDelete: (id: number) => void;
  getFollowUpStatus: (date?: string) => "overdue" | "today" | "future" | null;
  fmtDate: (iso?: string) => string;
  sourceOptions: any[];
  isSelected: boolean;
  onToggleSelect: () => void;
  activeStatus: string;
  onRestore: (ids: number[]) => void;
}

const STATUS_COLORS: Record<string, string> = {
  "New":            "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900",
  "Contacted":      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900",
  "Interested":     "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900",
  "Follow-up":      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900",
  "Converted":      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900",
  "Lost":           "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900",
  "Not Interested": "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
};

const SOURCE_COLORS: Record<string, string> = {
  "WHATSAPP":      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
  "WEBSITE":       "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400",
  "PHONE CALL":    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400",
  "WALK-IN":       "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
  "META ADS":      "bg-blue-600 text-white border-blue-700 dark:bg-blue-900 dark:text-blue-100",
  "GOOGLE ADS":    "bg-teal-600 text-white border-teal-700 dark:bg-teal-900 dark:text-teal-100",
  "SOCIAL":        "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-400",
  "REFERRAL":      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400",
  "BULK IMPORT":   "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400",
  "UNKNOWN":       "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900 dark:text-gray-500",
};

const QUALITY_CONFIG: Record<string, { label: string; icon: any; style: string }> = {
  hot: { label: "HOT", icon: <Flame size={11} className="fill-current" />, style: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 animate-pulse" },
  warm: { label: "WRM", icon: <Thermometer size={11} />, style: "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/30" },
  cold: { label: "CLD", icon: <Snowflake size={11} />, style: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30" },
  unverified: { label: "UNV", icon: <Search size={11} />, style: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700" },
  low: { label: "LOW", icon: <TrendingDown size={11} />, style: "bg-gray-50 text-gray-400 border-gray-200 dark:bg-gray-900 dark:border-gray-800" }
};

export const LeadRow = React.memo(({ 
  lead, 
  index, 
  isAdmin, 
  onEdit, 
  onView,
  onDelete, 
  getFollowUpStatus, 
  fmtDate, 
  sourceOptions, 
  isSelected, 
  onToggleSelect,
  activeStatus,
  onRestore
}: LeadRowProps) => {

  if (!lead) return null;

  const [isRestoreConfirming, setIsRestoreConfirming] = useState(false);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);

  useEffect(() => {
    if (!isRestoreConfirming && !isDeleteConfirming) return;
    const dismiss = () => { setIsRestoreConfirming(false); setIsDeleteConfirming(false); };
    window.addEventListener('click', dismiss);
    return () => window.removeEventListener('click', dismiss);
  }, [isRestoreConfirming, isDeleteConfirming]);

  const fuStatus = getFollowUpStatus(lead.next_follow_up_date);
  const assignedCounselor = lead.counselor_name || lead.assigned_user_name || "Unassigned";

  const safeSources = Array.isArray(sourceOptions) ? sourceOptions : [];
  const srcMatch = safeSources.find(s => Number(s.id) === Number(lead.lead_source_id));
  const extractedSourceName = (srcMatch?.name || lead.source_name || lead.lead_source_name || "UNKNOWN").toUpperCase();
  const sourceColorClass = SOURCE_COLORS[extractedSourceName] ?? "bg-gray-50 text-gray-500 border-gray-200";

  const currentStatusString = lead.lead_status || "New";
  const statusColorClass = STATUS_COLORS[currentStatusString] ?? "bg-gray-50 text-gray-700 border-gray-200";

  const qualityKey = (lead.lead_quality || "unverified").toLowerCase();
  const qualityConfig = QUALITY_CONFIG[qualityKey] ?? QUALITY_CONFIG.unverified;

  const normalizedActiveStatus = String(activeStatus || "").toLowerCase();
  const isColdStorageView = normalizedActiveStatus.includes("cold") || normalizedActiveStatus.includes("archive");

  // 🚀 FIXED: Defensive parsing layer to handle snake_case, camelCase, or variant payload fields safely
  const displayEducation = lead.education || (lead as any).qualification || (lead as any).course_education || "—";
  const displayPassingYear = 
  lead.passing_year || 
  (lead as any).year_of_passing ||  
  (lead as any).passingYear || 
  (lead as any).graduation_year || 
  null;

  return (
    <tr className={`group transition-colors hover:bg-blue-50/20 dark:hover:bg-gray-800/10 ${
      isSelected ? "bg-blue-50/40 dark:bg-blue-950/10" : fuStatus === "overdue" ? "bg-rose-50/40 dark:bg-rose-950/10" : fuStatus === "today" ? "bg-blue-50/40 dark:bg-blue-950/10" : ""
    }`}>
      <td className="px-4 py-2 text-center align-middle w-12">
        <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 dark:border-slate-700 focus:ring-blue-500/20 cursor-pointer accent-blue-600" />
      </td>
      <td className="px-3 py-2 text-center font-mono text-[11px] text-gray-400">{index}</td>
      
      {/* Combined ID & Entry Date */}
      <td className="px-3 py-2 whitespace-nowrap">
        <div className="font-mono text-[10px] font-black text-blue-600">L26-{String(lead.id).padStart(4, "0")}</div>
        <div className="text-[10px] text-gray-400">{fmtDate(lead.created_at)}</div>
      </td>

      {/* Combined Name & Phone */}
      <td className="px-3 py-2 max-w-[140px] truncate">
        <div className="font-black text-gray-900 dark:text-white truncate">{lead.full_name}</div>
        <div className="font-mono text-[10px] text-gray-500 dark:text-gray-400">{lead.phone ? `+91 ${lead.phone}` : "—"}</div>
      </td>

      <td className="px-3 py-2 text-gray-600 dark:text-gray-300 max-w-[120px] truncate">{lead.interested_course || "General Track"}</td>
      
      {/* Combined Education & Passing Year (With Defensive Layer Updates) */}
      <td className="px-3 py-2 text-gray-600 dark:text-gray-300 max-w-[120px] truncate">
        <div className="text-xs font-medium truncate">{displayEducation}</div>
        {displayPassingYear && <div className="text-[10px] text-gray-400 font-mono">Year: {displayPassingYear}</div>}
      </td>
      
      <td className="px-3 py-2 whitespace-nowrap">
        <span className={`px-2 py-0.5 rounded-sm text-[9px] font-black uppercase border shadow-3xs ${sourceColorClass}`}>
          {extractedSourceName}
        </span>
      </td>

      <td className="px-3 py-2 whitespace-nowrap">
        <span className={`px-2 py-0.5 rounded-sm text-[9px] font-black uppercase border ${statusColorClass}`}>
          {currentStatusString}
        </span>
      </td>

      <td className="px-3 py-2 whitespace-nowrap">
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[9px] font-black border uppercase ${qualityConfig.style}`}>
          {qualityConfig.icon}
          <span>{qualityConfig.label}</span>
        </span>
      </td>

      <td className="px-3 py-2 whitespace-nowrap">
        <div className="leading-tight">
          <p className={`text-[10px] font-black ${fuStatus === "overdue" ? "text-rose-600 dark:text-rose-400" : fuStatus === "today" ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}>
            {lead.next_follow_up_date ? fmtDate(lead.next_follow_up_date) : fmtDate(lead.updated_at || lead.created_at)}
          </p>
          <p className="text-[8px] text-gray-400 uppercase tracking-tight">
            {fuStatus === "overdue" ? "⚠️ Overdue" : fuStatus === "today" ? "📅 Due Today" : "Timeline Status"}
          </p>
        </div>
      </td>

      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
        <span className="px-1.5 py-0.5 rounded-sm text-[9px] font-bold bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          {assignedCounselor}
        </span>
      </td>
      <td className="px-3 py-2 max-w-[150px] truncate text-gray-400 italic">{lead.counselor_remarks || "—"}</td>

      {/* Fixed Alignment Action Elements */}
      <td className="px-3 py-2 text-right whitespace-nowrap text-xs w-[140px] min-w-[140px] max-w-[140px] relative">
        <div className="w-full h-full flex justify-end items-center">
          
          {(() => {
            let userObj: any = {};
            try { userObj = JSON.parse(localStorage.getItem('user') || '{}'); } catch { userObj = {}; }
            const userRole = String(userObj.role || '').toLowerCase();
            const hasFullPerms = isAdmin || 
                                 userObj.is_super_admin === 1 || userObj.is_super_admin === true ||
                                 userObj.is_branch_admin === 1 || userObj.is_branch_admin === true ||
                                 ['admin', 'super admin', 'branch admin'].includes(userRole);

            return isColdStorageView ? (
              <div className="relative w-full flex justify-end items-center h-8">
                <div className={`flex items-center gap-1 transition-opacity ${isRestoreConfirming || isDeleteConfirming ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onView(lead); }} className="p-1.5 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 rounded-lg cursor-pointer" title="View Lead Profile"><Eye size={13} /></button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setIsDeleteConfirming(false); setIsRestoreConfirming(true); }} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg cursor-pointer" title="Restore lead"><RotateCcw size={13} /></button>
                  {hasFullPerms && <button type="button" onClick={(e) => { e.stopPropagation(); setIsRestoreConfirming(false); setIsDeleteConfirming(true); }} className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer" title="Wipe Permanently"><Trash2 size={13} /></button>}
                </div>

                {isRestoreConfirming && (
                  <div onClick={(e) => e.stopPropagation()} className="absolute inset-y-0 right-0 flex items-center gap-1.5 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900/30 px-2 rounded-xl h-7 my-auto z-20">
                    <span className="text-[9px] font-black text-cyan-700 dark:text-cyan-400 tracking-wider">Restore?</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsRestoreConfirming(false); }} className="px-1 text-[9px] font-black text-slate-400">No</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsRestoreConfirming(false); onRestore([lead.id]); }} className="px-2.5 py-0.5 bg-cyan-600 text-white text-[9px] font-black rounded-md">Yes</button>
                  </div>
                )}

                {isDeleteConfirming && (
                  <div onClick={(e) => e.stopPropagation()} className="absolute inset-y-0 right-0 flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 px-2 rounded-xl h-7 my-auto z-20">
                    <span className="text-[9px] font-black text-rose-700 dark:text-rose-400 tracking-wider">Wipe?</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsDeleteConfirming(false); }} className="px-1 text-[9px] font-black text-slate-400">No</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsDeleteConfirming(false); onDelete(lead.id); }} className="px-2.5 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded-md">Wipe</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative w-full flex justify-end items-center h-8">
                <div className={`flex items-center gap-1 transition-opacity ${isDeleteConfirming ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                  <button type="button" onClick={() => onEdit(lead)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg cursor-pointer" title="Edit Lead Profile"><Edit3 size={13} /></button>
                  {hasFullPerms && <button type="button" onClick={(e) => { e.stopPropagation(); setIsDeleteConfirming(true); }} className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer" title="Delete Lead"><Trash2 size={13} /></button>}
                  <div className="flex items-center gap-0.5 ml-1 pl-1.5 border-l border-gray-100 dark:border-gray-800">
                    <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()} className="p-1 text-gray-400 hover:text-blue-600"><Phone size={12} /></a>
                    <a href={`https://wa.me/91${lead.phone?.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="p-1 text-gray-400 hover:text-emerald-500"><MessageCircle size={12} /></a>
                  </div>
                </div>

                {isDeleteConfirming && (
                  <div onClick={(e) => e.stopPropagation()} className="absolute inset-y-0 right-0 flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 px-2 rounded-xl h-7 my-auto z-20">
                    <span className="text-[9px] font-black text-rose-700 dark:text-rose-400 tracking-wider">Delete?</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsDeleteConfirming(false); }} className="px-1 text-[9px] font-black text-slate-400">No</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsDeleteConfirming(false); onDelete(lead.id); }} className="px-2.5 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded-md">Drop</button>
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      </td>
    </tr>
  );
});

LeadRow.displayName = 'LeadRow';