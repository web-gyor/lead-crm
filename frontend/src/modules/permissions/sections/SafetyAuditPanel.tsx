import React from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { EnterpriseRole } from "./RoleSidebarPanel";

interface SafetyAuditPanelProps {
  selectedRole: EnterpriseRole;
  dbPermissions: any[];
}

export const SafetyAuditPanel: React.FC<SafetyAuditPanelProps> = ({ 
  selectedRole, 
  dbPermissions 
}) => {
  const isSuperAdmin = selectedRole.id === "super-admin";

  const sensitivePointsCount = React.useMemo(() => {
    if (isSuperAdmin) return 6;

    const sensitiveKeywords = ["purge", "delete", "export", "admin"];

    // Filter permissions by Role only (Global Scope)
    const rolePermissions = dbPermissions.filter(p => {
      const roleName = p.name || p.role || "";
      return roleName.toLowerCase() === selectedRole.name.toLowerCase();
    });

    return rolePermissions.filter(p => {
      const slug = p.slug || p.feature_name || "";
      return sensitiveKeywords.some(keyword => slug.toLowerCase().includes(keyword));
    }).length;
  }, [dbPermissions, selectedRole.name, isSuperAdmin]);

  return (
    <div className="w-full xl:w-72 shrink-0 space-y-4 xl:sticky xl:top-24">
      
      <div className="border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 rounded-2xl space-y-3.5 shadow-3xs">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Real-Time Access Preview</p>
        
        <div className="space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800/60 pb-2 text-xs font-semibold">
            <span className="text-slate-500">Target Role Profile:</span>
            <span className="text-slate-800 dark:text-slate-200 uppercase tracking-tight">{selectedRole.name}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800/60 pb-2 text-xs font-semibold">
            <span className="text-slate-500">Scope:</span>
            <span className="text-slate-800 dark:text-slate-200 uppercase tracking-tight text-[10px]">Global Enterprise</span>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">Security Risk Index:</span>
            <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${
              selectedRole.riskScore > 70 ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600"
            }`}>
              {selectedRole.riskScore}% Risk Weight
            </span>
          </div>
        </div>
      </div>

      <div className="border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 rounded-2xl space-y-3 shadow-3xs">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">IAM Perimeter Audit Log</p>
        
        <div className="space-y-3 font-medium text-xs">
          {sensitivePointsCount > 3 ? (
            <div className="flex gap-2.5 p-3 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/10">
              <ShieldAlert size={14} className="shrink-0 mt-0.5 stroke-[2.5]" />
              <div>
                <p className="font-bold uppercase tracking-tight text-[11px]">Elevated Access Vectors</p>
                <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80 leading-relaxed mt-0.5">
                  Detected {sensitivePointsCount} sensitive permissions in this node.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex gap-2.5 p-3 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/10">
              <ShieldCheck size={14} className="shrink-0 mt-0.5 stroke-[2.5]" />
              <div>
                <p className="font-bold uppercase tracking-tight text-[11px]">Access Vectors Stable</p>
                <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 leading-relaxed mt-0.5">Privilege scopes match minimum accessibility principles.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};