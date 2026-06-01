// src/constants/statusConfig.ts
export const STATUS_CONFIG: Record<string, { dot: string; badge: string }> = {
  "New": { dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800" },
  "Contacted": { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800" },
  "Interested": { dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-800" },
  "Follow-up": { dot: "bg-orange-500", badge: "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800" },
  "Follow-up Needed": { dot: "bg-orange-500", badge: "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800" },
  "Converted": { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800" },
  "Lost": { dot: "bg-rose-500", badge: "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800" },
  "Not Interested": { dot: "bg-slate-400", badge: "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" },
};

export const STATUS_FILTER_OPTIONS = ["all", "New", "Contacted", "Interested", "Follow-up", "Converted", "Lost", "Not Interested"];

export const AVATAR_COLORS = [
  "bg-blue-600", "bg-violet-600", "bg-rose-600", "bg-emerald-600",
  "bg-amber-600", "bg-cyan-600", "bg-pink-600", "bg-indigo-600",
];

// src/constants/logConfig.ts
import { Phone, MessageSquare, Users, StickyNote } from "lucide-react";
import React from "react";

export const LOG_CONFIG: Record<string, { icon: React.ComponentType<any>; color: string; bg: string; label: string }> = {
  Call: { icon: Phone, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20", label: "📞 Call" },
  WhatsApp: { icon: MessageSquare, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20", label: "💬 WhatsApp" },
  Meeting: { icon: Users, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20", label: "🤝 Meeting" },
  Note: { icon: StickyNote, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20", label: "📝 Note" },
};