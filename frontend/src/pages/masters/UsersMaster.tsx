// src/pages/master/UsersMaster.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import {
  UserPlus, Trash2, Edit3, X,
  Shield, Users, Users2, Crown,
  Phone, Mail, CheckCircle2, Clock,
} from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../utils/api";
import toast from "react-hot-toast";
import DeleteModal from "../../components/DeleteModal";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = ["Admin", "Manager", "Counselor", "Telecaller"] as const;
type Role = (typeof ROLES)[number];

interface RoleConfig {
  style: string;
  badge: string;
  icon: React.ElementType;
}

const ROLE_CONFIG: Record<Role, RoleConfig> = {
  Admin: {
    style: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400",
    badge: "bg-purple-600",
    icon: Crown,
  },
  Manager: {
    style: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400",
    badge: "bg-indigo-600",
    icon: Shield,
  },
  Counselor: {
    style: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400",
    badge: "bg-emerald-600",
    icon: Users,
  },
  Telecaller: {
    style: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400",
    badge: "bg-blue-600",
    icon: Phone,
  },
};

const AVATAR_COLORS = [
  "from-blue-500 to-blue-700",
  "from-violet-500 to-violet-700",
  "from-emerald-500 to-emerald-700",
  "from-orange-500 to-orange-700",
  "from-pink-500 to-pink-700",
  "from-cyan-500 to-cyan-700",
];

const avatarGradient = (name: string) =>
  AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];

const INPUT_CLS =
  "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all dark:text-white";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  last_login?: string;
}

interface UserForm {
  name: string;
  email: string;
  phone: string;
  role: Role;
  password: string;
}

const INITIAL_FORM: UserForm = {
  name: "", email: "", phone: "", role: "Counselor", password: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
  };
}

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

