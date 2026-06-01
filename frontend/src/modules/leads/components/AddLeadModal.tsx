import React, { useState, useEffect } from 'react';
import { X, Plus, AlertTriangle } from 'lucide-react';
import { apiGet } from '../../../utils/api'; 

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void; 
  phone: string;
  handlePhoneChange: (val: string) => void;
  checkingPhone: boolean;
  duplicateLead: any;
  selectedCourse: string;
  setSelectedCourse: (val: string) => void;
  masterCourses: any[];
  sourceOptions: any[]; 
}

const INPUT = "w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none focus:border-blue-500 transition-colors font-medium";
const SELECT = "w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none focus:border-blue-500 transition-colors font-semibold appearance-none cursor-pointer";

const Field = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={`space-y-1 ${className}`}>
    <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider block">
      {label}
    </label>
    {children}
  </div>
);

export const AddLeadModal = React.memo(({
  isOpen,
  onClose,
  handleSubmit, 
  phone,
  handlePhoneChange,
  checkingPhone,
  duplicateLead,
  selectedCourse,
  setSelectedCourse,
  masterCourses = [],
  sourceOptions = []
}: AddLeadModalProps) => {

  const [localCourses, setLocalCourses] = useState<any[]>(masterCourses);

  // Dynamically load the course selection catalog from server layers on toggle open
  useEffect(() => {
    if (!isOpen) return;

    apiGet('/api/courses')
      .then((res: any) => {
        const raw = Array.isArray(res) ? res : (res?.data ?? res?.courses ?? []);
        if (raw.length > 0) setLocalCourses(raw);
      })
      .catch(() => setLocalCourses(masterCourses));
  }, [isOpen, masterCourses]);

  const handlePhoneInput = (inputVal: string) => {
    let cleanDigits = inputVal.replace(/\D/g, "").slice(0, 10);
    
    if (cleanDigits.length > 0 && !/^[6-9]/.test(cleanDigits)) {
      handlePhoneChange('');
      return;
    }
    
    handlePhoneChange(cleanDigits); 
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 sm:rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800/80 w-full sm:max-w-2xl max-h-[95vh] overflow-hidden flex flex-col rounded-t-2xl">
        
        <div className="sm:hidden flex justify-center pt-2 pb-0.5">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>

        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/20 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
            <h2 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-tight">Register New Student</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-gray-400 hover:text-rose-500 transition-all cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs font-semibold">
          
          {/* PROFILE ENTITY GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Full Name *" className="col-span-2">
              <input required type="text" name="full_name" placeholder="Enter full name" className={INPUT} />
            </Field>
            <Field label="Age">
              <input type="text" pattern="[0-9]*" name="age" placeholder="Age" className={INPUT} inputMode="numeric" />
            </Field>
            <Field label="Gender">
              <div className="relative">
                <select name="gender" className={SELECT}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
              </div>
            </Field>
          </div>

          {/* TELEPHONE GRID WITH SYSTEM LOG LABELS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Phone Number *">
              <div className="space-y-2">
                {duplicateLead && (
                  <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 px-3 py-1.5 rounded-lg text-xs animate-pulse">
                    <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                    <span className="text-rose-700 dark:text-rose-400 font-medium">
                      Already exists: <strong>{duplicateLead.full_name}</strong>
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      required
                      type="tel"
                      name="phone"
                      placeholder="10-digit mobile number"
                      value={phone}
                      maxLength={10}
                      onChange={(e) => handlePhoneInput(e.target.value)}
                      inputMode="tel"
                      className={`${INPUT} ${
                        duplicateLead ? "border-rose-500 ring-1 ring-rose-500/30 bg-rose-50/20" : ""
                      }`}
                    />

                    {checkingPhone && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  <label className="flex items-center gap-1.5 px-3 border rounded-lg bg-gray-50 dark:bg-gray-800 cursor-pointer border-gray-200 dark:border-gray-700 select-none">
                    <input type="checkbox" name="whatsapp_same" value="1" defaultChecked />
                    <span className="text-xs font-bold text-green-600">WA</span>
                  </label>
                </div>

                {phone.length > 0 && phone.length < 10 && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">Enter full 10-digit number</p>
                )}
              </div>
            </Field>

            <Field label="Email">
              <input type="email" name="email" placeholder="email@example.com" className={INPUT} inputMode="email" />
            </Field>
          </div>

          {/* ACADEMIC SNAPSHOT DECK */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-gray-50 dark:bg-gray-800/20 rounded-xl border border-gray-100 dark:border-gray-800/80">
            <Field label="Qualification" className="col-span-2">
              <input type="text" name="qualification" placeholder="e.g. Plus Two / Degree" className={INPUT} />
            </Field>
            <Field label="Passing Year">
              <input type="text" pattern="[0-9]*" name="year_of_passing" placeholder="YYYY" className={INPUT} inputMode="numeric" />
            </Field>
          </div>

          {/* PARENT DETAILS BLOCK */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/20 dark:bg-blue-950/10 rounded-xl border border-blue-100/50 dark:border-blue-900/20">
            <Field label="Parent Name">
              <input type="text" name="parent_name" placeholder="Father/Mother name" className={INPUT} />
            </Field>
            <Field label="Parent Contact">
              <input type="text" name="parent_contact" placeholder="Parent phone" className={INPUT} inputMode="tel" />
            </Field>
          </div>

          {/* ALLOCATION OPTIONS STRIPS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Target City">
              <input type="text" name="city" placeholder="Place" className={INPUT} />
            </Field>

            <Field label="Course Preference *">
              <div className="relative">
                {/* 🎯 FIXED: Stripped out the artificial 'Other' choice option & toggle strings */}
                <select required name="interested_course" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className={SELECT}>
                  <option value="">Select Course</option>
                  {localCourses.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
              </div>
            </Field>

            <Field label="Attribution Source *">
              <div className="relative">
                <select required name="lead_source_id" className={SELECT}>
                  <option value="">Select Source</option>
                  {sourceOptions.map((s) => (
                    <option key={String(s.id)} value={String(s.id)}>{s.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
              </div>
            </Field>

            <Field label="Urgency Metric">
              <div className="relative">
                <select name="urgency" defaultValue="Just inquiring" className={SELECT}>
                  <option value="Just inquiring">Normal</option>
                  <option value="Within 1 month">Within 1 month</option>
                  <option value="Within 1 week">Within 1 week</option>
                  <option value="Immediate (pain)">Immediate</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
              </div>
            </Field>
          </div>

          <Field label="Initial Guidance Log Remarks">
            <textarea rows={2} name="counselor_remarks" placeholder="Initial counseling notes…" className={`${INPUT} resize-none`} />
          </Field>

          <div className="flex justify-end items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button type="button" onClick={onClose} className="px-5 py-2 text-[10px] font-black uppercase text-gray-500 hover:text-gray-700 rounded-lg cursor-pointer">
              Discard
            </button>
            <button 
              type="submit" 
              disabled={Boolean(duplicateLead) || checkingPhone || phone.length !== 10}
              className={`px-8 py-2 text-[10px] font-black uppercase text-white rounded-lg transition-all cursor-pointer ${
                duplicateLead || phone.length !== 10 ? "bg-rose-500 opacity-60 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <Plus size={14} className="inline mr-1" /> 
              {checkingPhone ? "Verifying..." : "Create Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

AddLeadModal.displayName = 'AddLeadModal';