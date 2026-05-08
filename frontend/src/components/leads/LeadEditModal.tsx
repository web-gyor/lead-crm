import React from "react";
import {
  X,
  Zap,
  Phone,
  MessageCircle,
  Clock,
  Globe,
  Users,
  UserX,
} from "lucide-react";
import ActivityLogsMini from "../ActivityLogsMini";

const statusOptions = [
  { value: "New", label: "New" },
  { value: "Contacted", label: "Contacted" },
  { value: "Interested", label: "Interested" },
  { value: "Follow-up", label: "Follow-up" },
  { value: "Converted", label: "Won" },
  { value: "Lost", label: "Lost" },
  { value: "Not Interested", label: "Rejected" },
];

export default function LeadEditModal({
  editingLead,
  status,
  setStatus,
  sourceOptions = [],
  dbCourses = [],   // ✅ change here
  onClose,
  onSubmit,
}) {
  if (!editingLead) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="px-5 py-2.5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/30">
          <div>
            <h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2 uppercase tracking-tight">
              <div className="w-1.5 h-4 bg-blue-600 rounded-full" />Modify Student Profile
            </h2>
            <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mt-0.5">#{editingLead.id}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-red-50 hover:text-red-500 text-gray-400"><X size={18} /></button>
        </div>

        {/* MAIN CONTENT WRAPPER */}
        <div className="flex flex-col md:flex-row overflow-hidden h-full">
          
          {/* LEFT SIDE: FORM (Full Logic Restored) */}
         <form onSubmit={onSubmit} className="flex-1 px-5 py-4 overflow-y-auto space-y-4 border-r border-gray-100 dark:border-gray-800">
            
            {/* QUICK ACTION ENGINE */}
            <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                <Zap size={12} fill="currentColor" /> Quick Action Logs
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Connected', icon: <Phone size={10} />, color: 'bg-emerald-100 text-emerald-700', prefix: 'Called' },
                  { label: 'Not Reachable', icon: <Phone size={10} />, color: 'bg-red-50 text-red-600', prefix: 'Called' },
                  { label: 'Switched Off', icon: <Phone size={10} />, color: 'bg-gray-100 text-gray-600', prefix: 'Called' },
                  { label: "Wrong Number", icon: <UserX size={10} />,  color: "bg-purple-100 text-purple-700", prefix: "Tried"  },
                  { label: 'WA Sent', icon: <MessageCircle size={10} />, color: 'bg-green-100 text-green-700', prefix: 'WhatsApp' },
                  { label: 'Replied', icon: <MessageCircle size={10} />, color: 'bg-indigo-100 text-indigo-700', prefix: 'WhatsApp' },
                  { label: 'Budget Issue', icon: <Zap size={10} />, color: 'bg-amber-100 text-amber-700', prefix: 'Feedback' },
                  { label: 'Not Urgent', icon: <Clock size={10} />, color: 'bg-teal-100 text-teal-700', prefix: 'Timeline' },
                  { label: 'Location Issue', icon: <Globe size={10} />, color: 'bg-rose-100 text-rose-700', prefix: 'Feedback' },
                  { label: 'Parent Discuss', icon: <Users size={10} />, color: 'bg-purple-100 text-purple-700', prefix: 'Call/WA' },
                ].map((act) => (
                  <button key={act.label} type="button" 
                    onClick={() => {
                      const area: any = document.getElementById('counselor_remarks_area');
                      if (area) {
                        const timestamp = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short' });
                        area.value = `${timestamp}: ${act.prefix} - ${act.label}. \n${area.value}`;
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border border-transparent hover:scale-105 transition-all shadow-sm ${act.color}`}>
                    {act.icon} {act.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Field Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2 space-y-0.5"><label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full Name</label><input required name="full_name" defaultValue={editingLead.full_name || ''} className="w-full px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:bg-gray-800 outline-none" /></div>
              <div className="space-y-0.5"><label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Age</label><input type="number" name="age" defaultValue={editingLead.age || ''} className="w-full px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:bg-gray-800 outline-none" /></div>
              <div className="space-y-0.5"><label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Gender</label><select name="gender" defaultValue={editingLead.gender || ''} className="w-full px-2 py-1.5 text-sm rounded-md border border-gray-300 dark:bg-gray-800 outline-none"><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
            </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  
  {/* PHONE + WHATSAPP */}
  <div className="space-y-0.5">
    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
      Phone
    </label>

    <div className="flex gap-2">
      
      <input
        required
        type="tel"
        name="phone"
        defaultValue={editingLead.phone || ""}
        className="flex-1 px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:bg-gray-800 outline-none"
      />

      {/* FIXED CHECKBOX NAME */}
      <label className="flex items-center gap-1.5 px-2 border rounded bg-gray-50 dark:bg-gray-800 cursor-pointer">
        
        <input
          type="checkbox"
          name="whatsapp_same"
          defaultChecked={Number(editingLead.whatsapp_same) === 1}
          className="w-4 h-4 text-green-600 rounded"
        />

        <span className="text-[10px] font-bold text-green-600 uppercase">
          WA
        </span>
      </label>

    </div>
  </div>

  {/* EMAIL */}
  <div className="space-y-0.5">
    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
      Email
    </label>

    <input
      type="email"
      name="email"
      defaultValue={editingLead.email || ""}
      className="w-full px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:bg-gray-800 outline-none"
    />
  </div>

</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-2 bg-gray-50 dark:bg-gray-800/20 rounded-lg border border-gray-200 grid grid-cols-2 gap-2">
                <div className="space-y-0.5"><label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Qualification</label><input name="qualification" defaultValue={editingLead.qualification || ''} className="w-full px-2 py-1 text-sm rounded border border-gray-300 outline-none" /></div>
                <div className="space-y-0.5"><label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Passing Year</label><input type="number" name="year_of_passing" defaultValue={editingLead.year_of_passing || ''} className="w-full px-2 py-1 text-sm rounded border border-gray-300 outline-none" /></div>
              </div>
              <div className="p-2 bg-blue-50/50 dark:bg-gray-800/40 rounded-lg border border-blue-100 grid grid-cols-2 gap-2">
                <div className="space-y-0.5"><label className="text-[10px] font-black uppercase tracking-widest text-blue-600">Parent Name</label><input name="parent_name" defaultValue={editingLead.parent_name || ''} className="w-full px-2 py-1 text-sm rounded border border-blue-200 outline-none" /></div>
                <div className="space-y-0.5"><label className="text-[10px] font-black uppercase tracking-widest text-blue-600">Contact</label><input name="parent_contact" defaultValue={editingLead.parent_contact || ''} className="w-full px-2 py-1 text-sm rounded border border-blue-200 outline-none" /></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-0.5"><label className="text-[10px] font-black uppercase tracking-widest text-gray-400">City</label><input name="city" defaultValue={editingLead.city || ''} className="w-full px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:bg-gray-800 outline-none" /></div>
              <div className="space-y-0.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Course</label>
                <select name="interested_course" defaultValue={editingLead.interested_course || ''} className="w-full px-2 py-1.5 text-sm rounded-md border border-gray-300 dark:bg-gray-800 outline-none">
                  <option value="">Select Course</option>
                {dbCourses.map((c: any) => (
  <option key={c.id || c.name} value={c.name}>
    {c.name}
  </option>
))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-0.5"><label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Source</label><select name="lead_source_id" defaultValue={editingLead.lead_source_id} className="w-full px-2 py-1.5 text-sm rounded-md border border-gray-300 dark:bg-gray-800 outline-none"><option value="">Select</option>{sourceOptions.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div className="space-y-0.5"><label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Urgency</label>
              <select name="urgency" defaultValue={editingLead.urgency || 'Normal'} className="w-full px-2 py-1.5 text-sm rounded-md border border-gray-300 dark:bg-gray-800 outline-none">
     
  <option value="Immediate (pain)">Immediate </option>
  <option value="Within 1 week">Within 1 week</option>
  <option value="Within 1 month">Within 1 month</option>
  <option value="Just inquiring">Just inquiring</option>
</select>
              </div>
            
           <div className="space-y-0.5 col-span-2 md:col-span-1">
  <label className="text-[10px] font-black uppercase tracking-widest text-blue-600">
    Quality KPI
  </label>
  <select 
  name="lead_quality" 
  // Change the fallback to match uppercase "Unverified"
  defaultValue={editingLead.lead_quality || "Unverified"} 
  className="w-full px-2 py-1.5 text-sm rounded-md border border-gray-300 dark:bg-gray-800 font-bold outline-none"
>
  {/* ✅ values must match the database ENUM exactly */}
  <option value="Unverified">🔍 Unverified</option>
  <option value="Hot">🔥 Hot</option>
  <option value="Warm">🌡️ Warm</option>
  <option value="Cold">❄️ Cold</option>
  <option value="Low">📉 Low Priority</option>
</select>
</div>
  </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t pt-2.5 border-gray-100 dark:border-gray-800">
              <div className="space-y-0.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-blue-600">Current Status</label>
                <div className="flex gap-2">
                  <select name="lead_status" value={status} onChange={(e) => setStatus(e.target.value)}
                    className={`px-2 py-1 text-sm rounded-md border border-blue-200 bg-blue-50 text-blue-700 font-bold outline-none ${(status === "Follow-up") ? "w-1/2" : "w-full"}`}>
                    {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {(status === "Follow-up") && (
                    <input type="date" name="next_follow_up_date" required defaultValue={editingLead.next_follow_up_date ? new Date(editingLead.next_follow_up_date).toISOString().split('T')[0] : ''} className="w-1/2 px-2 py-1 text-sm rounded-md border border-orange-200 bg-orange-50 text-orange-700 font-bold outline-none" />
                  )}
                </div>
              </div>
              <div className="space-y-0.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Counselor Remarks</label>
                <textarea id="counselor_remarks_area" rows={2} name="counselor_remarks" defaultValue={editingLead.counselor_remarks || ''} className="w-full px-3 py-1 text-sm rounded-md border border-gray-300 dark:bg-gray-800 outline-none resize-none shadow-sm" />
              </div>
            </div>

            <div className="flex justify-end items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button type="button" onClick={onClose} className="px-4 py-1.5 text-xs font-bold text-gray-500 uppercase hover:bg-gray-100 rounded-md">Discard</button>
              <button type="submit" className="px-6 py-1.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-lg uppercase tracking-widest active:scale-95">Save Update</button>
            </div>
          </form>

          {/* RIGHT SIDE: ACTIVITY TIMELINE */}
          <div className="w-full md:w-80 bg-gray-50/50 dark:bg-gray-950/20 overflow-y-auto border-l border-gray-100 dark:border-gray-800">
            <ActivityLogsMini leadId={editingLead.id} />
          </div>

        </div>
      </div>
    </div>
  );
}