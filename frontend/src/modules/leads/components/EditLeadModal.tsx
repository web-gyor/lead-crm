import React, { useState, useEffect } from 'react';
import { X, Zap, Phone, UserX, MessageCircle, Clock, Globe, Users } from 'lucide-react';
import { apiGet } from '../../../utils/api'; 
import ActivityLogsMini from './ActivityLogsMini'; 

interface EditLeadModalProps {
  isOpen: boolean;
  editingLead: any;
  onClose: () => void;
  handleEditSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  sourceOptions: any[];
  masterCourses: any[];
  STATUS_OPTIONS: any[];
  stampRemark: (prefix: string, label: string) => void;
  editUrgency: string;
  setEditUrgency: (val: string) => void;
  editStatus: string;
  setEditStatus: (val: string) => void;
  isFollowUpStatus: boolean;
  followUpDate: string;
  setFollowUpDate: (val: string) => void;
}

const QUICK_ACTIONS = [
  { label: "Connected",     icon: <Phone size={10} />,         color: "bg-emerald-100 text-emerald-700",   prefix: "Called"   },
  { label: "Not Reachable", icon: <Phone size={10} />,         color: "bg-rose-50 text-rose-600",          prefix: "Called"   },
  { label: "Switched Off",  icon: <Phone size={10} />,         color: "bg-gray-100 text-gray-600",         prefix: "Called"   },
  { label: "Wrong Number",  icon: <UserX size={10} />,         color: "bg-purple-100 text-purple-700",     prefix: "Tried"    },
  { label: "WA Sent",       icon: <MessageCircle size={10} />, color: "bg-green-100 text-green-700",       prefix: "WhatsApp" },
  { label: "Replied",       icon: <MessageCircle size={10} />, color: "bg-indigo-100 text-indigo-700",   prefix: "WhatsApp" },
  { label: "Budget Issue",  icon: <Zap size={10} />,           color: "bg-amber-100 text-amber-700",       prefix: "Feedback" },
  { label: "Not Urgent",    icon: <Clock size={10} />,         color: "bg-teal-100 text-teal-700",         prefix: "Timeline" },
  { label: "Location Issue",icon: <Globe size={10} />,         color: "bg-rose-100 text-rose-700",         prefix: "Feedback" },
  { label: "Parent Discuss",icon: <Users size={10} />,         color: "bg-purple-100 text-purple-700",     prefix: "Call/WA"  },
];

const INPUT = "w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none focus:border-blue-500 transition-colors font-medium";
const SELECT = "w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none focus:border-blue-500 transition-colors font-semibold appearance-none cursor-pointer";

const Field = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={`space-y-1 ${className}`}>
    <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider block">{label}</label>
    {children}
  </div>
);

