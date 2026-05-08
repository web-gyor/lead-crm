import { useState, useEffect, useCallback } from "react";
import { 
  Zap, RefreshCw, List, LayoutGrid, Loader2, 
  ShieldCheck, BookOpen, Globe, X, Check, Plus, Send 
} from "lucide-react";
import { apiGet, apiPut, apiPost } from "../utils/api";
import toast from "react-hot-toast";

// --- Modal Sub-Component (No changes needed here) ---
function SpecializationModal({ title, items, selectedItems, onSave, onClose }: any) {
  const [tempSelected, setTempSelected] = useState<string[]>(selectedItems || []);
  const toggleItem = (item: string) => {
    setTempSelected(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2">
            {title === "Courses" ? <BookOpen size={14} /> : <Globe size={14} />} Edit {title}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        <div className="p-6 max-h-[400px] overflow-y-auto grid grid-cols-1 gap-2">
          {items.map((item: string) => (
            <button key={item} onClick={() => toggleItem(item)} className={`flex items-center justify-between p-3 rounded-xl border text-[11px] font-bold transition-all ${tempSelected.includes(item) ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30' : 'bg-gray-50 border-gray-100 text-gray-500 dark:bg-gray-800'}`}>
              {item} {tempSelected.includes(item) && <Check size={14} />}
            </button>
          ))}
          {items.length === 0 && <p className="text-center py-4 text-[10px] font-bold text-gray-400 uppercase">No master data found</p>}
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-[10px] font-black uppercase text-gray-500">Cancel</button>
          <button onClick={() => onSave(tempSelected)} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">Apply Changes</button>
        </div>
      </div>
    </div>
  );
}

export default function LeadDistribution() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [distributing, setDistributing] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [pendingCount, setPendingCount] = useState(0);
  const [modalConfig, setModalConfig] = useState<any>({ show: false, title: "", userId: null, field: "", current: [] });

  // ─── DYNAMIC MASTERS STATE ───
  const [masterOptions, setMasterOptions] = useState<{ courses: string[], countries: string[] }>({
    courses: [],
    countries: []
  });

  // ─── SYNC LOGIC (Unified Fetch) ───
  const fetchAllData = useCallback(async () => {
  try {
    setLoading(true);
    const [rulesData, pendingData, coursesRes, countriesRes] = await Promise.all([
      apiGet("/api/distribution/rules"),
      apiGet("/api/distribution/pending-count"),
      apiGet("/api/courses"),
      apiGet("/api/countries")
    ]);

    // --- FILTER LOGIC ---
    // This removes 'Shaji' and any other user whose role is 'Manager'
    const counselorOnlyRules = Array.isArray(rulesData) 
      ? rulesData.filter((r: any) => r.role !== "Manager") 
      : [];

    setRules(counselorOnlyRules);
    setPendingCount(pendingData?.count || 0);

    const courses = Array.isArray(coursesRes) ? coursesRes.map((c: any) => c.name) : [];
    const countries = Array.isArray(countriesRes?.data) ? countriesRes.data.map((c: any) => c.country_name) : [];
    
    setMasterOptions({ courses, countries });

  } catch (err) {
    toast.error("Critical Sync Failure");
  } finally {
    setLoading(false);
  }
}, []);
  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  const handleUpdate = async (userId: number, field: string, value: any) => {
    setRules(prev => prev.map(r => r.user_id === userId ? { ...r, [field]: value } : r));
    try {
      await apiPut(`/api/distribution/rules/${userId}`, { [field]: Array.isArray(value) ? JSON.stringify(value) : value });
      toast.success("Saved", { id: 'dist-save' });
    } catch (err) { toast.error("Failed"); fetchAllData(); }
  };

  const handleDistribute = async () => {
    try {
      setDistributing(true);
      const res = await apiPost("/api/distribution/run-pending", {}); 
      if (res.success) {
        toast.success(`Engine processed ${res.count} leads!`);
        fetchAllData(); 
      }
    } catch (err: any) {
      toast.error("Distribution route failed");
    } finally {
      setDistributing(false);
    }
  };

  if (loading) return <div className="p-20 text-center font-black text-gray-400 animate-pulse uppercase tracking-widest">Syncing Distribution Matrix...</div>;

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      {modalConfig.show && (
        <SpecializationModal 
          title={modalConfig.title}
          // --- Now using Dynamic Options ---
          items={modalConfig.title === "Courses" ? masterOptions.courses : masterOptions.countries}
          selectedItems={modalConfig.current}
          onClose={() => setModalConfig({ ...modalConfig, show: false })}
          onSave={(selected: any) => {
            if (modalConfig.userId) handleUpdate(modalConfig.userId, modalConfig.field, selected);
            setModalConfig({ ...modalConfig, show: false });
          }}
        />
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="text-amber-500" fill="currentColor" /> Lead Distribution
          </h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Assignment Engine Powered by Master Data</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleDistribute}
            disabled={distributing || pendingCount === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-lg
              ${pendingCount > 0 ? 'bg-blue-600 text-white shadow-blue-600/20 hover:scale-105' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'}`}
          >
            {distributing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} className={pendingCount > 0 ? "animate-bounce" : ""} />}
            {pendingCount > 0 ? `Distribute ${pendingCount} Leads` : "No Pending Leads"}
          </button>

          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}><List size={18} /></button>
            <button onClick={() => setViewMode('cards')} className={`p-2 rounded-lg ${viewMode === 'cards' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}><LayoutGrid size={18} /></button>
          </div>

          <button onClick={fetchAllData} className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 hover:text-blue-600 active:rotate-180 transition-all"><RefreshCw size={18} /></button>
        </div>
      </div>

      {/* ── Table View ── */}
      <div className={`${viewMode === 'table' ? 'hidden lg:block' : 'hidden'} bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1100px]">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Counselor</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Mode</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Specialization</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Daily Limit</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Engine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {rules.map((rule) => {
                   const courses = typeof rule.course_specialization === 'string' ? JSON.parse(rule.course_specialization) : (rule.course_specialization || []);
                   const countries = typeof rule.country_specialization === 'string' ? JSON.parse(rule.country_specialization) : (rule.country_specialization || []);
                   return (
                  <tr key={rule.user_id} className="hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-600/20">{rule.name?.[0]}</div>
                        <div><p className="text-xs font-bold text-gray-900 dark:text-white">{rule.name}</p><p className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">{rule.role}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <select value={rule.assignment_mode || "round_robin"} onChange={(e) => handleUpdate(rule.user_id, 'assignment_mode', e.target.value)} className="bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-[10px] font-black uppercase p-2 focus:ring-1 focus:ring-blue-500 outline-none">
                        <option value="round_robin">Round Robin</option>
                        <option value="fixed">Fixed Quantity</option>
                        <option value="manual">Manual Mode</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => setModalConfig({ show: true, title: "Courses", userId: rule.user_id, field: "course_specialization", current: courses })} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 text-blue-700 hover:bg-blue-100 transition-all text-[10px] font-black uppercase">
                          <BookOpen size={12} /> {courses.length} Courses <Plus size={10} className="ml-0.5" />
                        </button>
                        <button onClick={() => setModalConfig({ show: true, title: "Nations", userId: rule.user_id, field: "country_specialization", current: countries })} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 text-emerald-700 hover:bg-emerald-100 transition-all text-[10px] font-black uppercase">
                          <Globe size={12} /> {countries.length} Nations <Plus size={10} className="ml-0.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <input type="number" value={rule.daily_limit ?? 0} onChange={(e) => handleUpdate(rule.user_id, 'daily_limit', Number(e.target.value))} className="w-16 bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1.5 text-[11px] font-black outline-none focus:ring-1 focus:ring-blue-500" />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button onClick={() => handleUpdate(rule.user_id, 'is_active', !rule.is_active)} className={`w-10 h-5 rounded-full relative mx-auto transition-all ${rule.is_active ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-gray-200 dark:bg-gray-700'}`}>
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${rule.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
      </div>

      {/* ── Card View ── */}
      <div className={`${viewMode === 'cards' ? 'grid' : 'grid lg:hidden'} grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10`}>
        {rules.map((rule) => {
          const courses = typeof rule.course_specialization === 'string' ? JSON.parse(rule.course_specialization) : (rule.course_specialization || []);
          const countries = typeof rule.country_specialization === 'string' ? JSON.parse(rule.country_specialization) : (rule.country_specialization || []);
          return (
            <div key={rule.user_id} className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-600/20">{rule.name?.[0]}</div>
                  <div><h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase">{rule.name}</h3><p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{rule.role}</p></div>
                </div>
                <button onClick={() => handleUpdate(rule.user_id, 'is_active', !rule.is_active)} className={`w-10 h-5 rounded-full relative transition-all ${rule.is_active ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${rule.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setModalConfig({ show: true, title: "Courses", userId: rule.user_id, field: "course_specialization", current: courses })} className="flex items-center justify-between px-4 py-3 bg-blue-50/30 dark:bg-blue-900/10 rounded-xl border border-blue-100/50 hover:bg-blue-50 transition-all">
                  <div className="flex items-center gap-2"><BookOpen size={14} className="text-blue-600" /><span className="text-[10px] font-black uppercase text-blue-700">Course</span></div>
                  <div className="bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded text-[9px] font-black text-blue-700 dark:text-blue-300">{courses.length}</div>
                </button>
                <button onClick={() => setModalConfig({ show: true, title: "Nations", userId: rule.user_id, field: "country_specialization", current: countries })} className="flex items-center justify-between px-4 py-3 bg-emerald-50/30 dark:bg-emerald-900/10 rounded-xl border border-emerald-100/50 hover:bg-emerald-50 transition-all">
                  <div className="flex items-center gap-2"><Globe size={14} className="text-emerald-600" /><span className="text-[10px] font-black uppercase text-emerald-700">Country</span></div>
                  <div className="bg-emerald-100 dark:bg-emerald-800 px-1.5 py-0.5 rounded text-[9px] font-black text-emerald-700 dark:text-emerald-300">{countries.length}</div>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50 dark:border-gray-800">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Zap size={8} /> Mode</label>
                  <select value={rule.assignment_mode || "round_robin"} onChange={(e) => handleUpdate(rule.user_id, 'assignment_mode', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-2 text-[10px] font-black uppercase border-none outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="round_robin">Round Robin</option>
                    <option value="fixed">Fixed</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><ShieldCheck size={8} /> Limit</label>
                  <input type="number" value={rule.daily_limit ?? 0} onChange={(e) => handleUpdate(rule.user_id, 'daily_limit', Number(e.target.value))} className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-2 text-[11px] font-black focus:ring-1 focus:ring-blue-500 outline-none border-none" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}