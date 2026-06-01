import { STATUS_CONFIG, AVATAR_COLORS } from "../constants/statusConfig";

export const getStatusCfg = (s?: string) => {
  return STATUS_CONFIG[s ?? ""] ?? { 
    dot: "bg-slate-400", 
    badge: "bg-slate-100 text-slate-500 border border-slate-200" 
  };
};

export const getAvatarColor = (name: string): string => {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
};