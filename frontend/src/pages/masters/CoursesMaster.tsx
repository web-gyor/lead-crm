// src/pages/master/CoursesMaster.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, Trash2, Edit3, X, BookOpen,
  GraduationCap, CheckCircle2, AlertCircle,
} from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../utils/api";
import toast from "react-hot-toast";
import DeleteModal from "../../components/DeleteModal";

// ─── Constants ────────────────────────────────────────────────────────────────

const COURSE_COLORS = [
  "from-blue-500 to-blue-700",
  "from-violet-500 to-violet-700",
  "from-emerald-500 to-emerald-700",
  "from-orange-500 to-orange-700",
  "from-pink-500 to-pink-700",
  "from-cyan-500 to-cyan-700",
  "from-yellow-500 to-yellow-600",
  "from-red-500 to-red-700",
];

const courseColor = (name: string) =>
  COURSE_COLORS[(name?.charCodeAt(0) ?? 0) % COURSE_COLORS.length];

const INPUT_CLS =
  "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all dark:text-white";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: number;
  name: string;
  code: string;
  fee: number | string;
  is_active: 0 | 1;
}

interface CourseForm {
  name: string;
  code: string;
  fee: string;
  is_active: 0 | 1;
}

const INITIAL_FORM: CourseForm = { name: "", code: "", fee: "", is_active: 1 };

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

