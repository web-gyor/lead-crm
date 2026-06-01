import React from 'react';
import { X } from 'lucide-react';

interface ViewLeadModalProps {
  isOpen: boolean; // Maps to your parent condition: showViewForm && editingLead
  editingLead: any;
  onClose: () => void;
  sourceOptions: any[];
  masterCourses: any[];
  STATUS_OPTIONS: any[];
  ActivityLogsMini: React.ComponentType<{ leadId: number }>;
}

// SHARED ENTERPRISE READ-ONLY DESIGN TOKENS
const INPUT_VIEW = "w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 outline-none select-text cursor-text font-medium";

// SUB-GRID FIELD WRAPPER
const Field = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={`space-y-1 ${className}`}>
    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block select-none">
      {label}
    </label>
    {children}
  </div>
);

export const ViewLeadModal = React.memo(({
  isOpen,
  editingLead,
  onClose,
  sourceOptions,
  masterCourses,
  STATUS_OPTIONS,
  ActivityLogsMini
}: ViewLeadModalProps) => {

  if (!isOpen || !editingLead) return null;

  // Resolve cross-browser labels matching ID constraints natively
  const matchedSource = sourceOptions.find(s => Number(s.id) === Number(editingLead.lead_source_id))?.name || "Direct Link";
  const matchedStatus = STATUS_OPTIONS.find(o => o.value === editingLead.lead_status)?.label || editingLead.lead_status || "New Records";
  const matchedQuality = String(editingLead.lead_quality || "unverified").toUpperCase();

  const fmtFollowUpDate = (dateStr?: string) => {
    if (!dateStr) return "No follow-up planned";
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div key={editingLead.id} className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-100">
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* PREMIUM SAAS VIEWPORT CARD */}
      <div className="bg-white dark:bg-slate-900 sm:rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800/80 w-full sm:max-w-5xl max-h-[95vh] overflow-hidden flex flex-col rounded-t-2xl relative z-10 select-text">
        
        {/* MOBILE SWIPE INDICATOR */}
        <div className="sm:hidden flex justify-center pt-2 pb-0.5 select-none">
          <div className="w-10 h-1 bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>

        {/* TOP BRANDING HEADER STRIP */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0 select-none">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
              {/* ✅ THEME COLOR STYLE FIX: Swapped blue badge to a clean slate tech accent */}
              <div className="w-1.5 h-3.5 bg-slate-500 dark:bg-slate-400 rounded-full" /> Student Lead Profile Directory
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-black uppercase tracking-widest mt-0.5">
              Ref: L26-{String(editingLead.id).padStart(4, "0")}
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer focus:outline-none"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* WORKSPACE CONTENT SPLIT GRID */}
        <div className="flex flex-col md:flex-row overflow-hidden flex-1 min-h-0 text-xs font-bold uppercase tracking-normal">
          
          {/* PRIMARY DATA GRID DISPLAY */}
          <div className="flex-1 px-4 sm:px-5 py-5 overflow-y-auto space-y-4 border-r border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            
            {/* IDENTITY METRICS BLOCK */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Full Name" className="col-span-2">
                <input readOnly value={editingLead.full_name || "—"} className={INPUT_VIEW} />
              </Field>
              <Field label="Age">
                <input readOnly value={editingLead.age || "—"} className={INPUT_VIEW} />
              </Field>
              <Field label="Gender">
                <input readOnly value={editingLead.gender || "—"} className={INPUT_VIEW} />
              </Field>
            </div>

            {/* CONTACT CODES METRICS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Phone Connection Endpoint">
                <div className="flex gap-2">
                  <input readOnly value={editingLead.phone ? `+91 ${editingLead.phone}` : "—"} className={INPUT_VIEW} />
                  {Number(editingLead.whatsapp_same) === 1 && (
                    <span className="inline-flex items-center px-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black tracking-widest uppercase shrink-0 select-none">
                      WA Mapped
                    </span>
                  )}
                </div>
              </Field>
              <Field label="Email Parameter">
                <input readOnly value={editingLead.email || "No Email Specified"} className={INPUT_VIEW} />
              </Field>
            </div>

            {/* ACADEMICS AND PARENTAL LEDGER CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl grid grid-cols-2 gap-3">
                <Field label="Qualification">
                  <input readOnly value={editingLead.qualification || "—"} className={INPUT_VIEW} />
                </Field>
                <Field label="Passing Year">
                  <input readOnly value={editingLead.year_of_passing || "—"} className={INPUT_VIEW} />
                </Field>
              </div>
              
              {/* ✅ THEME COLOR STYLE FIX: Updated cards backgrounds components to neutral borders styles to support views */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl grid grid-cols-2 gap-3">
                <Field label="Parent Name">
                  <input readOnly value={editingLead.parent_name || "—"} className={INPUT_VIEW} />
                </Field>
                <Field label="Contact Link">
                  <input readOnly value={editingLead.parent_contact || "—"} className={INPUT_VIEW} />
                </Field>
              </div>
            </div>

            {/* DUAL GEOGRAPHIC AND TRAJECTORY ARRAYS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Target City Location">
                <input readOnly value={editingLead.city || "Calicut"} className={INPUT_VIEW} />
              </Field>
              <Field label="Course Track Allocation">
                <input readOnly value={editingLead.interested_course || "General Track"} className={INPUT_VIEW} />
              </Field>
            </div>

            {/* ATTRIBUTION MARKETING AND QUALITY CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Attribution Channel">
                <input readOnly value={matchedSource} className={INPUT_VIEW} />
              </Field>
              <Field label="Urgency Metric">
                <input readOnly value={editingLead.urgency || "Normal"} className={INPUT_VIEW} />
              </Field>
              <Field label="Quality KPI">
                <input readOnly value={matchedQuality} className={`${INPUT_VIEW} font-black`} />
              </Field>
            </div>

            {/* PIPELINE STATUS AND CHRONO SYSTEM NOTES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t pt-4 border-slate-100 dark:border-slate-800">
              <Field label="Current Status Pipeline">
                <div className="flex flex-col sm:flex-row gap-2 w-full select-none">
                  {/* ✅ THEME COLOR STYLE FIX: Using subtle slate-pills for visual contrast distinction */}
                  <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 font-black text-xs uppercase flex-1 text-center sm:text-left">
                    {matchedStatus}
                  </div>
                  {editingLead.lead_status === "Follow-up" && (
                    <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 px-3 py-1.5 rounded-lg text-orange-700 dark:text-orange-400 font-black text-xs uppercase flex-1 text-center sm:text-left">
                      📅 Due: {fmtFollowUpDate(editingLead.next_follow_up_date)}
                    </div>
                  )}
                </div>
              </Field>

              <Field label="Counselor Remarks Historical Feed">
                <textarea 
                  readOnly 
                  rows={2} 
                  value={editingLead.counselor_remarks || "No remark records written to channel log indices"} 
                  className={`${INPUT_VIEW} resize-none h-auto font-normal normal-case italic`} 
                />
              </Field>
            </div>

            {/* DISMISS TRIGGER REGISTRY BASE */}
            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800 select-none">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-6 py-2 text-xs font-black text-white bg-slate-900 dark:bg-slate-800 dark:text-slate-100 rounded-lg uppercase tracking-wider transition-all cursor-pointer active:scale-98 shadow-xs hover:bg-slate-800 dark:hover:bg-slate-700"
              >
                Close View Panel
              </button>
            </div>
          </div>

          {/* CHRONOLOGICAL HISTORIC ACTIVITY SIDEPANEL ARCHITECTURE */}
          <div className="hidden md:block w-80 bg-slate-50/20 dark:bg-slate-950/10 overflow-y-auto border-l border-slate-100 dark:border-slate-800 shrink-0 select-text">
            {editingLead?.id && <ActivityLogsMini leadId={editingLead.id} />}
          </div>
          
        </div>
      </div>
    </div>
  );
});

ViewLeadModal.displayName = 'ViewLeadModal';