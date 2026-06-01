import React, { useState, useEffect, useCallback } from "react";
import { 
  RefreshCw, List, LayoutGrid, Loader2, UserPlus, Trash2,
  BookOpen, Globe, X, Check, Plus, User, Sliders
} from "lucide-react";
import { apiGet, apiPut, apiPost, apiDelete } from "../../utils/api";
import { useToast } from "../../hooks/useToast";

// ─── MODAL SUB-COMPONENT ─────────────────────────────────────────────────────
function SpecializationModal({ title, items, selectedItems, onSave, onClose }) {
  const [tempSelected, setTempSelected] = useState(selectedItems || []);
  const toggleItem = (item) => { 
    setTempSelected(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]); 
  };
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2">
            {title === "Courses" ? <BookOpen size={14} /> : <Globe size={14} />} Edit {title}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
            <X size={18}/>
          </button>
        </div>
        <div className="p-6 max-h-[400px] overflow-y-auto grid grid-cols-1 gap-2">
          {items.map((item) => (
            <button 
              key={item} 
              type="button" 
              onClick={() => toggleItem(item)} 
              className={`flex items-center justify-between p-3 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                tempSelected.includes(item) 
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-400' 
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800/80 text-slate-500'
              }`}
            >
              <span>{item}</span>
              {tempSelected.includes(item) && <Check size={14} className="shrink-0" />}
            </button>
          ))}
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 tracking-wider cursor-pointer">Cancel</button>
          <button type="button" onClick={() => onSave(tempSelected)} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-sm">Apply Changes</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ENGINE VIEW PANEL ───────────────────────────────────────────────────
export default function LeadDistribution() {
  const { addToast } = useToast();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table');
  const [modalConfig, setModalConfig] = useState({ show: false, title: "", userId: null, field: "", current: [] });
  const [masterOptions, setMasterOptions] = useState({ courses: [], countries: [] });
  
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [selectedUserToPool, setSelectedUserToPool] = useState("");
  const [isAddingToPool, setIsAddingToPool] = useState(false);
const [deleteConfirm, setDeleteConfirm] = useState({ show: false, userId: null, userName: "" });
 const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      console.log("🚀 [ROUTING HUB]: Initiating isolated sync pass sequence...");

      // 🎯 FIXED PATHS: Aligned to root points to eliminate 404 errors
      const [rulesRes, coursesRes, countriesRes, eligibleRes] = await Promise.allSettled([
        apiGet("/api/distribution"),              // 👈 Points to router.get('/')
        apiGet("/api/courses"),
        apiGet("/api/countries"),
        apiGet("/api/distribution/eligible-users") // 👈 Points to router.get('/eligible-users')
      ]);

      // ── 1. PARSE ACTIVE POOL RULES ─────────────────────────────────────────
      if (rulesRes.status === "fulfilled" && rulesRes.value) {
        const val = rulesRes.value;
        const unpackedRules = Array.isArray(val) ? val : (val?.data || val?.rules || []);
        setRules(unpackedRules);
      }
      
      // ── 2. PARSE UNASSIGNED ELIGIBLE STAFF ──────────────────────────────────
      if (eligibleRes.status === "fulfilled" && eligibleRes.value) {
        const elData = eligibleRes.value;
        const unpackedEligible = Array.isArray(elData) ? elData : (elData?.data || elData?.users || []);
        setEligibleUsers(unpackedEligible);
      }

      // ── 3. PARSE COURSE DICTIONARIES ───────────────────────────────────────
      let cleanCourses = [];
      if (coursesRes.status === "fulfilled" && coursesRes.value) {
        const resValue = coursesRes.value;
        cleanCourses = (Array.isArray(resValue) ? resValue : (resValue?.data || [])).map((c) => c?.name || c);
      }
      
      // ── 4. PARSE COUNTRY GEOGRAPHIES ───────────────────────────────────────
      let cleanCountries = [];
      if (countriesRes.status === "fulfilled" && countriesRes.value) {
        const resValue = countriesRes.value;
        cleanCountries = (Array.isArray(resValue) ? resValue : (resValue?.data || [])).map((c) => c?.country_name || c?.name || c);
      }

      setMasterOptions({
        courses: cleanCourses.length ? cleanCourses : ["Data Engineering", "Business Management", "MERN Stack"],
        countries: cleanCountries.length ? cleanCountries : ["India", "UAE", "Saudi Arabia"]
      });

    } catch (err) {
      console.error("[REFRESH SEGMENT EXCEPTION]:", err);
   } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

const handleAddUserToPool = async () => {
    if (!selectedUserToPool) return addToast("Please select a counselor", "error");
    try {
      setIsAddingToPool(true);
      await apiPost("/api/distribution", { user_id: parseInt(selectedUserToPool, 10) });
      addToast("Counselor added to active lead distribution rules", "success");
      setSelectedUserToPool("");
      fetchAllData(); // Refresh grid layout context instantly
    } catch (err) {
      addToast("Failed to append counselor rule context to database row", "error");
    } finally {
      setIsAddingToPool(false);
    }
  };