export default function UsersMaster() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<UserForm>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);

  // ── Data ──────────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet("/api/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load team");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const scrollToForm = () =>
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

  const handleEdit = (user: StaffUser) => {
    setEditingId(user.id);
    setFormData({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      role: user.role ?? "Counselor",
      password: "",
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
        const payload: Partial<UserForm> = { ...formData };
        if (!payload.password?.trim()) delete payload.password;
        await apiPut(`/api/users/${editingId}`, payload);
        toast.success("Staff profile updated");
      } else {
        await apiPost("/api/users", formData);
        toast.success("Team member added");
      }
      handleCancel();
      fetchUsers();
    } catch {
      toast.error("Action failed — check if email is unique");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await apiDelete(`/api/users/${deleteId}`);
      toast.success("Staff member removed");
      fetchUsers();
      setDeleteId(null);
    } catch {
      toast.error("Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  const stats = [
    { label: "Total", count: users.length, icon: Users, bg: "bg-gray-50 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-300", border: "border-gray-200 dark:border-gray-700" },
    { label: "Admins", count: users.filter((u) => u.role === "Admin").length, icon: Crown, bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-700 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
    { label: "Managers", count: users.filter((u) => u.role === "Manager").length, icon: Shield, bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-700 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-800" },
    { label: "Counselors", count: users.filter((u) => u.role === "Counselor").length, icon: Users, bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
    { label: "Telecallers", count: users.filter((u) => u.role === "Telecaller").length, icon: Phone, bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-12">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
              <Users2 size={16} className="text-white" />
            </span>
            Staff Master
          </h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">
            {users.length} Members · Team Access Control
          </p>
        </div>

        <button
          type="button"
          onClick={() => (editingId ? handleCancel() : setShowForm((v) => !v))}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 shrink-0"
        >
          {showForm && !editingId ? <X size={13} /> : <UserPlus size={13} />}
          {showForm && !editingId ? "Cancel" : "Add Member"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
        {stats.map(({ label, count, icon: Icon, bg, text, border }) => (
          <div key={label} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${bg} ${border}`}>
            <Icon size={13} className={`${text} shrink-0`} />
            <div className="min-w-0">
              <p className={`text-sm font-black ${text}`}>{count}</p>
              <p className={`text-[9px] font-black uppercase tracking-widest ${text} opacity-70 truncate`}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile form (shows above table when active) */}
      {(showForm || editingId !== null) && (
        <div ref={formRef} className="lg:hidden">
          <UserForm
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

        {/* Staff list */}
        <div className="lg:col-span-2 space-y-3">

          {/* Desktop table */}
          <div className="hidden sm:block bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                    {["Staff Member", "Role", "Last Login", "Contact", ""].map((h) => (
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
                        <td colSpan={5} className="px-5 py-8 text-center animate-pulse text-gray-300 font-bold uppercase text-[10px]">
                          Loading…
                        </td>
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-gray-400 text-[10px] font-bold uppercase">
                        No staff found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      const cfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.Counselor;
                      const RoleIcon = cfg.icon;
                      const login = formatDate(user.last_login);
                      return (
                        <tr key={user.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarGradient(user.name)} text-white flex items-center justify-center font-black text-sm uppercase shrink-0 shadow-sm`}>
                                {user.name?.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[12px] font-black text-gray-900 dark:text-white uppercase truncate">{user.name}</p>
                                <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-0.5 truncate max-w-[140px]">
                                  <Mail size={9} /> {user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-1 rounded-lg border ${cfg.style}`}>
                              <RoleIcon size={9} /> {user.role}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {login ? (
                              <div>
                                <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                  <Clock size={9} className="text-gray-400" /> {login.date}
                                </p>
                                <p className="text-[9px] text-gray-400 tabular-nums">{login.time}</p>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-300 font-bold">Never</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            {user.phone ? (
                              <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1 tabular-nums">
                                <Phone size={9} className="text-gray-400" /> {user.phone}
                              </p>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex justify-end items-center gap-1">
                              <button type="button" onClick={() => handleEdit(user)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all" aria-label="Edit">
                                <Edit3 size={14} />
                              </button>
                              <button type="button" onClick={() => setDeleteId(user.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all" aria-label="Delete">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
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
            ) : users.length === 0 ? (
              <p className="py-12 text-center text-gray-400 text-[10px] font-bold uppercase">No staff found</p>
            ) : (
              users.map((user) => {
                const cfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.Counselor;
                const RoleIcon = cfg.icon;
                const login = formatDate(user.last_login);
                return (
                  <div key={user.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-3 shadow-sm">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarGradient(user.name)} text-white flex items-center justify-center font-black text-base uppercase shrink-0 shadow-sm`}>
                      {user.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-black text-gray-900 dark:text-white uppercase truncate">{user.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`inline-flex items-center gap-0.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-lg border ${cfg.style}`}>
                          <RoleIcon size={8} /> {user.role}
                        </span>
                        {user.phone && (
                          <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                            <Phone size={9} /> {user.phone}
                          </span>
                        )}
                        {login && (
                          <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                            <Clock size={9} /> {login.date}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button type="button" onClick={() => handleEdit(user)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all" aria-label="Edit">
                        <Edit3 size={14} />
                      </button>
                      <button type="button" onClick={() => setDeleteId(user.id)} className="p-2 text-gray-300 hover:text-red-500 rounded-xl transition-all" aria-label="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Desktop form panel */}
        <div className="hidden lg:block lg:col-span-1">
          <div ref={formRef} className="sticky top-6">
            <UserForm
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
        title="Remove Staff Member?"
        message="This will permanently remove the staff member and revoke their system access."
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

// ─── UserForm ─────────────────────────────────────────────────────────────────

interface UserFormProps {
  formData: UserForm;
  setFormData: (f: UserForm) => void;
  editingId: number | null;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  alwaysVisible?: boolean;
}

function UserForm({ formData, setFormData, editingId, submitting, onSubmit, onCancel, alwaysVisible }: UserFormProps) {
  const set = (patch: Partial<UserForm>) => setFormData({ ...formData, ...patch });

  const fields: { label: string; key: keyof UserForm; type: string; required: boolean }[] = [
    { label: "Full Name *",  key: "name",  type: "text",     required: true },
    { label: "Email ID *",   key: "email", type: "email",    required: true },
    { label: "Phone",        key: "phone", type: "tel",      required: false },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shrink-0">
            {editingId ? <Edit3 size={14} /> : <UserPlus size={14} />}
          </div>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-800 dark:text-white">
            {editingId ? "Edit Member" : "New Member"}
          </h2>
        </div>
        {(editingId || !alwaysVisible) && (
          <button type="button" onClick={onCancel} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-all" aria-label="Close">
            <X size={14} />
          </button>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-3.5">
        {fields.map(({ label, key, type, required }) => (
          <FormField key={key} label={label}>
            <input
              required={required}
              type={type}
              value={formData[key] as string}
              onChange={(e) => set({ [key]: e.target.value })}
              className={INPUT_CLS}
              inputMode={type === "tel" ? "tel" : type === "email" ? "email" : undefined}
            />
          </FormField>
        ))}

        <FormField label={editingId ? "Reset Password" : "Password *"}>
          <input
            required={!editingId}
            type="password"
            value={formData.password}
            onChange={(e) => set({ password: e.target.value })}
            placeholder={editingId ? "Leave blank to keep current" : "••••••••"}
            className={INPUT_CLS}
            autoComplete={editingId ? "new-password" : "new-password"}
          />
        </FormField>

        <FormField label="Access Role *">
          <div className="grid grid-cols-1 gap-1.5">
            {ROLES.map((role) => {
              const cfg = ROLE_CONFIG[role];
              const Icon = cfg.icon;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => set({ role })}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all ${
                    formData.role === role
                      ? `${cfg.style} border-current`
                      : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500"
                  }`}
                >
                  <Icon size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest flex-1">{role}</span>
                  {formData.role === role && <CheckCircle2 size={12} />}
                </button>
              );
            })}
          </div>
        </FormField>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 flex items-center justify-center gap-1.5 transition-all active:scale-95"
        >
          {submitting ? "Processing…" : editingId ? "Update Member" : "Create Account"}
        </button>
      </form>
    </div>
  );
}