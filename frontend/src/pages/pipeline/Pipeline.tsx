import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  DndContext, closestCorners, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragOverlay
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Phone, MessageCircle, Clock, Search, X, GripVertical, User, BookOpen, FolderOpen
} from "lucide-react";
import { apiGet, apiPut } from "../../utils/api";
import { PipelineHeader } from "./PipelineHeader";
import { useToast } from "../../hooks/useToast";

// ─── DESIGN SYSTEM TOKENS ───────────────────────────────────────────────────
const STAGES = [
  { id: "New",            label: "Fresh",    emoji: "🌱", color: "bg-blue-500",    light: "bg-blue-50/60 dark:bg-blue-950/30",    border: "border-blue-500",    text: "text-blue-600 dark:text-blue-400",       ring: "ring-blue-100 dark:ring-blue-950" },
  { id: "Contacted",      label: "Contacted",  emoji: "📞", color: "bg-cyan-500",    light: "bg-cyan-50/60 dark:bg-cyan-950/30",    border: "border-cyan-500",    text: "text-cyan-600 dark:text-cyan-400",       ring: "ring-cyan-100 dark:ring-cyan-950" },
  { id: "Interested",     label: "Hot",        emoji: "🔥", color: "bg-rose-500",    light: "bg-rose-50/60 dark:bg-rose-950/30",      border: "border-rose-500",    text: "text-rose-600 dark:text-rose-400",       ring: "ring-rose-100 dark:ring-rose-950" },
  { id: "Follow-up",      label: "Follow Up",  emoji: "⏰", color: "bg-amber-500",   light: "bg-amber-50/60 dark:bg-amber-950/30",    border: "border-amber-500",   text: "text-amber-600 dark:text-amber-400",     ring: "ring-amber-100 dark:ring-amber-950" },
  { id: "Converted",      label: "Enrolled",    emoji: "✅", color: "bg-emerald-500", light: "bg-emerald-50/60 dark:bg-emerald-950/30", border: "border-emerald-500", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-100 dark:ring-emerald-950" },
  { id: "Lost",           label: "Lost",        emoji: "❌", color: "bg-slate-500",   light: "bg-slate-50 dark:bg-slate-800/60",        border: "border-slate-400",   text: "text-slate-600 dark:text-slate-400",     ring: "ring-slate-100 dark:ring-slate-900" },
  { id: "Not Interested", label: "Rejected",    emoji: "🚫", color: "bg-slate-400",   light: "bg-slate-100/50 dark:bg-slate-800/40",   border: "border-slate-300",   text: "text-slate-500 dark:text-slate-500",     ring: "ring-slate-100 dark:ring-slate-900" },
] as const;

const FALLBACK_SOURCES = [
  { id: '1',  name: 'WhatsApp' },
  { id: '2',  name: 'Phone Call' },
  { id: '3',  name: 'Walk-in' },
  { id: '4',  name: 'Website Inquiry' },
  { id: '5',  name: 'Referral' },
  { id: '6',  name: 'Social Media' },
  { id: '7',  name: 'Meta Ads' },
  { id: '8',  name: 'Google Ads' },
  { id: '9',  name: 'Bulk Import' },
  { id: '10', name: 'Unknown' }
];

const MOBILE_STAGES = STAGES.filter((s) =>
  ["New", "Contacted", "Interested", "Follow-up", "Converted"].includes(s.id)
);

function FilterSelect({ value, onChange, options, defaultLabel, labelKey = "name", valueKey = "id" }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer appearance-none"
    >
      <option value="">{defaultLabel}</option>
      {options.map((opt, idx) => {
        const val = typeof opt === "object" ? String(opt[valueKey]) : opt;
        const lbl = typeof opt === "object" ? opt[labelKey] : opt;
        return <option key={idx} value={val}>{lbl}</option>;
      })}
    </select>
  );
}

