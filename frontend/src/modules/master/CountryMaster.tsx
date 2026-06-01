import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Globe, CheckCircle2, AlertCircle, MapPin, Plus, Edit3, Trash2, ShieldAlert, Layers } from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../utils/api";

// 🎯 SWAPPED: Removed react-hot-toast for your unified application design toast hook
import { useToast } from "../../hooks/useToast";

import { MasterPageLayout } from "../../modules/master/layout/MasterPageLayout";
import { MasterHeader } from "../../modules/master/layout/MasterHeader";
import { StatsCard } from "../../modules/master/stats/StatsCard";
import { DataToolbar } from "../../modules/master/shared/DataToolbar";
import { EnterpriseTable } from "../../modules/master/table/EnterpriseTable";
import { SlideOverForm } from "../../modules/master/forms/SlideOverForm";
import { StatusBadge } from "../../modules/master/shared/StatusBadge";
import DeleteModal from "../../components/DeleteModal";

const REGION_COLORS = ["from-blue-500 to-blue-600", "from-indigo-500 to-indigo-600", "from-sky-500 to-sky-600", "from-slate-500 to-slate-600"];
const countryGradient = (name: string) => REGION_COLORS[(name?.charCodeAt(0) ?? 0) % REGION_COLORS.length];

interface Country {
  id: number;
  country_name: string;
  is_active: 0 | 1;
  region_group?: string;
  visa_difficulty?: string;
}

interface CountryFormState {
  country_name: string;
  is_active: 0 | 1;
  region_group: string;
  visa_difficulty: string;
}

const INITIAL_FORM: CountryFormState = { country_name: "", is_active: 1, region_group: "EMEA", visa_difficulty: "Medium" };

interface CountryMasterProps {
  isNested?: boolean;
}

