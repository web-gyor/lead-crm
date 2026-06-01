export const LEAD_STATUS = {
  FOLLOW_UP: "Follow-up",
  INTERESTED: "Interested",
  CONVERTED: "Converted",
  LOST: "Lost",
  NOT_INTERESTED: "Not Interested",
  CLOSED: "Closed",
} as const;

export type LeadStatusType = typeof LEAD_STATUS[keyof typeof LEAD_STATUS];

export const STATUS_OPTIONS = [
  { value: LEAD_STATUS.FOLLOW_UP, label: "Follow-up" },
  { value: LEAD_STATUS.INTERESTED, label: "Interested" },
  { value: LEAD_STATUS.CONVERTED, label: "Converted" },
  { value: LEAD_STATUS.LOST, label: "Lost" },
  { value: LEAD_STATUS.NOT_INTERESTED, label: "Rejected" },
] as const;

export const FINAL_STATUSES = new Set<string>([
  LEAD_STATUS.CONVERTED,
  LEAD_STATUS.LOST,
  LEAD_STATUS.NOT_INTERESTED,
  LEAD_STATUS.CLOSED,
]);

export const SECTIONS = [
  { id: "overdue",  label: "Overdue",   emoji: "🔴", color: "text-red-600",    bg: "bg-red-50 dark:bg-red-900/20",       border: "border-red-200 dark:border-red-800",      dot: "bg-red-500"    },
  { id: "today",    label: "Due Today", emoji: "🟡", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800", dot: "bg-orange-500" },
  { id: "upcoming", label: "Upcoming",  emoji: "🔵", color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20",     border: "border-blue-200 dark:border-blue-800",    dot: "bg-blue-500"   },
] as const;

export type SectionId = typeof SECTIONS[number]["id"];
export type Section = typeof SECTIONS[number];