// ─── PIPELINE CARD ASSEMBLY COMPONENT ─────────────────────────────────────────
function PipelineCard({ lead, stage, isOverlay }) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs transition-all ${
      isOverlay ? "shadow-xl border-blue-400 dark:border-blue-500 scale-[1.02] rotate-1" : "hover:border-slate-200 dark:hover:border-slate-700/60 hover:shadow-sm"
    }`}>
      <div className="flex items-start gap-2.5 p-4 pb-3">
        <div className="mt-0.5 text-slate-300 dark:text-slate-700 transition-colors shrink-0 handle cursor-grab active:cursor-grabbing">
          <GripVertical size={14} />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight truncate leading-tight">
              {lead.full_name}
            </h3>
            <span className={`text-[8px] font-extrabold tracking-wider px-2 py-0.5 rounded-md uppercase shrink-0 ${stage.light} ${stage.text}`}>
              {lead.source || lead.source_name || "Direct"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 select-none">
            <BookOpen size={10} className="shrink-0" />
            <p className="text-[9px] font-bold uppercase truncate">
              {lead.interested_course || "General Inquiry"}
            </p>
          </div>

          {/* 🚀 FIXED DISPLAY STRIP: Renders clean custom titles safely */}
          {lead._displayName ? (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 rounded-lg text-slate-600 dark:text-slate-400 select-none max-w-full">
              <User size={10} className="shrink-0 text-slate-400" />
              <p className="text-[8px] font-black uppercase truncate tracking-wider leading-none">
                {lead._displayName}
              </p>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700/40 rounded-lg text-slate-400 select-none">
              <User size={10} className="shrink-0" />
              <p className="text-[8px] font-bold uppercase tracking-wider leading-none">Unassigned</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-50 dark:border-slate-800/40 bg-slate-50/30 dark:bg-slate-900/30 rounded-b-2xl">
        <div className="flex items-center gap-2">
          <a
            href={`tel:${lead.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="w-6 h-6 rounded-lg bg-blue-50/50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
          >
            <Phone size={11} />
          </a>
          <a
            href={`https://wa.me/91${lead.phone?.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-6 h-6 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
          >
            <MessageCircle size={11} />
          </a>
        </div>
        <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tabular-nums select-none">
          <Clock size={10} />
          <span>
            {lead.updated_at
              ? new Date(lead.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
              : "New"}
          </span>
        </div>
      </div>
    </div>
  );
}

function SortableContainer({ lead, stage }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="outline-none">
      <PipelineCard lead={lead} stage={stage} isOverlay={false} />
    </div>
  );
}

function StageHeader({ stage, count }) {
  return (
    <div className={`mb-3 px-4 py-3 rounded-2xl border-l-4 ${stage.border} bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between shrink-0 select-none`}>
      <div className="flex items-center gap-3">
        <span className="text-base leading-none">{stage.emoji}</span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 leading-tight">
            {stage.label}
          </p>
          <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">{stage.id}</p>
        </div>
      </div>
      <div className={`min-w-[22px] h-5 px-1.5 rounded-lg flex items-center justify-center text-[10px] font-black tracking-wide ${stage.light} ${stage.text}`}>
        {count}
      </div>
    </div>
  );
}

export default function Pipeline() {
  const { addToast } = useToast();

  const [leads, setLeads] = useState([]);
  const [staff, setStaff] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("New");
  const [timeRange, setTimeRange] = useState("month");
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeDragId, setActiveDragId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [counsellorFilter, setCounsellorFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [leadsRes, sourcesRes, staffRes] = await Promise.all([
        apiGet(`/api/leads?status=all&limit=600&range=${timeRange}`),
        apiGet("/api/lead-sources").catch(() => ({ data: [] })),
        apiGet("/api/users").catch(() => ({ data: [] })),
      ]);

      const rawLeads = Array.isArray(leadsRes?.leads)
        ? leadsRes.leads
        : Array.isArray(leadsRes?.data)
        ? leadsRes.data
        : [];

      const parsedSources = Array.isArray(sourcesRes)
        ? sourcesRes
        : (sourcesRes?.data || sourcesRes?.sources || sourcesRes?.rows || []);
      setSources(parsedSources.length > 0 ? parsedSources : FALLBACK_SOURCES);

      const allUsers = Array.isArray(staffRes)
        ? staffRes
        : (staffRes?.data || staffRes?.users || []);
      const counselorsOnly = allUsers
        .filter((u) => {
          const roleName = String(u.role?.name || u.role || u.role_name || "").toLowerCase();
          return roleName.includes("counselor") || roleName.includes("telecaller");
        })
        .map((u) => ({ id: u.id, name: u.name }));
      setStaff(counselorsOnly);

      // 🚀 FIXED ENRICHMENT MAPPER: Extracts nested entity IDs safely to handle text mappings
      const enrichedLeads = rawLeads.map((lead) => {
        const rawName = lead.assigned_user_name || lead.counsellor_name || lead.telecaller_name;
        const fallbackObjName = typeof lead.assigned_to === "object" ? lead.assigned_to?.name : null;
        
        // Extract plain string ID from primitive fields or object layouts
        const rawTargetId = lead.assigned_user_id ?? (typeof lead.assigned_to === "object" ? lead.assigned_to?.id : lead.assigned_to);
        
        const byId = counselorsOnly.find((u) => String(u.id) === String(rawTargetId ?? ""));
        const resolved = rawName || fallbackObjName || byId?.name;
        
        return {
          ...lead,
          _displayName: resolved && isNaN(Number(resolved)) ? resolved : byId?.name ?? null,
        };
      });

      setLeads(enrichedLeads);
    } catch {
      addToast("Pipeline sync failed", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange, addToast]);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData, timeRange]);

  const handleDragStart = (event) => {
    setActiveDragId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;

    const leadId = active.id;
    const newStatus = over.id;
    const lead = leads.find((l) => l.id === leadId);

    if (lead && lead.lead_status !== newStatus && STAGES.some((s) => s.id === newStatus)) {
      setLeads((prev) =>
        prev.map((l) => l.id === leadId ? { ...l, lead_status: newStatus } : l)
      );
      try {
        await apiPut(`/api/leads/${leadId}`, { lead_status: newStatus });
        addToast(`Moved to ${newStatus}`, "success");
      } catch {
        addToast("Reverting update mismatch state", "error");
        fetchData(true);
      }
    }
  };

  const isWithinTimeRange = (dateString) => {
    if (timeRange === "all") return true; 
    if (!dateString) return false;
    
    const date = new Date(dateString);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (timeRange) {
      case "today": 
        return date.toDateString() === now.toDateString();
      case "week": {
        const weekAgo = new Date(startOfToday);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return date >= weekAgo;
      }
      case "month": {
        const thirtyDaysAgo = new Date(startOfToday);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return date >= thirtyDaysAgo;
      }
      case "year": 
        return date.getFullYear() === now.getFullYear();
      default: 
        return true;
    }
  };

  const getLeads = useCallback((stageId) => {
    return leads.filter((l) => {
      const dbStatus = (l.lead_status || "").toLowerCase().trim();
      const stageStatus = stageId.toLowerCase().trim();

      if (dbStatus !== stageStatus) return false;
      
      if (!isWithinTimeRange(l.created_at)) return false;
      if (searchTerm && !l.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) && !l.phone?.includes(searchTerm)) return false;
      if (counsellorFilter && String(l.assigned_user_id ?? (typeof l.assigned_to === 'object' ? l.assigned_to?.id : l.assigned_to)) !== String(counsellorFilter)) return false;
      if (courseFilter && l.interested_course !== courseFilter) return false;
      
      if (sourceFilter) {
        const leadSourceValue = String(l.source || l.source_name || l.lead_source_name || "").trim().toLowerCase();
        const selectedFilterValue = String(sourceFilter).trim().toLowerCase();
        if (leadSourceValue !== selectedFilterValue) return false;
      }
      
      return true;
    });
  }, [leads, timeRange, searchTerm, courseFilter, counsellorFilter, sourceFilter]);

  const hasActiveFilters = !!(searchTerm || courseFilter || counsellorFilter || sourceFilter);
  const totalFiltered = STAGES.reduce((sum, s) => sum + getLeads(s.id).length, 0);
  const uniqueCourses = [...new Set(leads.map((l) => l.interested_course).filter(Boolean))].sort();
  const activeDragLead = activeDragId ? leads.find(l => l.id === activeDragId) : null;
  const currentDragStage = activeDragLead ? STAGES.find(s => s.id === activeDragLead.lead_status) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden space-y-4 text-sm text-slate-900 dark:text-slate-100 font-normal antialiased">
      
      <PipelineHeader
        totalFiltered={totalFiltered}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        refreshing={refreshing}
        onRefreshClick={() => { setRefreshing(true); fetchData(true); }}
        showFilters={showFilters}
        onFilterToggle={() => setShowFilters(!showFilters)}
        hasActiveFilters={hasActiveFilters}
      />

      {showFilters && (
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-xs animate-in fade-in duration-100 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              type="text"
              placeholder="Search name or phone number…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all placeholder-slate-400"
            />
          </div>

          <FilterSelect value={counsellorFilter} onChange={(e) => setCounsellorFilter(e.target.value)} options={staff} defaultLabel="All Assigned Staff" />
          <FilterSelect value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} options={uniqueCourses} defaultLabel="All Course Channels" />

          <div className="flex gap-2">
            <div className="flex-1">
              <FilterSelect value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} options={sources} defaultLabel="All Network Sources" labelKey="name" valueKey="name" />
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => { setSearchTerm(""); setCourseFilter(""); setCounsellorFilter(""); setSourceFilter(""); }}
                className="px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 border border-transparent"
                title="Flush Filters"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* MOBILE CONTAINER: TAB TRACK BAR */}
      <div className="sm:hidden shrink-0 flex bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-x-auto scrollbar-none select-none">
        {MOBILE_STAGES.map((stage) => {
          const count = getLeads(stage.id).length;
          const isActive = activeTab === stage.id;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => setActiveTab(stage.id)}
              className={`shrink-0 flex flex-col items-center gap-1 px-5 py-3 border-b-2 transition-all cursor-pointer ${
                isActive ? `border-blue-600 ${stage.text}` : "border-transparent text-slate-400"
              }`}
            >
              <span className="text-base">{stage.emoji}</span>
              <span className="text-[9px] font-black uppercase tracking-wider">{stage.label}</span>
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md mt-0.5 ${isActive ? `${stage.light} ${stage.text}` : "bg-slate-50 text-slate-400 dark:bg-slate-800"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* PIPELINE WORKSPACE DECK */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-hidden">
          {/* Mobile Layout Render */}
          <div className="sm:hidden h-full overflow-y-auto pb-4">
            {(() => {
              const stage = STAGES.find((s) => s.id === activeTab) || STAGES[0];
              const stageLeads = getLeads(stage.id);
              return (
                <div className="space-y-3">
                  <StageHeader stage={stage} count={stageLeads.length} />
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="h-24 bg-slate-100 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/40 rounded-2xl animate-pulse" />
                    ))
                  ) : stageLeads.length === 0 ? (
                    <div className="py-20 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/20 select-none">
                      <FolderOpen size={24} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                      <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">No Leads Active</p>
                    </div>
                  ) : (
                    <SortableContext id={stage.id} items={stageLeads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                      {stageLeads.map((lead) => (
                        <SortableContainer key={lead.id} lead={lead} stage={stage} />
                      ))}
                    </SortableContext>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Desktop Column Grid Layout */}
          <div className="hidden sm:flex h-full gap-4 overflow-x-auto pb-8 items-start scrollbar-none">
            {STAGES.map((stage) => {
              const stageLeads = getLeads(stage.id);
              return (
                <div key={stage.id} className="shrink-0 w-[270px] flex flex-col max-h-full">
                  <StageHeader stage={stage} count={stageLeads.length} />
                  
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4 min-h-[150px] scrollbar-none select-none">
                    {loading ? (
                      <div className="space-y-3">
                        {[1, 2].map((i) => (
                          <div key={i} className="h-24 bg-slate-100/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40 rounded-2xl animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <SortableContext id={stage.id} items={stageLeads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                        {stageLeads.length === 0 ? (
                          <div className="py-12 text-center border border-dashed border-slate-100 dark:border-slate-800/80 rounded-2xl bg-slate-50/20 dark:bg-slate-900/10">
                            <p className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">Empty Stage</p>
                          </div>
                        ) : (
                          stageLeads.map((lead) => (
                            <SortableContainer key={lead.id} lead={lead} stage={stage} />
                          ))
                        )}
                      </SortableContext>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Drag Overlay Feedback pipeline */}
        <DragOverlay adjustScale={false}>
          {activeDragId && activeDragLead && currentDragStage ? (
            <PipelineCard lead={activeDragLead} stage={currentDragStage} isOverlay={true} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}