export default function CoursesMaster() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<CourseForm>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);

  // ── Data ──────────────────────────────────────────────────────────────────

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet("/api/courses");
      setCourses(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const scrollToForm = () =>
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

  const handleEdit = (course: Course) => {
    setEditingId(course.id);
    setFormData({
      name: course.name ?? "",
      code: course.code ?? "",
      fee: String(course.fee ?? ""),
      is_active: course.is_active ?? 1,
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
      const payload = {
        ...formData,
        fee: Number(formData.fee),
        is_active: Number(formData.is_active),
      };
      if (editingId) {
        await apiPut(`/api/courses/${editingId}`, payload);
        toast.success("Course updated");
      } else {
        await apiPost("/api/courses", payload);
        toast.success("Course added");
      }
      handleCancel();
      fetchCourses();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Action failed");
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
      toast.success(newStatus ? "Course activated" : "Course deactivated");
      fetchCourses();
    } catch {
      toast.error("Status update failed");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await apiDelete(`/api/courses/${deleteId}`);
      toast.success("Course removed");
      fetchCourses();
      setDeleteId(null);
    } catch {
      toast.error("Delete failed — course may be linked to leads");
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = courses.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: "Total", value: courses.length, icon: BookOpen, bg: "bg-gray-50 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-300", border: "border-gray-200 dark:border-gray-700" },
    { label: "Active", value: courses.filter((c) => c.is_active === 1).length, icon: CheckCircle2, bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
    { label: "Inactive", value: courses.filter((c) => c.is_active !== 1).length, icon: AlertCircle, bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-400", border: "border-red-200 dark:border-red-800" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-12">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
              <GraduationCap size={16} className="text-white" />
            </span>
            Course Master
          </h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">
            {courses.length} Programs · Academic Directory
          </p>
        </div>

        <button
          type="button"
          onClick={() => (editingId ? handleCancel() : setShowForm((v) => !v))}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 shrink-0"
        >
          {showForm && !editingId ? <X size={13} /> : <Plus size={13} />}
          {showForm && !editingId ? "Cancel" : "Add Course"}
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

      {/* Form — mobile: slides in above table; desktop: right column */}
      {(showForm || editingId !== null) && (
        <div ref={formRef} className="lg:hidden">
          <CourseForm
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

        {/* Course list */}
        <div className="lg:col-span-2 space-y-3">

          {/* Search */}
          <div className="relative">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search courses or codes…"
              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all dark:text-white placeholder:text-gray-400 pr-8"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                    {["Program", "Code", "Fee", "Status", ""].map((h) => (
                      <th key={h} className={`px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 ${!h ? "text-right" : ""}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(4)].map((_, i) => (
                      <tr key={i} className="border-b border-gray-50 dark:border-gray-800">
                        <td colSpan={5} className="py-8 text-center animate-pulse text-gray-300 text-[10px] font-bold">
                          Loading…
                        </td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-gray-400 text-[10px] font-bold uppercase">
                        No courses found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((course, i) => (
                      <tr key={course.id} className="group border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${courseColor(course.name)} text-white flex items-center justify-center font-black text-sm uppercase shadow-sm shrink-0`}>
                              {course.name?.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-black text-gray-900 dark:text-white uppercase truncate">{course.name}</p>
                              <p className="text-[9px] text-gray-400 font-bold uppercase">
                                #{String(i + 1).padStart(2, "0")}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500">
                            {course.code || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                            ₹{Number(course.fee ?? 0).toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => toggleStatus(course)}
                            className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border transition-all ${
                              course.is_active === 1
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800"
                                : "bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:border-red-800"
                            }`}
                          >
                            {course.is_active === 1 ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end items-center gap-1">
                            <button type="button" onClick={() => handleEdit(course)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all" aria-label="Edit">
                              <Edit3 size={14} />
                            </button>
                            <button type="button" onClick={() => setDeleteId(course.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all" aria-label="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-2.5">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
              ))
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-gray-400 text-[10px] font-bold uppercase">No courses found</p>
            ) : (
              filtered.map((course) => (
                <div key={course.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-3 shadow-sm">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${courseColor(course.name)} text-white flex items-center justify-center font-black text-base uppercase shadow-sm shrink-0`}>
                    {course.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-black text-gray-900 dark:text-white uppercase truncate">{course.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {course.code && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500">
                          {course.code}
                        </span>
                      )}
                      <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                        ₹{Number(course.fee ?? 0).toLocaleString("en-IN")}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleStatus(course)}
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border ${
                          course.is_active === 1
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : "bg-red-50 text-red-600 border-red-100"
                        }`}
                      >
                        {course.is_active === 1 ? "Active" : "Inactive"}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => handleEdit(course)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all" aria-label="Edit">
                      <Edit3 size={14} />
                    </button>
                    <button type="button" onClick={() => setDeleteId(course.id)} className="p-2 text-gray-300 hover:text-red-500 rounded-xl transition-all" aria-label="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Desktop form panel */}
        <div className="hidden lg:block lg:col-span-1">
          <div ref={formRef} className="sticky top-6">
            <CourseForm
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
        title="Delete Academic Program?"
        message="This will permanently remove the program. Leads linked to this course will lose the association."
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

// ─── CourseForm ────────────────────────────────────────────────────────────────

interface CourseFormProps {
  formData: CourseForm;
  setFormData: (f: CourseForm) => void;
  editingId: number | null;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  alwaysVisible?: boolean;
}

function CourseForm({ formData, setFormData, editingId, submitting, onSubmit, onCancel, alwaysVisible }: CourseFormProps) {
  const set = (patch: Partial<CourseForm>) => setFormData({ ...formData, ...patch });

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-800 dark:text-white">
          {editingId ? "Edit Course" : "New Course"}
        </h2>
        {(editingId || !alwaysVisible) && (
          <button type="button" onClick={onCancel} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-all" aria-label="Close">
            <X size={14} />
          </button>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-3.5">
        <FormField label="Course Name *">
          <input
            required
            value={formData.name}
            onChange={(e) => set({ name: e.target.value })}
            className={INPUT_CLS}
            placeholder="e.g. B.Tech Computer Science"
          />
        </FormField>

        <FormField label="Program Code *">
          <input
            required
            value={formData.code}
            onChange={(e) => set({ code: e.target.value.toUpperCase() })}
            className={`${INPUT_CLS} uppercase`}
            placeholder="e.g. BTCS"
          />
        </FormField>

        <FormField label="Course Fee (₹) *">
          <input
            required
            type="number"
            min="0"
            value={formData.fee}
            onChange={(e) => set({ fee: e.target.value })}
            className="w-full bg-emerald-50/50 dark:bg-emerald-900/10 border-2 border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-xl px-3.5 py-2.5 text-xs font-black outline-none focus:border-emerald-400 transition-all"
            inputMode="numeric"
          />
        </FormField>

        <FormField label="Status">
          <select
            value={formData.is_active}
            onChange={(e) => set({ is_active: Number(e.target.value) as 0 | 1 })}
            className={INPUT_CLS}
          >
            <option value={1}>Active</option>
            <option value={0}>Inactive</option>
          </select>
        </FormField>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
        >
          {submitting ? "Processing…" : editingId ? "Update Course" : "Save Course"}
        </button>
      </form>
    </div>
  );
}