export const EditLeadModal = React.memo(({
  isOpen,
  editingLead,
  onClose,
  handleEditSubmit,
  sourceOptions = [],
  masterCourses = [],
  STATUS_OPTIONS = [],
  stampRemark,
  editUrgency,
  setEditUrgency,
  editStatus,
  setEditStatus,
  isFollowUpStatus,
  followUpDate,
  setFollowUpDate
}: EditLeadModalProps) => {

  const [localCourses, setLocalCourses] = useState<any[]>(masterCourses);

  // Sync complete course options from database layers safely
  useEffect(() => {
    if (!isOpen) return;

    apiGet('/api/courses')
      .then((res: any) => {
        const raw = Array.isArray(res) ? res : (res?.data ?? res?.courses ?? []);
        if (raw.length > 0) setLocalCourses(raw);
      })
      .catch(() => setLocalCourses(masterCourses));
  }, [isOpen, masterCourses]);

  if (!isOpen || !editingLead) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 sm:rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800/80 w-full sm:max-w-5xl max-h-[95vh] overflow-hidden flex flex-col rounded-t-2xl">
        
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/20 shrink-0">
          <div>
            <h2 className="text-sm font-black text-gray-800 dark:text-white flex items-center gap-2 uppercase tracking-tight">Modify Student Profile</h2>
            <p className="text-[10px] text-blue-600 font-mono">Ref: L26-{String(editingLead.id).padStart(4, "0")}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 cursor-pointer"><X size={16} /></button>
        </div>

        <div className="flex flex-col md:flex-row overflow-hidden flex-1 min-h-0 text-xs font-semibold">
          <form onSubmit={handleEditSubmit} className="flex-1 px-4 sm:px-5 py-4 overflow-y-auto space-y-4 border-r border-gray-100 dark:border-gray-800">
            
            {/* Quick action logs */}
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/10 rounded-xl border space-y-2">
              <p className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-1.5"><Zap size={11} fill="currentColor" /> Quick Action Logs</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((act) => (
                  <button key={act.label} type="button" onClick={() => stampRemark(act.prefix, act.label)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border border-transparent cursor-pointer transition-all active:scale-95 ${act.color}`}>
                    {act.icon} <span>{act.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Profile Grid Block */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Full Name" className="col-span-2"><input required name="full_name" defaultValue={editingLead.full_name || ""} className={INPUT} /></Field>
              <Field label="Age"><input type="number" name="age" defaultValue={editingLead.age || ""} className={INPUT} inputMode="numeric" /></Field>
              <Field label="Gender">
                <div className="relative">
                  <select name="gender" defaultValue={editingLead.gender || ""} className={SELECT}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
                </div>
              </Field>
            </div>

            {/* Contact Layout Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Phone *">
                <div className="flex gap-2">
                  <input required type="tel" name="phone" defaultValue={editingLead.phone || ""} className={`${INPUT} flex-1`} inputMode="tel" />
                  <label className="flex items-center gap-1.5 px-2.5 border rounded-lg bg-gray-50 dark:bg-gray-800 cursor-pointer shrink-0 border-gray-200 dark:border-gray-700 select-none">
                    <input 
                      key={`wa-${editingLead.id}`} 
                      type="checkbox" 
                      name="whatsapp_same"       
                      defaultChecked={Number(editingLead.whatsapp_same) === 1} 
                      className="w-4 h-4 text-green-600 rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" 
                    />
                    <span className="text-[10px] font-black text-green-600 uppercase tracking-wider ml-0.5">WA</span>
                  </label>
                </div>
              </Field>
              <Field label="Email"><input type="email" name="email" defaultValue={editingLead.email || ""} className={INPUT} inputMode="email" /></Field>
            </div>

            {/* Qualifications & Parent Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-2 bg-gray-50 dark:bg-gray-800/20 rounded-xl border border-gray-100 dark:border-gray-800/80 grid grid-cols-2 gap-2">
                <Field label="Qualification">
                  <input name="qualification" defaultValue={editingLead.qualification || ""} className={INPUT} />
                </Field>
                <Field label="Passing Year">
                  <input type="number" name="year_of_passing" defaultValue={editingLead.year_of_passing || ""} className={INPUT} inputMode="numeric" />
                </Field>
              </div>
              
              <div className="p-2 bg-blue-50/20 dark:bg-blue-950/10 rounded-xl border border-blue-100/50 dark:border-blue-900/20 grid grid-cols-2 gap-2">
                <Field label="Parent Name">
                  <input name="parent_name" defaultValue={editingLead.parent_name || ""} className={INPUT} />
                </Field>
                <Field label="Contact">
                  <input name="parent_contact" defaultValue={editingLead.parent_contact || ""} className={INPUT} inputMode="tel" />
                </Field>
              </div>
            </div>

            {/* Location Target City & Course Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="City"><input name="city" defaultValue={editingLead.city || ""} className={INPUT} /></Field>
              <Field label="Course">
                <div className="relative">
                  <select name="interested_course" defaultValue={editingLead.interested_course || ""} className={SELECT}>
                    <option value="">Select Course</option>
                    {localCourses.map((c) => (
                      <option key={c.id ?? c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
                </div>
              </Field>
            </div>

            {/* Attribution Meta Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Source">
                <div className="relative">
                  {/* 🎯 FIXED: Direct string prop token map renders full deck instantly */}
                  <select name="lead_source_id" defaultValue={editingLead.lead_source_id || ""} className={SELECT}>
                    <option value="">Select Source</option>
                    {sourceOptions.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
                </div>
              </Field>
              <Field label="Urgency">
                <div className="relative">
                  <select name="urgency" value={editUrgency} onChange={(e) => setEditUrgency(e.target.value)} className={SELECT}>
                    <option value="Just inquiring">Normal</option>
                    <option value="Within 1 month">Within 1 month</option>
                    <option value="Within 1 week">Within 1 week</option>
                    <option value="Immediate (pain)">Immediate</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
                </div>
              </Field>
              <Field label="Quality KPI">
                <div className="relative">
                  <select name="lead_quality" defaultValue={editingLead.lead_quality?.toLowerCase() || "unverified"} className={`${SELECT} font-bold`}>
                    <option value="unverified">🔍 Unverified</option>
                    <option value="hot">🔥 Hot</option>
                    <option value="warm">🌡️ Warm</option>
                    <option value="cold">❄️ Cold</option>
                    <option value="low">📉 Low Priority</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
                </div>
              </Field>
            </div>

            {/* Status Follow-up Flow Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t pt-3 border-gray-100 dark:border-gray-800">
              <Field label="Current Status">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select 
                      value={editStatus} 
                      onChange={(e) => setEditStatus(e.target.value)} 
                      name="lead_status"
                      className="px-3 py-1.5 text-xs rounded-lg border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 font-bold outline-none pr-8 appearance-none w-full cursor-pointer"
                    >
                      {STATUS_OPTIONS.filter((o) => o.value !== "all").map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-500"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
                  </div>

                  {isFollowUpStatus && (
                    <input 
                      type="date" 
                      name="next_follow_up_date" 
                      required 
                      value={followUpDate} 
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-1/2 px-3 py-1.5 text-xs rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900/50 text-orange-700 dark:text-orange-400 font-bold outline-none" 
                    />
                  )}
                </div>
              </Field>

              <Field label="Counselor Remarks">
                <textarea id="counselor_remarks_area" rows={3} name="counselor_remarks" defaultValue={editingLead.counselor_remarks || ""} className={`${INPUT} resize-none`} />
              </Field>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-400 cursor-pointer">Discard</button>
              <button type="submit" className="px-6 py-2 text-xs font-black text-white bg-blue-600 rounded-lg cursor-pointer">Save Update</button>
            </div>
          </form>

          {/* CHRONOLOGICAL HISTORIC ACTIVITY SIDEPANEL */}
          <div className="hidden md:block w-80 bg-gray-50/50 dark:bg-gray-950/20 overflow-y-auto border-l border-gray-100 dark:border-gray-800 shrink-0">
            {editingLead?.id && <ActivityLogsMini leadId={editingLead.id} />}
          </div>
        </div>
      </div>
    </div>
  );
});
EditLeadModal.displayName = 'EditLeadModal';