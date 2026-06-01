import React, { useState, useEffect, useCallback, useMemo } from "react";
import { GraduationCap, BookOpen, CheckCircle2, AlertCircle, Plus, Edit3, Trash2, Tag, IndianRupee } from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../utils/api";

// 🎯 SWAPPED: Removed react-hot-toast for your unified application toast context hook
import { useToast } from "../../hooks/useToast";

import { MasterPageLayout } from "../../modules/master/layout/MasterPageLayout";
import { MasterHeader } from "../../modules/master/layout/MasterHeader";
import { StatsCard } from "../../modules/master/stats/StatsCard";
import { DataToolbar } from "../../modules/master/shared/DataToolbar";
import { EnterpriseTable } from "../../modules/master/table/EnterpriseTable";
import { SlideOverForm } from "../../modules/master/forms/SlideOverForm";
import { StatusBadge } from "../../modules/master/shared/StatusBadge";
import DeleteModal from "../../components/DeleteModal";

const ACCENT_GILL = ["from-blue-500 to-indigo-600", "from-purple-500 to-pink-600", "from-emerald-500 to-teal-600", "from-amber-500 to-orange-600"];
const courseGradient = (name: string) => ACCENT_GILL[(name?.charCodeAt(0) ?? 0) % ACCENT_GILL.length];

interface Course {
  id: number;
  name: string;
  code: string;
  fee: number | string;
  is_active: 0 | 1;
  program_category?: string;
}

interface CourseFormState {
  name: string;
  code: string;
  fee: string;
  is_active: 0 | 1;
  program_category: string;
}

const INITIAL_FORM: CourseFormState = { name: "", code: "", fee: "", is_active: 1, program_category: "Engineering" };

interface CoursesMasterProps {
  isNested?: boolean;
}

