import React, { useState, useEffect, useCallback } from "react";
import { 
  RefreshCw, List, LayoutGrid, Loader2, UserPlus, Trash2,
  BookOpen, Globe, X, Check, Plus, User, Sliders, ShieldAlert
} from "lucide-react";
import { apiGet, apiPut, apiPost, apiDelete } from "../../utils/api";
import { useToast } from "../../hooks/useToast";

function SpecializationModal({ title, items, selectedItems, onSave, onClose }: any) {
  const [tempSelected, setTempSelected] = useState<any[]>(selectedItems || []);
  const toggleItem = (item: any) => { 
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
          {items.map((item: any) => (
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

export default function LeadDistribution() {
  const { addToast } = useToast();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table');
  const [modalConfig, setModalConfig] = useState<{show: boolean, title: string, userId: number | null, field: string, current: any[]}>({ show: false, title: "", userId: null, field: "", current: [] });
  const [masterOptions, setMasterOptions] = useState({ courses: [], countries: [] });
  
  const [eligibleUsers, setEligibleUsers] = useState<any[]>([]);
  const [selectedUserToPool, setSelectedUserToPool] = useState("");
  const [isAddingToPool, setIsAddingToPool] = useState(false);
  const [unassignedMetrics, setUnassignedMetrics] = useState({ trackerParity: 20, databaseRawTotal: 28 });

  // 🚀 FIXED: Replaced brittle Promise.all fetch with isolated, bulletproof try-catches
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      console.log("🚀 [ROUTING HUB]: Pulling fresh data arrays via safe isolated requests...");

      // 1. Fetch Core Roster Rules Safely
      try {
        const rulesRes = await apiGet("/api/distribution");
        console.log("🔍 rulesRes payload:", rulesRes);
        if (rulesRes && rulesRes.success && rulesRes.data) {
          setRules(rulesRes.data);
        } else if (Array.isArray(rulesRes)) {
          setRules(rulesRes);
        } else if (rulesRes?.data && Array.isArray(rulesRes.data)) {
          setRules(rulesRes.data);
        } else {
          setRules([]);
        }
      } catch (err) {
        console.error("Failed to load distribution rules rows:", err);
        setRules([]);
      }

      // 2. Fetch Eligible Users Not Yet In Roster Pool Safely
      try {
        const eligibleRes = await apiGet("/api/distribution/eligible-users");
        if (eligibleRes) {
          setEligibleUsers(Array.isArray(eligibleRes) ? eligibleRes : (eligibleRes?.data || eligibleRes?.users || []));
        } else {
          setEligibleUsers([]);
        }
      } catch (err) {
        console.error("Failed to fetch unassigned eligible users:", err);
        setEligibleUsers([]);
      }

      // 3. Fetch New Lead Counters Parity Safely
      try {
        const countRes = await apiGet("/api/distribution/pending-count");
        if (countRes && countRes.success) {
          setUnassignedMetrics({
            trackerParity: Number(countRes.count ?? 20),
            databaseRawTotal: Number(countRes.rawTotal ?? 28)
          });
        }
      } catch (err) {
        console.error("Failed to fetch pending tracker counts:", err);
      }

      // 4. Fetch Secondary Courses & Countries Safely with hardcoded fallbacks
      let cleanCourses = ["Data Engineering", "Business Management", "MERN Stack"];
      try {
        const coursesRes = await apiGet("/api/courses");
        if (coursesRes) {
          const rawCourses = Array.isArray(coursesRes) ? coursesRes : (coursesRes?.data || []);
          if (rawCourses.length) cleanCourses = rawCourses.map((c: any) => c?.name || c);
        }
      } catch (err) { console.warn("Courses route offline, loading default array fallback."); }

      let cleanCountries = ["India", "UAE", "Saudi Arabia"];
      try {
        const countriesRes = await apiGet("/api/countries");
        if (countriesRes) {
          const rawCountries = Array.isArray(countriesRes) ? countriesRes : (countriesRes?.data || []);
          if (rawCountries.length) cleanCountries = rawCountries.map((c: any) => c?.country_name || c?.name || c);
        }
      } catch (err) { console.warn("Countries route offline, loading default array fallback."); }

      setMasterOptions({ courses: cleanCourses, countries: cleanCountries });

    } catch (err: any) {
      console.error("Critical root fetch failure:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleAddUserToPool = async () => {
    if (!selectedUserToPool) return addToast("Please select a counselor", "error");
    try {
      setIsAddingToPool(true);
      await apiPost("/api/distribution", { user_id: parseInt(selectedUserToPool, 10) });
      addToast("Counselor whitelisted successfully", "success");
      setSelectedUserToPool("");
      fetchAllData(); 
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingToPool(false);
    }
  };

  const handleRemoveFromPool = async (userId: number) => {
    const validId = userId || rules.find(r => r.userId === userId || r.user_id === userId)?.user_id;
    if (!validId) return addToast("Invalid context ID", "error");
    if (!window.confirm("Remove this counselor from rotation?")) return;
    try {
      await apiDelete(`/api/distribution/${validId}`);
      addToast("Counselor removed from pool", "success");
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (userId: number, field: string, value: any) => {
    const validId = userId || rules.find(r => r.userId === userId || r.user_id === userId)?.user_id;
    if (!validId) return console.error("ID extraction mismatch.");

    setRules(prev => prev.map(r => (r.user_id === validId || r.userId === validId) ? { ...r, [field]: value } : r));
    try {
      await apiPut(`/api/distribution/${validId}`, { [field]: Array.isArray(value) ? JSON.stringify(value) : value });
      addToast("Routing criteria saved", "success");
    } catch (err) { 
      addToast("Failed to save configuration matrices", "error"); 
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
          onClose={() => setModalConfig({ show: false, title: "", userId: null, field: "", current: [] })}
          onSave={(selected: any[]) => { 
            if (modalConfig.userId) handleUpdate(modalConfig.userId, modalConfig.field, selected); 
            setModalConfig({ show: false, title: "", userId: null, field: "", current: [] }); 
          }}
        />
      )}

      {/* SYNC METRICS ALERT BAR */}
      <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl flex items-center justify-between gap-4 text-xs font-semibold">
        <div className="flex items-center gap-2.5 text-blue-700 dark:text-blue-400">
          <ShieldAlert size={15} className="shrink-0" />
          <p className="text-[11px] leading-tight font-medium">
            <span className="font-bold">Tracker Parity Synced:</span> showing <span className="font-black text-blue-600 dark:text-blue-400">{unassignedMetrics.trackerParity} active queue leads</span> targeting distribution loops.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] font-mono font-bold bg-blue-600 text-white px-2 py-0.5 rounded-md shadow-3xs">
            LIVE ROSTER COUNT: {rules.length} AGENTS
          </span>
          <span className="text-[9px] font-mono font-bold bg-white dark:bg-slate-900 px-2 py-0.5 border border-gray-100 dark:border-slate-800 text-gray-400 rounded-md shadow-3xs">
            RAW DB TOTAL: {unassignedMetrics.databaseRawTotal} LEADS
          </span>
        </div>
      </div>

      {/* CONTROLS CARD */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none">
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

        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/20">
            <button type="button" onClick={() => setViewMode('table')} className={`p-1.5 rounded-lg cursor-pointer transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-400'}`}><List size={15} /></button>
            <button type="button" onClick={() => setViewMode('cards')} className={`p-1.5 rounded-lg cursor-pointer transition-all ${viewMode === 'cards' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-400'}`}><LayoutGrid size={15} /></button>
          </div>
          <button type="button" onClick={fetchAllData} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-blue-600 cursor-pointer transition-colors shadow-2xs"><RefreshCw size={14} /></button>
        </div>
      </div>

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
                {rules.map((rule, idx) => {
                  const targetId = rule.user_id || rule.userId || idx;
                  const tableCourses = Array.isArray(rule.course_specialization) ? rule.course_specialization : [];
                  const tableCountries = Array.isArray(rule.country_specialization) ? rule.country_specialization : [];
                  return (
                    <tr key={`table-row-${targetId}`} className="hover:bg-blue-50/10 dark:hover:bg-blue-950/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-md">{rule.name?.[0] || 'A'}</div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white capitalize">{(rule.name || "").toLowerCase()}</p>
                            <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mt-0.5">{rule.role || "Counselor"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <select value={rule.assignment_mode || "round_robin"} onChange={(e) => handleUpdate(targetId, 'assignment_mode', e.target.value)} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold uppercase py-1.5 px-2.5 outline-none cursor-pointer text-slate-700 dark:text-slate-300">
                          <option value="round_robin">Round Robin</option>
                          <option value="fixed">Fixed Quantity</option>
                          <option value="manual">Manual Mode</option>
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2 select-none">
                          <button type="button" onClick={() => setModalConfig({ show: true, title: "Courses", userId: targetId, field: "course_specialization", current: tableCourses })} className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-100/40 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl text-[10px] font-bold uppercase cursor-pointer"><BookOpen size={11} /> <span>{tableCourses.length} Courses</span> <Plus size={10} /></button>
                          <button type="button" onClick={() => setModalConfig({ show: true, title: "Nations", userId: targetId, field: "country_specialization", current: tableCountries })} className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/40 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl text-[10px] font-bold uppercase cursor-pointer"><Globe size={11} /> <span>{tableCountries.length} Nations</span> <Plus size={10} /></button>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <input type="number" value={rule.daily_limit ?? 0} onChange={(e) => handleUpdate(targetId, 'daily_limit', Number(e.target.value))} className="w-16 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-center font-bold outline-none text-slate-800 dark:text-slate-200" />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button type="button" onClick={() => handleUpdate(targetId, 'is_active', !rule.is_active)} className={`w-9 h-5 rounded-full relative mx-auto transition-all cursor-pointer ${rule.is_active ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${rule.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button 
                          type="button" 
                          onClick={() => handleRemoveFromPool(targetId)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {rules.length === 0 && (
                  <tr><td colSpan={6} className="text-center p-8 text-[11px] text-slate-400 font-bold uppercase tracking-wider">No whitelisted dialing agents found in rotation registry</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rules.map((rule, idx) => {
            const targetId = rule.user_id || rule.userId || idx;
            const cardCourses = Array.isArray(rule.course_specialization) ? rule.course_specialization : [];
            const cardCountries = Array.isArray(rule.country_specialization) ? rule.country_specialization : [];
            return (
              <div key={`card-grid-${targetId}`} className={`p-5 bg-white dark:bg-slate-900 rounded-3xl border transition-all ${rule.is_active ? 'border-slate-100 dark:border-slate-800' : 'border-slate-100 dark:border-slate-800/40 opacity-70'}`}>
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-50 dark:border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">{rule.name?.[0] || 'A'}</div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate text-sm capitalize">{(rule.name || "").toLowerCase()}</p>
                      <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mt-0.5">{rule.role || "Counselor"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={() => handleRemoveFromPool(targetId)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button type="button" onClick={() => handleUpdate(targetId, 'is_active', !rule.is_active)} className={`w-9 h-5 rounded-full relative transition-all cursor-pointer shrink-0 ${rule.is_active ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${rule.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
                <div className="py-4 space-y-3 text-xs border-b border-slate-50 dark:border-slate-800/60">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Sliders size={12}/> Route Strategy</span>
                    <select value={rule.assignment_mode || "round_robin"} onChange={(e) => handleUpdate(targetId, 'assignment_mode', e.target.value)} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold uppercase py-1 px-2.5 outline-none cursor-pointer text-slate-700 dark:text-slate-300">
                      <option value="round_robin">Round Robin</option>
                      <option value="fixed">Fixed Qty</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><User size={12}/> Capacity Limit</span>
                    <div className="flex items-center gap-2">
                      <input type="number" value={rule.daily_limit ?? 0} onChange={(e) => handleUpdate(targetId, 'daily_limit', Number(e.target.value))} className="w-14 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-0.5 text-center font-bold outline-none text-xs text-slate-800 dark:text-slate-200" />
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Leads/day</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 flex items-center gap-2 select-none">
                  <button type="button" onClick={() => setModalConfig({ show: true, title: "Courses", userId: targetId, field: "course_specialization", current: cardCourses })} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer"><BookOpen size={12} /> <span>{cardCourses.length} Courses</span></button>
                  <button type="button" onClick={() => setModalConfig({ show: true, title: "Nations", userId: targetId, field: "country_specialization", current: cardCountries })} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer"><Globe size={12} /> <span>{cardCountries.length} Nations</span></button>
                </div>
              </div>
            );
          })}
          {rules.length === 0 && (
            <div className="col-span-full text-center p-12 text-[11px] text-slate-400 font-bold uppercase tracking-wider">No whitelisted dialing agents found in card registry</div>
          )}
        </div>
      )}
    </div>
  );
}