import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, Trash2, Edit3, X, Globe,
  CheckCircle2, AlertCircle, MapPin,
} from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../utils/api";
import toast from "react-hot-toast";
import DeleteModal from "../../components/DeleteModal";

// ─── Constants ────────────────────────────────────────────────────────────────

const REGION_COLORS = [
  "from-blue-500 to-blue-700",
  "from-indigo-500 to-indigo-700",
  "from-sky-500 to-sky-700",
  "from-slate-500 to-slate-700",
];

const countryColor = (name: string) =>
  REGION_COLORS[(name?.charCodeAt(0) ?? 0) % REGION_COLORS.length];

const INPUT_CLS =
  "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all dark:text-white";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Country {
  id: number;
  country_name: string;
  is_active: 0 | 1;
}

interface CountryForm {
  country_name: string;
  is_active: 0 | 1;
}

const INITIAL_FORM: CountryForm = { country_name: "", is_active: 1 };

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-0.5">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CountryMaster() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<CountryForm>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);

  // ── Data ──────────────────────────────────────────────────────────────────

const fetchCountries = useCallback(async (isSilent = false) => {
  if (!isSilent) setLoading(true);
  try {
    const res = await apiGet("/api/countries");
    
    // 1. Determine where the actual data is
    // If res is an array, use it. If res has a .data property, use that.
    const actualData = Array.isArray(res) ? res : (res?.data || []);
    
    // 2. Set the state
    setCountries(actualData);
    
  } catch (err) {
    console.error("Fetch Error:", err);
    toast.error("Failed to sync countries");
  } finally {
    setLoading(false);
  }
}, []);
  useEffect(() => { fetchCountries(); }, [fetchCountries]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const scrollToForm = () =>
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

  const handleEdit = (country: Country) => {
    setEditingId(country.id);
    setFormData({
      country_name: country.country_name ?? "",
      is_active: country.is_active ?? 1,
    });
    setShowForm(true);
    scrollToForm();
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setShowForm(false);
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);

  try {
    if (editingId) {
      // FIX: Changed URL from /api/countries/${editingId}/status to /api/countries/${editingId}
      await apiPut(`/api/countries/${editingId}`, {
        country_name: formData.country_name,
        is_active: formData.is_active
      });
      toast.success("Country updated successfully");
    } else {
      await apiPost("/api/countries", formData);
      toast.success("Country added successfully");
    }

    handleCancel();
    fetchCountries(true); // Refresh data silently
  } catch (err: any) {
    toast.error(err?.response?.data?.error || "Action failed");
  } finally {
    setSubmitting(false);
  }
};

  const toggleStatus = async (country: Country) => {
    const newStatus = country.is_active === 1 ? 0 : 1;
    try {
      await apiPut(`/api/countries/${country.id}/status`, {
        country_name: country.country_name,
        is_active: newStatus,
      });
      toast.success(newStatus ? "Region activated" : "Region deactivated");
      fetchCountries();
    } catch {
      toast.error("Status update failed");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await apiDelete(`/api/countries/${deleteId}`);
      toast.success("Region removed");
      fetchCountries();
      setDeleteId(null);
    } catch {
      toast.error("Delete failed — region may be linked to leads");
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = countries.filter((c) =>
      c.country_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: "Total", value: countries.length, icon: Globe, bg: "bg-gray-50 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-300", border: "border-gray-200 dark:border-gray-700" },
    { label: "Active", value: countries.filter((c) => c.is_active === 1).length, icon: CheckCircle2, bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
    { label: "Inactive", value: countries.filter((c) => c.is_active !== 1).length, icon: AlertCircle, bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-400", border: "border-red-200 dark:border-red-800" },
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
              <Globe size={16} className="text-white" />
            </span>
            Country Master
          </h1>
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">
            {countries.length} Global Regions · Distribution Network
          </p>
        </div>

        <button
          type="button"
          onClick={() => (editingId ? handleCancel() : setShowForm((v) => !v))}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 shrink-0"
        >
          {showForm && !editingId ? <X size={13} /> : <Plus size={13} />}
          {showForm && !editingId ? "Cancel" : "Add Region"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ label, value, icon: Icon, bg, text, border }) => (
          <div key={label} className={`flex items-center gap-2 sm:gap-2.5 px-3 py-2.5 rounded-xl border ${bg} ${border}`}>
            <Icon size={14} className={`${text} shrink-0`} />
            <div className="min-w-0">
              <p className={`text-sm font-black ${text}`}>{value}</p>
              <p className={`text-[9px] font-black uppercase tracking-widest ${text} opacity-70 truncate`}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Form Mobile */}
      {(showForm || editingId !== null) && (
        <div ref={formRef} className="lg:hidden">
          <CountryFormComp
            formData={formData}
            setFormData={setFormData}
            editingId={editingId}
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {/* Search */}
          <div className="relative">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search regions…"
              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all dark:text-white placeholder:text-gray-400 pr-8"
            />
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                    {["Region Name", "Status", ""].map((h) => (
                      <th key={h} className={`px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className="border-b border-gray-50 dark:border-gray-800">
                      <td colSpan={3} className="py-8 text-center animate-pulse text-gray-300 text-[10px] font-bold uppercase">Loading...</td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-16 text-center text-gray-400 text-[10px] font-bold uppercase">No regions found</td>
                    </tr>
                  ) : (
                    filtered.map((c, i) => (
                      <tr key={c.id} className="group border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${countryColor(c.country_name)} text-white flex items-center justify-center font-black text-sm uppercase shadow-sm shrink-0`}>
                              <MapPin size={14} />
                            </div>
                            <p className="text-[12px] font-black text-gray-900 dark:text-white uppercase truncate">{c.country_name}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => toggleStatus(c)}
                            className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border transition-all ${
                              c.is_active === 1
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800"
                                : "bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:border-red-800"
                            }`}
                          >
                            {c.is_active === 1 ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end items-center gap-1">
                            <button type="button" onClick={() => handleEdit(c)} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"><Edit3 size={14} /></button>
                            <button type="button" onClick={() => setDeleteId(c.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Desktop Form */}
        <div className="hidden lg:block lg:col-span-1">
          <div ref={formRef} className="sticky top-6">
            <CountryFormComp
              formData={formData}
              setFormData={setFormData}
              editingId={editingId}
              submitting={submitting}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              alwaysVisible
            />
          </div>
        </div>
      </div>

      <DeleteModal
        isOpen={deleteId !== null}
        title="Remove Region?"
        message="This will remove the country from distribution rules. Existing leads will remain in the database."
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

function CountryFormComp({ formData, setFormData, editingId, submitting, onSubmit, onCancel, alwaysVisible }: any) {
  const set = (patch: any) => setFormData({ ...formData, ...patch });

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-800 dark:text-white">
          {editingId ? "Edit Region" : "New Region"}
        </h2>
        {(editingId || !alwaysVisible) && (
          <button type="button" onClick={onCancel} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"><X size={14} /></button>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-3.5">
        <FormField label="Country Name *">
          <input
            required
            value={formData.country_name}
            onChange={(e) => set({ country_name: e.target.value })}
            className={INPUT_CLS}
            placeholder="e.g. United Arab Emirates"
          />
        </FormField>

        <FormField label="Status">
          <select
            value={formData.is_active}
            onChange={(e) => set({ is_active: Number(e.target.value) })}
            className={INPUT_CLS}
          >
            <option value={1}>Active</option>
            <option value={0}>Inactive</option>
          </select>
        </FormField>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
        >
          {submitting ? "Processing…" : editingId ? "Update Region" : "Save Region"}
        </button>
      </form>
    </div>
  );
}