export default function CountryMaster({ isNested = false }: CountryMasterProps) {
  // 🎯 INJECT UNIFIED MODERN HOOK
  const { addToast } = useToast();

  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<CountryFormState>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const fetchCountries = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await apiGet("/api/countries");
      const actualData = Array.isArray(res) ? res : (res?.data || []);
      setCountries(actualData);
    } catch (err) {
      console.error("Fetch Error:", err);
      // ⚡ UPDATED: Integrated standardized modern toast
      addToast("Failed to sync countries with registry cluster", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchCountries(); }, [fetchCountries]);

  const handleEdit = (country: Country) => {
    setEditingId(country.id);
    setFormData({
      country_name: country.country_name ?? "",
      is_active: country.is_active ?? 1,
      region_group: country.region_group ?? "EMEA",
      visa_difficulty: country.visa_difficulty ?? "Medium"
    });
    setShowForm(true);
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
        await apiPut(`/api/countries/${editingId}`, formData);
        // ⚡ UPDATED: Integrated standardized modern toast
        addToast("Destination updated", "success");
      } else {
        await apiPost("/api/countries", formData);
        // ⚡ UPDATED: Integrated standardized modern toast
        addToast("New regional pipeline destination established", "success");
      }
      handleCancel();
      fetchCountries(true);
    } catch (err: any) {
      // ⚡ UPDATED: Integrated standardized modern toast
      addToast(err?.response?.data?.error || "Transaction tracking signature rejected", "error");
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
      // ⚡ UPDATED: Integrated standardized modern toast
      addToast(newStatus ? "Destination activated" : "Destination suspended", "success");
      fetchCountries(true);
    } catch {
      // ⚡ UPDATED: Integrated standardized modern toast
      addToast("Cluster synchronization fault on field mutation", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await apiDelete(`/api/countries/${deleteId}`);
      // ⚡ UPDATED: Integrated standardized modern toast
      addToast("Destination purged from configuration profiles", "success");
      fetchCountries();
      setDeleteId(null);
    } catch {
      // ⚡ UPDATED: Integrated standardized modern toast
      addToast("Security constraints restrict deletion—active universities mapped here", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    return countries.filter((c) =>
      c.country_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [countries, searchTerm]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, currentPage, rowsPerPage]);

  const totalPages = Math.max(Math.ceil(filtered.length / rowsPerPage), 1);

  const statsRow = (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatsCard label="Total Nodes Registered" value={countries.length} icon={Globe} variant="neutral" />
      <StatsCard label="Active Destinations" value={countries.filter(c => c.is_active === 1).length} icon={CheckCircle2} variant="success" />
      <StatsCard label="Decommissioned" value={countries.filter(c => c.is_active !== 1).length} icon={AlertCircle} variant="warning" />
    </div>
  );

  const tableColumns = [
    {
      header: "Country Profile Node",
      accessor: (c: Country) => (
        <div className="flex items-center gap-3 select-none">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${countryGradient(c.country_name)} text-white flex items-center justify-center font-bold shadow-3xs shrink-0`}>
            <MapPin size={13} className="stroke-[2.5]" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 capitalize">{c.country_name?.toLowerCase()}</p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">{c.region_group || 'EMEA Axis'}</p>
          </div>
        </div>
      )
    },
    {
      header: "Visa Threshold",
      accessor: (c: Country) => (
        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider">
          {c.visa_difficulty || 'Medium'}
        </span>
      )
    },
    {
      header: "Operational Pipeline State",
      accessor: (c: Country) => (
        <span onClick={() => toggleStatus(c)} className="cursor-pointer">
          <StatusBadge isActive={c.is_active} />
        </span>
      )
    },
    {
      header: "",
      className: "text-right w-24",
      accessor: (c: Country) => (
        <div className="flex justify-end items-center gap-1">
          <button type="button" onClick={() => handleEdit(c)} className="p-1.5 text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"><Edit3 size={13} /></button>
          <button type="button" onClick={() => setDeleteId(c.id)} className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg cursor-pointer transition-colors"><Trash2 size={13} /></button>
        </div>
      )
    }
  ];

  const filterComponent = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Continent Axis / Grouping</label>
        <select value={formData.region_group} onChange={(e) => setFormData(p => ({ ...p, region_group: e.target.value }))} className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none cursor-pointer">
          <option value="EMEA">EMEA Network Channel</option>
          <option value="APAC">APAC Trade Matrix</option>
          <option value="AMER">AMER Pipeline Route</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Visa Processing Weight</label>
        <select value={formData.visa_difficulty} onChange={(e) => setFormData(p => ({ ...p, visa_difficulty: e.target.value }))} className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none cursor-pointer">
          <option value="Low">Low Friction</option>
          <option value="Medium">Standard Metric Balance</option>
          <option value="High">High Review Protocol</option>
        </select>
      </div>
    </div>
  );

  const coreTableContent = (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-3xs overflow-hidden min-h-[560px] flex flex-col justify-between [&_th]:text-[10px] [&_th]:tracking-wider [&_th]:font-black [&_th]:uppercase">
        
        {/* 💻 DESKTOP COMPLIANT DATA GRID DIRECTORY */}
        <div className="hidden md:block w-full overflow-x-auto">
          <EnterpriseTable
            data={paginatedData}
            columns={tableColumns}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={filtered.length}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={(r) => { setRowsPerPage(r); setCurrentPage(1); }}
          />
        </div>

        {/* 📱 MOBILE RESPONSIVE CARD VIEW DECK WRAPPER */}
        <div className="block md:hidden w-full p-3 space-y-3 flex-1 overflow-y-auto">
          {loading ? (
            <div className="h-48 flex items-center justify-center text-xs font-bold text-slate-400 uppercase tracking-widest">Hydrating regional nodes...</div>
          ) : paginatedData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs font-bold text-slate-400 uppercase tracking-widest">No territory destinations mapped</div>
          ) : (
            paginatedData.map((c) => {
              return (
                <div key={c.id} className="p-4 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl space-y-3 shadow-3xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${countryGradient(c.country_name)} text-white flex items-center justify-center font-bold shadow-xs shrink-0`}>
                        <MapPin size={12} className="stroke-[2.5]" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white capitalize truncate leading-tight">{c.country_name?.toLowerCase()}</h4>
                        <p className="text-[9px] text-slate-400 font-medium uppercase mt-0.5 tracking-wider">{c.region_group || 'EMEA Axis'}</p>
                      </div>
                    </div>

                    <span onClick={() => toggleStatus(c)} className="cursor-pointer shrink-0 scale-90 origin-top-right">
                      <StatusBadge isActive={c.is_active} />
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[10px] font-semibold">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Layers size={11} className="text-slate-400 shrink-0" />
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Visa Friction:</span>
                    </div>

                    <div className="flex items-center justify-end">
                      <span className="text-[9px] font-mono font-black uppercase bg-slate-100 dark:bg-slate-900 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-800 text-slate-500 tracking-wider">
                        {c.visa_difficulty || 'Medium'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-dashed border-slate-200/60 dark:border-slate-800/60">
                    <button type="button" onClick={() => handleEdit(c)} className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-black uppercase text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 rounded-md cursor-pointer transition-colors">
                      <Edit3 size={10} /> <span>Modify</span>
                    </button>
                    <button type="button" onClick={() => setDeleteId(c.id)} className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-black uppercase text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer transition-colors">
                      <Trash2 size={10} /> <span>Purge</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <SlideOverForm 
        isOpen={showForm} 
        onClose={handleCancel} 
        title={editingId ? "Modify Target Region Parameters" : "Establish Regional Network Route"} 
        onSubmit={handleSubmit} 
        submitting={submitting}
      >
        <div className="space-y-4 text-xs font-semibold text-slate-800 dark:text-slate-200">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Geopolitical Label *</label>
            <input required type="text" value={formData.country_name} onChange={(e) => setFormData(p => ({ ...p, country_name: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none" placeholder="e.g., United Kingdom" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Continent Region Axis *</label>
            <select value={formData.region_group} onChange={(e) => setFormData(p => ({ ...p, region_group: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none cursor-pointer">
              <option value="EMEA">EMEA Network Channel</option>
              <option value="APAC">APAC Trade Matrix</option>
              <option value="AMER">AMER Pipeline Route</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Visa Processing weight *</label>
            <select value={formData.visa_difficulty} onChange={(e) => setFormData(p => ({ ...p, visa_difficulty: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none cursor-pointer">
              <option value="Low">Low Friction</option>
              <option value="Medium">Standard Metric Balance</option>
              <option value="High">High Review Protocol</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Registry Operation Mode</label>
            <select value={formData.is_active} onChange={(e) => setFormData(p => ({ ...p, is_active: Number(e.target.value) as 0 | 1 }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none cursor-pointer">
              <option value={1}>Operational / Active</option>
              <option value={0}>Suspended / Inactive</option>
            </select>
          </div>
        </div>
      </SlideOverForm>

      <DeleteModal isOpen={deleteId !== null} title="Purge Destination Record?" message="This drops the geopolitical region configuration parameter from active matching rule clusters." onClose={() => setDeleteId(null)} onConfirm={confirmDelete} isDeleting={isDeleting} />
    </>
  );

  // ─── NESTED DASHBOARD VIEW OVERRIDE ────────────────────────────────────────
  if (isNested) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-xl shadow-3xs select-none">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Globe size={14} className="text-indigo-600 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 hidden xs:inline shrink-0">Search Registry:</span>
            <input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
              placeholder="Filter regions..." 
              className="bg-transparent text-xs font-bold outline-none text-slate-700 dark:text-slate-300 w-full max-w-[140px] sm:max-w-[220px] border-none p-0 focus:ring-0 min-w-0"
            />
          </div>
          
          <button 
            type="button" 
            onClick={() => {
              setEditingId(null);
              setFormData(INITIAL_FORM);
              setShowForm(true);
            }} 
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-lg cursor-pointer transition-all shadow-xs shrink-0"
          >
            <Plus size={11} strokeWidth={3} className="shrink-0" />
            <span className="hidden sm:inline">Add Country Node</span>
            <span className="inline sm:hidden">Add Country</span>
          </button>
        </div>

        {coreTableContent}
      </div>
    );
  }

  // ─── STANDALONE INDEPENDENT FULL-PAGE ROUTE VIEW ─────────────────────────
  return (
    <MasterPageLayout
      header={
        <MasterHeader
          title="Global Destinations"
          description="Manage geopolitical territory channels and academic visas metrics configurations."
          icon={Globe}
          iconColorClass="bg-indigo-600 dark:bg-indigo-500"
          breadcrumbs={[{ label: "Configuration Console" }, { label: "Global Destinations", active: true }]}
          countText={`${countries.length} Regions Anchored`}
          primaryActionLabel="Add Destination Network"
          onPrimaryAction={() => {
            setEditingId(null);
            setFormData(INITIAL_FORM);
            setShowForm(true);
          }}
          onRefresh={() => fetchCountries()}
          loading={loading}
        />
      }
      statsRow={statsRow}
      toolbar={
        <DataToolbar
          searchTerm={searchTerm}
          onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
          searchPlaceholder="Query regions index track..."
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
          showFilter={false}
          showAddButton={false}
          filterComponent={filterComponent}
        />
      }
    >
      {coreTableContent}
    </MasterPageLayout>
  );
}