const handleRemoveClick = (userId, userName) => {
    setDeleteConfirm({ show: true, userId, userName });
  };

  // 🎯 MODERN CONFIRMED EXECUTOR
  const handleRemoveFromPool = async () => {
    const { userId } = deleteConfirm;
    if (!userId) return;
    
    try {
      // 🎯 FIXED PATH: Adjusted from "/api/distribution/rules/..." to "/api/distribution/..."
      await apiDelete(`/api/distribution/${userId}`);
      addToast("Counselor removed from active distribution pool", "success");
      setDeleteConfirm({ show: false, userId: null, userName: "" });
      fetchAllData(); // Instantly re-sync and reload dropdown configurations
    } catch (err) {
      addToast("Failed to remove counselor row reference from database", "error");
    }
  };
 const handleUpdate = async (userId, field, value) => {
    setRules(prev => prev.map(r => r.user_id === userId ? { ...r, [field]: value } : r));
    try {
      await apiPut(`/api/distribution/${userId}`, { [field]: Array.isArray(value) ? JSON.stringify(value) : value });
      addToast("Routing criteria committed cleanly", "success");
    } catch (err) { 
      addToast("Failed to save configuration matrix", "error"); 
      fetchAllData(); 
    }
  };

  if (loading) {
    return (
      <div className="w-full py-20 flex flex-col items-center justify-center">
        <Loader2 size={24} className="text-blue-600 animate-spin mb-2" />
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Routing Matrices...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200">
      {modalConfig.show && (
        <SpecializationModal 
          title={modalConfig.title} 
          items={modalConfig.title === "Courses" ? masterOptions.courses : masterOptions.countries} 
          selectedItems={modalConfig.current} 
          onClose={() => setModalConfig({ ...modalConfig, show: false })}
          onSave={(selected) => { 
            if (modalConfig.userId) handleUpdate(modalConfig.userId, modalConfig.field, selected); 
            setModalConfig({ ...modalConfig, show: false }); 
          }}
        />
      )}

      {/* ─── CENTRALIZED DISTRIBUTION CONTROLS CARD ──────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none">
        
        {/* THE GATEWAY WHITELIST ADDER */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select 
            value={selectedUserToPool}
            onChange={(e) => setSelectedUserToPool(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider rounded-xl p-2.5 outline-none cursor-pointer min-w-[260px] text-slate-700 dark:text-slate-200 transition-all focus:border-blue-500/50"
          >
            <option value="">-- Select Counselor to Whitelist --</option>
            {eligibleUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.role || "Agent"})</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddUserToPool}
            disabled={isAddingToPool || !selectedUserToPool}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer shadow-xs"
          >
            <UserPlus size={13} /> Whitelist Agent
          </button>
        </div>

        {/* View Layout Mode Switchers */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/20">
            <button type="button" onClick={() => setViewMode('table')} className={`p-1.5 rounded-lg cursor-pointer transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-400'}`}><List size={15} /></button>
            <button type="button" onClick={() => setViewMode('cards')} className={`p-1.5 rounded-lg cursor-pointer transition-all ${viewMode === 'cards' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-400'}`}><LayoutGrid size={15} /></button>
          </div>
          <button type="button" onClick={fetchAllData} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-blue-600 cursor-pointer transition-colors shadow-2xs"><RefreshCw size={14} /></button>
        </div>
      </div>

      {/* Spreadsheet Table Mode Layout */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1100px] text-xs">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-[9px] font-bold uppercase text-slate-400 tracking-widest select-none">
                  <th className="px-6 py-3.5">Counselor Agent</th>
                  <th className="px-4 py-3.5">Assignment Mode</th>
                  <th className="px-4 py-3.5">Active Specializations</th>
                  <th className="px-4 py-3.5">Daily Capacity Limit</th>
                  <th className="px-4 py-3.5 text-center">Engine Toggle</th>
                  <th className="px-4 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-600 dark:text-slate-300">
                {rules.map((rule) => {
                  const courses = Array.isArray(rule.course_specialization) ? rule.course_specialization : [];
                  const countries = Array.isArray(rule.country_specialization) ? rule.country_specialization : [];
                  return (
                    <tr key={rule.user_id} className="hover:bg-blue-50/10 dark:hover:bg-blue-950/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-md">{rule.name?.[0]}</div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{rule.name}</p>
                            <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mt-0.5">{rule.role || "Counselor"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <select value={rule.assignment_mode || "round_robin"} onChange={(e) => handleUpdate(rule.user_id, 'assignment_mode', e.target.value)} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold uppercase py-1.5 px-2.5 outline-none cursor-pointer text-slate-700 dark:text-slate-300">
                          <option value="round_robin">Round Robin</option>
                          <option value="fixed">Fixed Quantity</option>
                          <option value="manual">Manual Mode</option>
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2 select-none">
                          <button type="button" onClick={() => setModalConfig({ show: true, title: "Courses", userId: rule.user_id, field: "course_specialization", current: courses })} className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-100/40 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl text-[10px] font-bold uppercase cursor-pointer"><BookOpen size={11} /> <span>{courses.length} Courses</span> <Plus size={10} /></button>
                          <button type="button" onClick={() => setModalConfig({ show: true, title: "Nations", userId: rule.user_id, field: "country_specialization", current: countries })} className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/40 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl text-[10px] font-bold uppercase cursor-pointer"><Globe size={11} /> <span>{countries.length} Nations</span> <Plus size={10} /></button>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <input type="number" value={rule.daily_limit ?? 0} onChange={(e) => handleUpdate(rule.user_id, 'daily_limit', Number(e.target.value))} className="w-16 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-center font-bold outline-none text-slate-800 dark:text-slate-200" />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button type="button" onClick={() => handleUpdate(rule.user_id, 'is_active', !rule.is_active)} className={`w-9 h-5 rounded-full relative mx-auto transition-all cursor-pointer ${rule.is_active ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${rule.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button 
                          type="button" 
                          onClick={() => handleRemoveClick(rule.user_id, rule.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                          title="Remove Counselor from Pool"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {rules.length === 0 && (
                  <tr><td colSpan={6} className="text-center p-8 text-[11px] text-slate-400 font-bold uppercase tracking-wider">No whitelisted dialing agents found in the rotation registry</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grid Card Mode Layout */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rules.map((rule) => {
            const courses = Array.isArray(rule.course_specialization) ? rule.course_specialization : [];
            const countries = Array.isArray(rule.country_specialization) ? rule.country_specialization : [];
            return (
              <div key={rule.user_id} className={`p-5 bg-white dark:bg-slate-900 rounded-3xl border transition-all ${rule.is_active ? 'border-slate-100 dark:border-slate-800' : 'border-slate-100 dark:border-slate-800/40 opacity-70'}`}>
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-50 dark:border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">{rule.name?.[0]}</div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate text-sm">{rule.name}</p>
                      <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mt-0.5">{rule.role || "Counselor"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={() => handleRemoveFromPool(rule.user_id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                      title="Remove from pool"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button type="button" onClick={() => handleUpdate(rule.user_id, 'is_active', !rule.is_active)} className={`w-9 h-5 rounded-full relative transition-all cursor-pointer shrink-0 ${rule.is_active ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${rule.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
                <div className="py-4 space-y-3 text-xs border-b border-slate-50 dark:border-slate-800/60">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Sliders size={12}/> Route Strategy</span>
                    <select value={rule.assignment_mode || "round_robin"} onChange={(e) => handleUpdate(rule.user_id, 'assignment_mode', e.target.value)} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold uppercase py-1 px-2.5 outline-none cursor-pointer text-slate-700 dark:text-slate-300">
                      <option value="round_robin">Round Robin</option>
                      <option value="fixed">Fixed Qty</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><User size={12}/> Capacity Limit</span>
                    <div className="flex items-center gap-2">
                      <input type="number" value={rule.daily_limit ?? 0} onChange={(e) => handleUpdate(rule.user_id, 'daily_limit', Number(e.target.value))} className="w-14 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-0.5 text-center font-bold outline-none text-xs text-slate-800 dark:text-slate-200" />
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Leads/day</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 flex items-center gap-2 select-none">
                  <button type="button" onClick={() => setModalConfig({ show: true, title: "Courses", userId: rule.user_id, field: "course_specialization", current: courses })} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer"><BookOpen size={12} /> <span>{courses.length} Courses</span></button>
                  <button type="button" onClick={() => setModalConfig({ show: true, title: "Nations", userId: rule.user_id, field: "country_specialization", current: countries })} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer"><Globe size={12} /> <span>{countries.length} Nations</span></button>
                </div>
              </div>
            );
          })}
        </div>
      )}


{/* ─── MODERN DESIGN SYSTEM CONFIRMATION OVERLAY MODAL ───────────────── */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4 transform animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/40 rounded-xl flex items-center justify-center shrink-0">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Revoke Allocation Node</h3>
                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mt-0.5">Confirm Agent De-whitelisting</p>
              </div>
            </div>
            
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-800 dark:text-slate-200">{deleteConfirm.userName}</strong> from the active lead distribution engine rotation list?
            </p>

            <div className="flex gap-2 pt-2 select-none">
              <button 
                type="button" 
                onClick={() => setDeleteConfirm({ show: false, userId: null, userName: "" })} 
                className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 border border-slate-200/40 dark:border-slate-700/60 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleRemoveFromPool} 
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer shadow-sm shadow-rose-600/10"
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}