export default function CoursesMaster({ isNested = false }: CoursesMasterProps) {
  // 🎯 INJECT UNIFIED MODERN HOOK
  const { addToast } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<CourseFormState>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const fetchCourses = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await apiGet("/api/courses");
      setCourses(Array.isArray(data) ? data : []);
    } catch {
      // ⚡ UPDATED: Integrated standardized modern toast
      addToast("Failed to extract system course indices from pipeline", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const handleEdit = (course: Course) => {
    setEditingId(course.id);
    setFormData({
      name: course.name ?? "",
      code: course.code ?? "",
      fee: String(course.fee ?? ""),
      is_active: course.is_active ?? 1,
      program_category: course.program_category ?? "Engineering"
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
      const payload = {
        ...formData,
        fee: Number(formData.fee),
        is_active: Number(formData.is_active),
      };
      if (editingId) {
        await apiPut(`/api/courses/${editingId}`, payload);
        // ⚡ UPDATED: Integrated standardized modern toast
        addToast("Academic updated", "success");
      } else {
        await apiPost("/api/courses", payload);
        // ⚡ UPDATED: Integrated standardized modern toast
        addToast("New track program registered within network", "success");
      }
      handleCancel();
      fetchCourses(true);
    } catch (err: any) {
      // ⚡ UPDATED: Integrated standardized modern toast
      addToast(err?.response?.data?.error ?? "Schema rejection on input streams", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (course: Course) => {
    const newStatus = course.is_active === 1 ? 0 : 1;
    try {
      await apiPut(`/api/courses/${course.id}`, {
        name: course.name,
        code: course.code,
        fee: course.fee,
        is_active: newStatus,
      });
      // ⚡ UPDATED: Integrated standardized modern toast
      addToast(newStatus ? "Academic program initialized" : "Academic track deactivated", "success");
      fetchCourses(true);
    } catch {
      // ⚡ UPDATED: Integrated standardized modern toast
      addToast("State modifier framework communication drop", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await apiDelete(`/api/courses/${deleteId}`);
      // ⚡ UPDATED: Integrated standardized modern toast
      addToast("Academic ledger field destroyed cleanly", "success");
      fetchCourses();
      setDeleteId(null);
    } catch {
      // ⚡ UPDATED: Integrated standardized modern toast
      addToast("Integrity error—leads still bound to this curriculum signature", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    return courses.filter(
      (c) =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [courses, searchTerm]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, currentPage, rowsPerPage]);

  const totalPages = Math.max(Math.ceil(filtered.length / rowsPerPage), 1);

  const statsRow = (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatsCard label="Curriculum Entities" value={courses.length} icon={BookOpen} variant="neutral" />
      <StatsCard label="Active Portals" value={courses.filter(c => c.is_active === 1).length} icon={CheckCircle2} variant="success" />
      <StatsCard label="Suspended Semesters" value={courses.filter(c => c.is_active !== 1).length} icon={AlertCircle} variant="warning" />
    </div>
  );

  const tableColumns = [
    {
      header: "Academic Program Spec",
      accessor: (c: Course) => (
        <div className="flex items-center gap-3 select-none">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${courseGradient(c.name)} text-white flex items-center justify-center font-bold font-mono text-sm shadow-3xs shrink-0`}>
            {c.name?.charAt(0)}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 capitalize">{c.name?.toLowerCase()}</p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">{c.program_category || 'General Track'}</p>
          </div>
        </div>
      )
    },
    {
      header: "System Code",
      accessor: (c: Course) => (
        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase tracking-wider">
          {c.code || "—"}
        </span>
      )
    },
    {
      header: "Standard Enrollment Fee",
      accessor: (c: Course) => (
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
          ₹{Number(c.fee ?? 0).toLocaleString("en-IN")}
        </span>
      )
    },
    {
      header: "Status Flags",
      accessor: (c: Course) => (
        <span onClick={() => toggleStatus(c)} className="cursor-pointer">
          <StatusBadge isActive={c.is_active} />
        </span>
      )
    },
    {
      header: "",
      className: "text-right w-24",
      accessor: (c: Course) => (
        <div className="flex justify-end items-center gap-1">
          <button type="button" onClick={() => handleEdit(c)} className="p-1.5 text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"><Edit3 size={13} /></button>
          <button type="button" onClick={() => setDeleteId(c.id)} className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg cursor-pointer transition-colors"><Trash2 size={13} /></button>
        </div>
      )
    }
  ];

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
            <div className="h-48 flex items-center justify-center text-xs font-bold text-slate-400 uppercase tracking-widest">Hydrating program arrays...</div>
          ) : paginatedData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs font-bold text-slate-400 uppercase tracking-widest">No curriculum programs mapped</div>
          ) : (
            paginatedData.map((c) => {
              return (
                <div key={c.id} className="p-4 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl space-y-3 shadow-3xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${courseGradient(c.name)} text-white flex items-center justify-center font-bold font-mono text-xs shadow-xs shrink-0`}>
                        {c.name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white capitalize truncate leading-tight">{c.name?.toLowerCase()}</h4>
                        <p className="text-[9px] text-slate-400 font-medium uppercase mt-0.5 tracking-wider">{c.program_category || 'General Track'}</p>
                      </div>
                    </div>

                    <span onClick={() => toggleStatus(c)} className="cursor-pointer shrink-0 scale-90 origin-top-right">
                      <StatusBadge isActive={c.is_active} />
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[10px] font-semibold">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Tag size={11} className="text-slate-400 shrink-0" />
                      <span className="font-mono font-black uppercase text-[9px] bg-slate-100 dark:bg-slate-900 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-800">{c.code || '—'}</span>
                    </div>

                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 justify-end tabular-nums font-bold">
                      <IndianRupee size={10} className="shrink-0" />
                      <span>{Number(c.fee ?? 0).toLocaleString("en-IN")}</span>
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

      <SlideOverForm isOpen={showForm} onClose={handleCancel} title={editingId ? "Modify Course Profile Specifications" : "Register Novel Academic Program Structure"} onSubmit={handleSubmit} submitting={submitting}>
        <div className="space-y-4 text-xs font-semibold text-slate-800 dark:text-slate-200">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Full Program Denomination *</label>
            <input required type="text" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none" placeholder="e.g., Mern Stack Web Infrastructure Engineering" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">System Curriculum Code *</label>
            <input required type="text" value={formData.code} onChange={(e) => setFormData(p => ({ ...p, code: e.target.value.toUpperCase() }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none uppercase" placeholder="e.g., MSWIE" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Classification Group *</label>
            <select value={formData.program_category} onChange={(e) => setFormData(p => ({ ...p, program_category: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none cursor-pointer">
              <option value="Engineering">Engineering Trajectories</option>
              <option value="Management">Business Administration</option>
              <option value="Humanities">Liberal Arts Matrix</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tuition Fee Ledger (INR Value) *</label>
            <input required type="number" min="0" value={formData.fee} onChange={(e) => setFormData(p => ({ ...p, fee: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-emerald-600 dark:text-emerald-400" placeholder="0" />
          </div>
        </div>
      </SlideOverForm>

      <DeleteModal isOpen={deleteId !== null} title="Purge Program Track?" message="Deconstructs core class configuration arrays. Disassociates current lead historical tags." onClose={() => setDeleteId(null)} onConfirm={confirmDelete} isDeleting={isDeleting} />
    </>
  );

  // ─── NESTED DASHBOARD VIEW OVERRIDE ────────────────────────────────────────
  if (isNested) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-xl shadow-3xs select-none">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GraduationCap size={14} className="text-blue-600 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 hidden xs:inline shrink-0">Search Catalogue:</span>
            <input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
              placeholder="Filter courses..." 
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-lg cursor-pointer transition-all shadow-xs shrink-0"
          >
            <Plus size={11} strokeWidth={3} className="shrink-0" />
            <span className="hidden sm:inline">Add Course Program</span>
            <span className="inline sm:hidden">Add Course</span>
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
          title="Academic Program Management"
          description="Refine course matrices catalogs, currency fee standards, and programmatic codes."
          icon={GraduationCap}
          iconColorClass="bg-blue-600 dark:bg-blue-500"
          breadcrumbs={[{ label: "Centralized Directories" }, { label: "Program Catalogue", active: true }]}
          countText={`${courses.length} Schemes Mapped`}
          primaryActionLabel="Register Academic Track"
          onPrimaryAction={() => {
            setEditingId(null);
            setFormData(INITIAL_FORM);
            setShowForm(true);
          }}
          onRefresh={() => fetchCourses()}
          loading={loading}
        />
      }
      statsRow={statsRow}
      toolbar={
        <DataToolbar
          searchTerm={searchTerm}
          onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
          searchPlaceholder="Query course name or signature indices..."
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
          showFilter={false}
          showAddButton={false}
          filterComponent={
            <div className="flex flex-col gap-1.5 max-w-xs">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Classification Group</label>
              <select value={formData.program_category} onChange={(e) => setFormData(p => ({ ...p, program_category: e.target.value }))} className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl outline-none font-bold cursor-pointer appearance-none">
                <option value="Engineering">Engineering Trajectories</option>
                <option value="Management">Business Administration</option>
                <option value="Humanities">Liberal Arts Matrix</option>
              </select>
            </div>
          }
        />
      }
    >
      {coreTableContent}
    </MasterPageLayout>
  );
}