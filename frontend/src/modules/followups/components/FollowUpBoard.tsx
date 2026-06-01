import React from "react";
import { SECTIONS, SectionId } from "../../../constants/leadStatus";
import { FollowUpCard } from "./FollowUpCard";
import { FollowUpLead } from "../../../types/followup";

interface FollowUpBoardProps {
  getBucketLeads: (sid: SectionId) => FollowUpLead[];
  activeSection: SectionId;
  processingId: number | null;
  onMarkDone: (id: number) => void;
  onOpenNote: (lead: FollowUpLead) => void;
  onReschedule: (id: number, date: string) => void;
  onStatusChange: (id: number, status: string) => void;
}

export const FollowUpBoard = React.memo(function FollowUpBoard({
  getBucketLeads,
  activeSection,
  processingId,
  onMarkDone,
  onOpenNote,
  onReschedule,
  onStatusChange,
}: FollowUpBoardProps) {
  return (
    <>
      {/* Desktop Ingestion Split Grid Dashboard Track Layout */}
      <div className="hidden lg:grid grid-cols-3 gap-5">
        {SECTIONS.map((section) => {
          const bucketLeads = getBucketLeads(section.id);
          
          let emptyText = "All clear";
          if (section.id === "overdue") emptyText = "No overdue follow-ups";
          if (section.id === "today") emptyText = "No follow-ups due today";
          if (section.id === "upcoming") emptyText = "No upcoming follow-ups";

          return (
            <div key={section.id} className="space-y-3">
              <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border ${section.border} ${section.bg} select-none`}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{section.emoji}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${section.color}`}>{section.label}</span>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full bg-white dark:bg-gray-900 ${section.color} shadow-sm`}>
                  {bucketLeads.length}
                </span>
              </div>
              {bucketLeads.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl select-none">
                  <span className="text-3xl block mb-2">{section.emoji}</span>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-300">{emptyText}</p>
                </div>
              ) : (
                bucketLeads.map((lead) => (
                  <FollowUpCard
                    key={lead.id ?? lead.lead_id}
                    lead={lead}
                    section={section}
                    processingId={processingId}
                    onMarkDone={onMarkDone}
                    onOpenNote={onOpenNote}
                    onReschedule={onReschedule}
                    onStatusChange={onStatusChange}
                  />
                ))
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Responsive Structural Segment List Pane Layout */}
      <div className="lg:hidden space-y-3">
        {(() => {
          const section = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0];
          const bucketLeads = getBucketLeads(section.id);
          
          let emptyMobileText = "All clear here";
          if (section.id === "overdue") emptyMobileText = "No overdue follow-ups";
          if (section.id === "today") emptyMobileText = "No follow-ups due today";
          if (section.id === "upcoming") emptyMobileText = "No upcoming follow-ups";

          return bucketLeads.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 select-none">
              <span className="text-4xl block mb-2">{section.emoji}</span>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">{emptyMobileText}</p>
            </div>
          ) : (
            bucketLeads.map((lead) => (
              <FollowUpCard
                key={lead.id ?? lead.lead_id}
                lead={lead}
                section={section}
                processingId={processingId}
                onMarkDone={onMarkDone}
                onOpenNote={onOpenNote}
                onReschedule={onReschedule}
                onStatusChange={onStatusChange}
              />
            ))
          );
        })()}
      </div>
    </>
  );
});