import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Users2, Crown, Shield, Users, Phone, Mail, Clock, Plus, Edit3, Trash2, Building2, ToggleLeft, ToggleRight, ShieldAlert } from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../utils/api";

// 🎯 SWAPPED: Wiped out react-hot-toast layer maps for your unified system toast hook
import { useToast } from "../../hooks/useToast";

import { MasterPageLayout } from "../../modules/master/layout/MasterPageLayout";
import { MasterHeader } from "../../modules/master/layout/MasterHeader";
import { StatsCard } from "../../modules/master/stats/StatsCard";
import { DataToolbar } from "../../modules/master/shared/DataToolbar";
import { EnterpriseTable } from "../../modules/master/table/EnterpriseTable";
import { SlideOverForm } from "../../modules/master/forms/SlideOverForm";
import DeleteModal from "../../components/DeleteModal";

// ✅ SPECIFIED ACCOUNT CLEARANCE ACCESS SCHEMAS
const ROLES = ["Super Admin", "Admin", "Manager", "Counselor", "Telecaller"] as const;
type Role = (typeof ROLES)[number];

interface RoleConfig {
  style: string;
  icon: React.ElementType;
}

const ROLE_CONFIG: Record<Role, RoleConfig> = {
  "Super Admin": { style: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:border-purple-900/40 dark:text-purple-400", icon: Crown },
  "Admin": { style: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-400", icon: ShieldAlert },
  Manager: { style: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400", icon: Shield },
  Counselor: { style: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400", icon: Users },
  Telecaller: { style: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400", icon: Phone },
};

// ─── 🛡️ DATA STRIPPER AND COMPLIANCE MAPPER ENGINE ─────────────────────────
const getCleanRoleToken = (rawRole: any): string => {
  const rawString = String(rawRole || "").trim();

  // 🚀 DYNAMIC EXCEPTION: If the role is explicitly saved as uppercase "ADMIN",
  // preserve it exactly as "ADMIN" (matching SHAJI's setup)
  if (rawString === "ADMIN") {
    return "ADMIN";
  }

  const normalized = rawString.toLowerCase();
  
  if (normalized === "super admin" || normalized === "superadmin") return "Super Admin";
  
  // 🚀 DEFAULT ADJUSTMENT: Forces normal admin strings into lowercase
  if (normalized === "admin") return "admin"; 
  
  if (normalized.includes("manager")) return "Manager";
  if (normalized.includes("counselor") || normalized.includes("counsel")) return "Counselor";
  if (normalized.includes("tele") || normalized.includes("caller")) return "Telecaller";
  
  return "Counselor"; 
};
const SHIELD_GILL = ["from-blue-500 to-blue-600", "from-purple-500 to-purple-600", "from-emerald-500 to-emerald-600", "from-orange-500 to-orange-600", "from-pink-500 to-pink-600"];
const avatarGradient = (name: string) => SHIELD_GILL[(name?.charCodeAt(0) ?? 0) % SHIELD_GILL.length];

interface BranchOption {
  id: number;
  branch_code: string;
  name: string;
}

interface StaffUser {
  id: number;
  branch_id: number;
  branch_name?: string;
  branch_code?: string;
  name: string;
  email: string;
  phone?: string;
  role: string; 
  status: 'active' | 'inactive';
  last_login?: string;
  designation?: string;
  department?: string;
}

interface UserFormState {
  name: string;
  email: string;
  phone: string;
  role: Role;
  branch_id: string;
  status: 'active' | 'inactive';
  designation: string;
  department: string;
  password?: string;
}

const INITIAL_FORM: UserFormState = { 
  name: "", 
  email: "", 
  phone: "", 
  role: "Counselor", 
  branch_id: "", 
  status: 'active',
  designation: "",
  department: "",
  password: "" 
};

interface UsersMasterProps {
  isNested?: boolean;
}

export default function UsersMaster({ isNested = false }: UsersMasterProps) {
  // 🎯 INJECT UNIFIED MODERN TOAST HOOK
  const { addToast } = useToast();

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<UserFormState>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const fetchEnterpriseMetadata = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const userData = await apiGet("/api/users");
      const parsedUsers = Array.isArray(userData) ? userData : (userData?.data || []);
      
      setUsers(parsedUsers);
      setBranches([]); 
    } catch (err) {
      console.error("Data load failed:", err);
      // ⚡ UPDATED: Standardized tracker alert trigger
      addToast("Failed to load staff profiles", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchEnterpriseMetadata(); }, [fetchEnterpriseMetadata]);

  const handleEdit = (user: StaffUser) => {
    setEditingId(user.id);
    setFormData({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      role: getCleanRoleToken(user.role), 
      branch_id: String(user.branch_id),
      status: user.status || 'active',
      designation: user.designation || "",
      department: user.department || "",
      password: "",
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      ...INITIAL_FORM,
      branch_id: branches.length > 0 ? String(branches[0].id) : ""
    });
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        branch_id: parseInt(formData.branch_id, 10) || 0
      };
      
      if (editingId && !payload.password?.trim()) {
        delete payload.password;
      }

      if (editingId) {
        const res = await apiPut(`/api/users/${editingId}`, payload);
        const successMessage = typeof res === "string" ? res : (res?.message || "Identity profile settings locked cleanly");
        // ⚡ UPDATED: Standardized tracker alert trigger
        addToast(successMessage, "success");
      } else {
        const res = await apiPost("/api/users", payload);
        const successMessage = typeof res === "string" ? res : (res?.message || "New operational account initialized cleanly");
        // ⚡ UPDATED: Standardized tracker alert trigger
        addToast(successMessage, "success");
      }
      
      handleCancel();
      fetchEnterpriseMetadata(true);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.response?.data?.message || err?.message || "Access modification rejected — verify system tracking restrictions";
      // ⚡ UPDATED: Standardized tracker alert trigger
      addToast(errorMessage, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUserStatus = async (user: StaffUser) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await apiPut(`/api/users/${user.id}`, {
        ...user,
        status: nextStatus
      });
      // ⚡ UPDATED: Standardized tracker alert trigger
      addToast(`User visibility updated to ${nextStatus}`, "success");
      fetchEnterpriseMetadata(true);
    } catch {
      // ⚡ UPDATED: Standardized tracker alert trigger
      addToast("Failed to alter authorization status flags", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await apiDelete(`/api/users/${deleteId}`);
      // ⚡ UPDATED: Standardized tracker alert trigger
      addToast("Operator clearance status terminated", "success");
      setDeleteId(null);
      fetchEnterpriseMetadata(true);
    } catch {
      // ⚡ UPDATED: Standardized tracker alert trigger
      addToast("Access revoke fail—counselor tied to live customer leads", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    return users.filter((u) => {
      return (
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.designation?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [users, searchTerm]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, currentPage, rowsPerPage]);

  const totalPages = Math.max(Math.ceil(filtered.length / rowsPerPage), 1);

  const statsRow = (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <StatsCard label="Clearance Operators" value={filtered.length} icon={Users} variant="neutral" />
      <StatsCard label="Global Super Admins" value={users.filter(u => getCleanRoleToken(u.role) === "Super Admin").length} icon={Crown} variant="purple" />
      <StatsCard label="Branch Managers" value={users.filter(u => getCleanRoleToken(u.role) === "Manager").length} icon={Shield} variant="info" />
      <StatsCard label="Counselor Nodes" value={users.filter(u => getCleanRoleToken(u.role) === "Counselor").length} icon={Users} variant="success" />
      <StatsCard label="Suspended Profiles" value={users.filter(u => u.status === "inactive").length} icon={Phone} variant="neutral" />
    </div>
  );

  const tableColumns = [
    {
      header: "Staff Member Access Profile",
      accessor: (u: StaffUser) => (
        <div className="flex items-center gap-3 select-none">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarGradient(u.name)} text-white flex items-center justify-center font-bold text-sm uppercase shadow-3xs shrink-0`}>
            {u.name?.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-slate-900 dark:text-white capitalize">{u.name?.toLowerCase()}</p>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1.5 mt-0.5 max-w-[160px] truncate">
              <Mail size={11} className="text-slate-400 shrink-0" /> {u.email}
            </p>
          </div>
        </div>
      )
    },
    {
      header: "Department Unit",
      accessor: (u: StaffUser) => (
        <div className="flex flex-col gap-0.5 select-none">
          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 capitalize">
            {u.department || "General Operations"}
          </p>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            {u.designation || "Staff"}
          </span>
        </div>
      )
    },
    {
      header: "Role / Placement Context",
      accessor: (u: StaffUser) => {
        const cleanedRoleToken = getCleanRoleToken(u.role);
        const cfg = ROLE_CONFIG[cleanedRoleToken] || ROLE_CONFIG.Counselor;
        const Icon = cfg.icon;
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${cfg.style}`}>
              <Icon size={10} className="shrink-0" /> {cleanedRoleToken}
            </span>
          </div>
        );
      }
    },
    {
      header: "System Security Clearances",
      accessor: (u: StaffUser) => {
        const isActive = u.status === 'active';
        return (
          <button type="button" onClick={() => toggleUserStatus(u)} className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md cursor-pointer transition-all border ${
            isActive ? "bg-emerald-50/60 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20" : "bg-rose-50/60 border-rose-200 text-rose-700 dark:bg-rose-950/20"
          }`}>
            {isActive ? <ToggleRight size={14} className="text-emerald-600" /> : <ToggleLeft size={14} className="text-rose-500" />}
            <span>{u.status}</span>
          </button>
        );
      }
    },
    {
      header: "Last Sync Metrics",
      accessor: (u: StaffUser) => {
        if (!u.last_login) return <span className="text-[10px] text-slate-300 dark:text-slate-700 font-bold">No Records Logged</span>;
        const d = new Date(u.last_login);
        return (
          <div>
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Clock size={10} className="text-slate-400" /> {d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
            </p>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        );
      }
    },
    {
      header: "",
      className: "text-right w-24",
      accessor: (u: StaffUser) => (
        <div className="flex justify-end items-center gap-1">
          <button type="button" onClick={() => handleEdit(u)} className="p-1.5 text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"><Edit3 size={13} /></button>
          <button type="button" onClick={() => setDeleteId(u.id)} className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg cursor-pointer transition-colors"><Trash2 size={13} /></button>
        </div>
      )
    }
  ];

  const coreTableContent = (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-3xs overflow-hidden min-h-[560px] flex flex-col justify-between [&_th]:text-[10px] [&_th]:tracking-wider [&_th]:font-black [&_th]:uppercase">
        
        {/* 💻 DESKTOP DATA GRID */}
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

        {/* 📱 MOBILE RESPONSIVE CARD VIEW PANEL */}
        <div className="block md:hidden w-full p-3 space-y-3 flex-1 overflow-y-auto">
          {loading ? (
            <div className="h-48 flex items-center justify-center text-xs font-bold text-slate-400 uppercase tracking-widest">Hydrating operator profiles...</div>
          ) : paginatedData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs font-bold text-slate-400 uppercase tracking-widest">No matching user accounts</div>
          ) : (
            paginatedData.map((u) => {
              const isActive = u.status === 'active';
              const cleanedRoleToken = getCleanRoleToken(u.role);
              const cfg = ROLE_CONFIG[cleanedRoleToken] || ROLE_CONFIG.Counselor;
              const RoleIcon = cfg.icon;
              return (
                <div key={u.id} className="p-4 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl space-y-3 shadow-3xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${avatarGradient(u.name)} text-white flex items-center justify-center font-bold text-xs uppercase shadow-3xs shrink-0`}>
                        {u.name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white capitalize truncate leading-tight">{u.name?.toLowerCase()}</h4>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium truncate mt-0.5">{u.email}</p>
                      </div>
                    </div>

                    <button type="button" onClick={() => toggleUserStatus(u)} className={`inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border shrink-0 transition-colors ${
                      isActive ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
                    }`}>
                      <span>{u.status}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 gap-x-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1 truncate text-slate-700 dark:text-slate-300">
                      <Building2 size={11} className="text-slate-400 shrink-0" />
                      <span className="capitalize truncate">{(u.branch_name || "HQ Core")?.toLowerCase()}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${cfg.style}`}>
                        <RoleIcon size={8} className="shrink-0" />
                        <span>{cleanedRoleToken}</span>
                      </span>
                    </div>

                    {u.phone ? (
                      <a href={`tel:${u.phone}`} className="flex items-center gap-1 hover:text-blue-500 col-span-1 truncate transition-colors">
                        <Phone size={11} className="text-slate-400 shrink-0" />
                        <span className="truncate">{u.phone}</span>
                      </a>
                    ) : (
                      <div className="text-[8px] font-bold text-slate-300 dark:text-slate-700 uppercase">No handset</div>
                    )}

                    {u.designation && (
                      <div className="text-[9px] text-slate-400 font-bold uppercase truncate tracking-wide col-span-1 flex items-center gap-0.5">
                        <span>{u.designation}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-dashed border-slate-200/60 dark:border-slate-800/60">
                    <div className="text-[8px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
                      <Clock size={9} />
                      <span>Log: {u.last_login ? new Date(u.last_login).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "Never"}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleEdit(u)} className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 rounded-md cursor-pointer transition-colors">
                        <Edit3 size={10} /> <span>Edit</span>
                      </button>
                      <button type="button" onClick={() => setDeleteId(u.id)} className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer transition-colors">
                        <Trash2 size={10} /> <span>Purge</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <SlideOverForm isOpen={showForm} onClose={handleCancel} title={editingId ? "Revise Profile Access Specifications" : "Deploy Multi-Branch Operator Node"} onSubmit={handleSubmit} submitting={submitting}>
        <div className="space-y-4 text-xs font-semibold text-slate-800 dark:text-slate-200">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Full Legal Name *</label>
            <input required type="text" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none" />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Corporate Email Address *</label>
            <input required type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Structural Branch Mapping *</label>
              <select value={formData.branch_id} onChange={(e) => setFormData(p => ({ ...p, branch_id: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none cursor-pointer">
                {branches.map(b => (
                  <option key={b.id} value={b.id}>[{b.branch_code}] {b.name}</option>
                ))}
                <option value="">HQ Core Hub</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Access Permission Role *</label>
              <select value={formData.role} onChange={(e) => setFormData(p => ({ ...p, role: e.target.value as Role }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none cursor-pointer">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Corporate Designation</label>
              <input type="text" value={formData.designation} onChange={(e) => setFormData(p => ({ ...p, designation: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none" placeholder="e.g. Senior Consultant" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Department Unit</label>
              <input type="text" value={formData.department} onChange={(e) => setFormData(p => ({ ...p, department: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none" placeholder="e.g. Admissions" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Secure Contact Gateway String</label>
            <input type="tel" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none" placeholder="10-digit handset numbers" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{editingId ? "Override Secure Token Password" : "Secure Cipher Entry Pass * "}</label>
            <input required={!editingId} type="password" value={formData.password} onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none" placeholder={editingId ? "Leave completely empty to preserve values" : "••••••••"} />
          </div>

          <div className="space-y-1 pt-1">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Account Initialization State</label>
            <select value={formData.status} onChange={(e) => setFormData(p => ({ ...p, status: e.target.value as 'active' | 'inactive' }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none cursor-pointer">
              <option value="active">Active Structural Operator Clearance Status</option>
              <option value="inactive">Suspended Operator Domain Profile Locked</option>
            </select>
          </div>
        </div>
      </SlideOverForm>

      <DeleteModal isOpen={deleteId !== null} title="Decommission Operator Channel?" message="This permanently deletes the selected user identity configurations and access tokens. This action is irreversible." onClose={() => setDeleteId(null)} onConfirm={confirmDelete} isDeleting={isDeleting} />
    </>
  );

  // ─── NESTED DASHBOARD VIEW OVERRIDE ────────────────────────────────────────
  if (isNested) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-xl shadow-3xs select-none">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 flex-1 sm:flex-initial">
              <Users2 size={14} className="text-purple-600 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 hidden xs:inline shrink-0">Search:</span>
              <input 
                type="text" 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                placeholder="Filter users..." 
                className="bg-transparent text-xs font-bold outline-none text-slate-700 dark:text-slate-300 w-full max-w-[200px] sm:max-w-[250px] border-none p-0 focus:ring-0 min-w-0"
              />
            </div>
          </div>
          
          <button 
            type="button" 
            onClick={() => {
              setEditingId(null);
              setFormData({ ...INITIAL_FORM });
              setShowForm(true);
            }} 
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white bg-purple-600 hover:bg-purple-700 active:scale-98 rounded-lg cursor-pointer transition-all shadow-xs shrink-0"
          >
            <Plus size={11} strokeWidth={3} className="shrink-0" />
            <span className="hidden sm:inline">Add User Account</span>
            <span className="inline sm:hidden">Add User</span>
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
          title="Enterprise Operational Node Console"
          description="Govern system-wide access parameters and manage corporate role assignments."
          icon={Users2}
          iconColorClass="bg-slate-900 dark:bg-slate-800"
          breadcrumbs={[{ label: "Security Console" }, { label: "Operator Management", active: true }]}
          countText={`${filtered.length} Operators Registered`}
          primaryActionLabel="Commission Operator Profile"
          onPrimaryAction={() => {
            setEditingId(null);
            setFormData({ ...INITIAL_FORM });
            setShowForm(true);
          }}
          onRefresh={() => fetchEnterpriseMetadata()}
          loading={loading}
        />
      }
      statsRow={statsRow}
      toolbar={
        <DataToolbar
          searchTerm={searchTerm}
          onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
          searchPlaceholder="Search operators by core keyword profiles..."
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
          showFilter={false}
          showAddButton={false}
          filterComponent={
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Access Clearance Role Filter</label>
                <select 
                  value={formData.role} 
                  onChange={(e) => setFormData(p => ({ ...p, role: e.target.value as Role }))} 
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl outline-none font-bold cursor-pointer appearance-none"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r} Scale Track</option>)}
                </select>
              </div>
            </div>
          }
        />
      }
    >
      {coreTableContent}
    </MasterPageLayout>
  );
}