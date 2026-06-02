import React from "react";
import { Phone, Calendar, User, BookOpen, CheckCircle2, MessageCircle } from "lucide-react";
import { Section, STATUS_OPTIONS } from "../../../constants/leadStatus";
import { formatShortDate, getISTDateString, getStatusBucket } from "../../../utils/date";
import { FollowUpLead } from "../../../types/followup";

interface FollowUpCardProps {
  lead: FollowUpLead;
  section: Section;
  processingId: number | null;
  onMarkDone: (id: number) => void;
  onOpenNote: (lead: FollowUpLead) => void;
  onReschedule: (id: number, date: string) => void;
  onStatusChange: (id: number, status: string) => void;
}

export const FollowUpCard = React.memo(function FollowUpCard({
  lead,
  section,
  processingId,
  onMarkDone,
  onOpenNote,
  onReschedule,
  onStatusChange,
}: FollowUpCardProps) {
  const leadId = Number(lead.id ?? lead.lead_id);
  const isProcessing = processingId === leadId;
  const bucket = section.id;
  const targetBucket = getStatusBucket(lead.next_follow_up_date);

  const borderCls =
  targetBucket === "overdue" ? "border-red-100 dark:border-red-900/40"
  : targetBucket === "today" ? "border-orange-100 dark:border-orange-900/40"
  : "border-gray-100 dark:border-gray-800";

  const avatarCls =
    bucket === "overdue" ? "bg-red-100 text-red-600"
    : bucket === "today" ? "bg-orange-100 text-orange-600"
    : "bg-blue-100 text-blue-600";

  const dateCls =
    bucket === "overdue" ? "bg-red-50 text-red-600"
    : bucket === "today" ? "bg-orange-50 text-orange-600"
    : "bg-blue-50 text-blue-600";

  const displaySource = lead.lead_source_name || "";

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-sm hover:shadow-md transition-all ${borderCls}`}>
      {bucket === "overdue" && <div className="h-1 bg-gradient-to-r from-red-500 to-red-400 rounded-t-2xl" />}
      {bucket === "today"   && <div className="h-1 bg-gradient-to-r from-orange-500 to-yellow-400 rounded-t-2xl" />}

      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm uppercase shrink-0 ${avatarCls}`}>
              {lead.full_name?.charAt(0) ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">
                {lead.full_name}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                {lead.interested_course && (
                  <span className="text-[9px] font-bold text-gray-400 uppercase truncate">
                    {lead.interested_course}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-xl shrink-0 text-[10px] font-black uppercase select-none ${dateCls}`}>
            <Calendar size={10} />
            {formatShortDate(lead.next_follow_up_date)}
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:underline">
            <Phone size={11} /> {lead.phone}
          </a>
          {displaySource && (
            <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded-md uppercase shrink-0 select-none">
              {displaySource}
            </span>
          )}
          {lead.assigned_user_name && (
            <div className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase select-none">
              <User size={9} /> {lead.assigned_user_name}
            </div>
          )}
        </div>

        {(lead.counselor_remarks || lead.last_feedback) && (
          <div className="mb-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="text-[10px] text-gray-500 italic truncate">
              "{lead.counselor_remarks || lead.last_feedback}"
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onMarkDone(leadId)}
            disabled={isProcessing}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all active:scale-95 flex-1 justify-center cursor-pointer ${
              isProcessing
                ? "bg-gray-200 text-gray-400 cursor-wait"
                : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20"
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={13} />
                <span>Done</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onOpenNote(lead)}
            className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all cursor-pointer"
            title="Add tracking interaction log notes"
          >
            <BookOpen size={14} />
          </button>

          <div className="relative">
            <button
              type="button"
              className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-xl hover:bg-orange-100 transition-all cursor-pointer"
              title="Reschedule next outreach date"
            >
              <Calendar size={14} />
            </button>
            <input
              type="date"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              min={getISTDateString()}
              aria-label="Reschedule target action window calendar"
              onChange={(e) => {
                const selectedDate = e.target.value;
                if (!selectedDate) return;
                onReschedule(leadId, selectedDate);
              }}
            />
          </div>

          <a
            href={`https://wa.me/91${lead.phone?.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all flex items-center justify-center"
            title="Open WhatsApp messenger thread"
          >
            <MessageCircle size={14} />
          </a>

          <select
            value={lead.lead_status || "Follow-up"}
            onChange={(e) => onStatusChange(leadId, e.target.value)}
            aria-label="Modify system funnel step category"
            className="flex-1 min-w-[90px] px-2 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-black uppercase outline-none cursor-pointer dark:text-white"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
});