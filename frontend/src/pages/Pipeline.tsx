// src/pages/Pipeline.tsx
import { useState, useEffect, useCallback } from "react";
import {
  DndContext, closestCorners, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Phone, MessageCircle, Clock, Search, Filter,
  X, RefreshCw, GripVertical, User, BookOpen, Zap,
} from "lucide-react";
import { apiGet, apiPut } from "../utils/api";
import toast from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES = [
  { id: "New",            label: "Fresh",     emoji: "🌱", color: "bg-orange-500",  light: "bg-orange-50 dark:bg-orange-900/20",   border: "border-orange-400",  text: "text-orange-600",  ring: "ring-orange-200"  },
  { id: "Contacted",      label: "Called",    emoji: "📞", color: "bg-blue-500",    light: "bg-blue-50 dark:bg-blue-900/20",       border: "border-blue-400",    text: "text-blue-600",    ring: "ring-blue-200"    },
  { id: "Interested",     label: "Hot",       emoji: "🔥", color: "bg-purple-500",  light: "bg-purple-50 dark:bg-purple-900/20",   border: "border-purple-400",  text: "text-purple-600",  ring: "ring-purple-200"  },
  { id: "Follow-up",      label: "Follow Up", emoji: "⏰", color: "bg-yellow-500",  light: "bg-yellow-50 dark:bg-yellow-900/20",   border: "border-yellow-400",  text: "text-yellow-600",  ring: "ring-yellow-200"  },
  { id: "Converted",      label: "Enrolled",  emoji: "✅", color: "bg-emerald-500", light: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-400", text: "text-emerald-600", ring: "ring-emerald-200" },
  { id: "Lost",           label: "Lost",      emoji: "❌", color: "bg-red-500",     light: "bg-red-50 dark:bg-red-900/20",         border: "border-red-400",     text: "text-red-600",     ring: "ring-red-200"     },
  { id: "Not Interested", label: "Rejected",  emoji: "🚫", color: "bg-gray-400",    light: "bg-gray-50 dark:bg-gray-800/50",       border: "border-gray-300",    text: "text-gray-500",    ring: "ring-gray-200"    },
] as const;

type Stage = (typeof STAGES)[number];

const MOBILE_STAGES = STAGES.filter((s) =>
  ["New", "Contacted", "Interested", "Follow-up", "Converted"].includes(s.id)
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: number;
  full_name: string;
  phone?: string;
  lead_status: string;
  source?: string;       // 👈 Add this
  source_name?: string;  // 👈 And this
  interested_course?: string;
  assigned_user_name?: string;
  updated_at?: string;
}
// ─── Lead Card ────────────────────────────────────────────────────────────────

function SortableLeadCard({ lead, stage }: { lead: Lead; stage: Stage }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id });

  // This checks every possible field the backend might be sending
  const displaySource = lead.source_name || lead.lead_source || lead.source || "Direct";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all ${
        isDragging ? `shadow-2xl ring-2 ${stage.ring}` : ""
      }`}
    >
      <div className="flex items-start gap-2 p-3 pb-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-gray-200 hover:text-gray-400 transition-colors shrink-0"
          aria-label="Drag handle"
        >
          <GripVertical size={14} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight truncate leading-tight">
              {lead.full_name}
            </h3>
            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase shrink-0 ${stage.light} ${stage.text}`}>
  {lead.source || lead.source_name || "Direct"}
</span>
          </div>

          <div className="flex items-center gap-1.5">
            <BookOpen size={9} className="text-gray-400 shrink-0" />
            <p className="text-[9px] font-bold text-gray-400 uppercase truncate">
              {lead.interested_course || "General Enquiry"}
            </p>
          </div>

          {lead.assigned_user_name && (
            <div className="flex items-center gap-1 mt-1">
              <User size={9} className="text-gray-400 shrink-0" />
              <p className="text-[9px] font-black text-indigo-500 uppercase truncate">
                {lead.assigned_user_name}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl">
        <div className="flex items-center gap-2">
          <a
            href={`tel:${lead.phone}`}
            onClick={(e) => e.stopPropagation()}
            aria-label="Call"
            className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 hover:bg-blue-100 transition-all"
          >
            <Phone size={11} />
          </a>
          <a
            href={`https://wa.me/91${lead.phone?.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label="WhatsApp"
            className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500 hover:bg-emerald-100 transition-all"
          >
            <MessageCircle size={11} />
          </a>
        </div>
        <div className="flex items-center gap-1 text-[8px] font-black text-gray-400 uppercase tabular-nums">
          <Clock size={9} />
          {lead.updated_at
            ? new Date(lead.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
            : "New"}
        </div>
      </div>
    </div>
  );
}

// ─── Stage Column ─────────────────────────────────────────────────────────────

function StageColumn({ stage, leads, loading }: { stage: Stage; leads: Lead[]; loading: boolean }) {
  return (
    <div className="shrink-0 w-[260px] sm:w-[280px] flex flex-col max-h-full">
      <div className={`mb-3 px-3 py-2.5 rounded-xl border-l-4 ${stage.border} bg-white dark:bg-gray-900 shadow-sm flex items-center justify-between shrink-0`}>
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{stage.emoji}</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-200 leading-tight">
              {stage.label}
            </p>
            <p className="text-[8px] text-gray-400 font-bold uppercase">{stage.id}</p>
          </div>
        </div>
        <div className={`min-w-[24px] h-6 px-1.5 rounded-lg flex items-center justify-center text-[10px] font-black ${stage.light} ${stage.text}`}>
          {leads.length}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 pb-4" style={{ minHeight: 80 }}>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <SortableContext id={stage.id} items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            {leads.length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                  {stage.emoji} Empty
                </p>
              </div>
            ) : (
              leads.map((lead) => (
                <SortableLeadCard key={lead.id} lead={lead} stage={stage} />
              ))
            )}
          </SortableContext>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Pipeline() {
  const [leads,      setLeads]      = useState<Lead[]>([]);
  const [staff,      setStaff]      = useState<any[]>([]);
  const [sources,    setSources]    = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState("New");
  const [timeRange,  setTimeRange]  = useState("month");
  const [showFilters,setShowFilters]= useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [searchTerm,        setSearchTerm]        = useState("");
  const [courseFilter,      setCourseFilter]      = useState("");
  const [counsellorFilter,  setCounsellorFilter]  = useState("");
  const [sourceFilter,      setSourceFilter]      = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Data ──────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [leadsRes, sourcesRes, staffRes] = await Promise.all([
        apiGet("/api/leads?status=all&limit=400"),
        apiGet("/api/lead-sources").catch(() => []),
        apiGet("/api/users").catch(() => []),
      ]);

      setLeads(
        Array.isArray(leadsRes?.data) ? leadsRes.data
        : Array.isArray(leadsRes) ? leadsRes
        : []
      );
      setSources(Array.isArray(sourcesRes) ? sourcesRes : []);
      setStaff(
        Array.isArray(staffRes) ? staffRes
        : staffRes?.data ?? staffRes?.users ?? []
      );
    } catch {
      toast.error("Pipeline sync failed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData, timeRange]);

  // ── Drag & Drop ───────────────────────────────────────────────────────────

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const leadId   = active.id as number;
    const newStatus = over.id as string;
    const lead     = leads.find((l) => l.id === leadId);

    if (lead && lead.lead_status !== newStatus && STAGES.some((s) => s.id === newStatus)) {
      setLeads((prev) =>
        prev.map((l) => l.id === leadId ? { ...l, lead_status: newStatus } : l)
      );
      try {
        await apiPut(`/api/leads/${leadId}`, { lead_status: newStatus });
        toast.success(`Moved to ${newStatus}`);
      } catch {
        toast.error("Update failed — reverting");
        fetchData(true);
      }
    }
  };

  // ── Filtering ─────────────────────────────────────────────────────────────

  const getLeads = useCallback((stageId: string): Lead[] => {
    return leads.filter((l) => {
      if (l.lead_status !== stageId) return false;
      if (searchTerm && !l.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) && !l.phone?.includes(searchTerm)) return false;
      if (courseFilter     && l.interested_course  !== courseFilter)     return false;
      if (counsellorFilter && l.assigned_user_name !== counsellorFilter) return false;
      if (sourceFilter && String(l.source_name) !== sourceFilter) return false;
      return true;
    });
  }, [leads, searchTerm, courseFilter, counsellorFilter, sourceFilter]);

  const hasActiveFilters = !!(searchTerm || courseFilter || counsellorFilter || sourceFilter);

  const clearFilters = () => {
    setSearchTerm(""); setCourseFilter(""); setCounsellorFilter(""); setSourceFilter("");
  };

  const totalFiltered = STAGES.reduce((sum, s) => sum + getLeads(s.id).length, 0);

  const uniqueCourses = [...new Set(leads.map((l) => l.interested_course).filter(Boolean))].sort();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="shrink-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
                <Zap size={15} className="text-white" />
              </span>
              Sales Pipeline
            </h1>
            <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mt-0.5">
              {totalFiltered} leads · conversion funnel
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setRefreshing(true); fetchData(true); }}
              aria-label="Refresh"
              className={`p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-all ${refreshing ? "animate-spin" : ""}`}
            >
              <RefreshCw size={14} />
            </button>

            <div className="hidden sm:flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-xl">
              {["Week", "Month", "Year"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeRange(r.toLowerCase())}
                  className={`px-2.5 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${
                    timeRange === r.toLowerCase()
                      ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm"
                      : "text-gray-400"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black uppercase transition-all ${
                showFilters || hasActiveFilters
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700"
              }`}
            >
              <Filter size={13} />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <span className="w-4 h-4 rounded-full bg-white text-blue-600 text-[9px] font-black flex items-center justify-center">
                  !
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="relative col-span-2 sm:col-span-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
              <input
                type="text"
                placeholder="Name or phone…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:border-blue-400 transition-all"
              />
            </div>

            <select
              value={counsellorFilter}
              onChange={(e) => setCounsellorFilter(e.target.value)}
              className="px-2 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-[10px] font-black uppercase text-gray-500 outline-none"
            >
              <option value="">All Staff</option>
              {staff.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>

            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-2 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-[10px] font-black uppercase text-gray-500 outline-none"
            >
              <option value="">All Courses</option>
              {uniqueCourses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <div className="flex gap-2">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="flex-1 px-2 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-[10px] font-black uppercase text-gray-500 outline-none"
              >
                <option value="">All Sources</option>
                {sources.map((src: any) => <option key={src.id} value={src.name}>{src.name}</option>)}
              </select>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  aria-label="Clear filters"
                  className="px-2.5 py-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all shrink-0"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile: Stage Tabs ── */}
      <div className="sm:hidden shrink-0 flex bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
        {MOBILE_STAGES.map((stage) => {
          const count    = getLeads(stage.id).length;
          const isActive = activeTab === stage.id;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => setActiveTab(stage.id)}
              className={`shrink-0 flex flex-col items-center gap-0.5 px-4 py-2.5 border-b-2 transition-all ${
                isActive ? `border-current ${stage.text}` : "border-transparent text-gray-400"
              }`}
            >
              <span className="text-base leading-none">{stage.emoji}</span>
              <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">{stage.label}</span>
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${isActive ? `${stage.light} ${stage.text}` : "bg-gray-100 text-gray-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Board ── */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-hidden">

          {/* Mobile: single column */}
          <div className="sm:hidden h-full overflow-y-auto px-4 py-4">
            {(() => {
              const stage      = STAGES.find((s) => s.id === activeTab) ?? STAGES[0];
              const stageLeads = getLeads(stage.id);
              return (
                <div className="space-y-2.5">
                  <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border-l-4 ${stage.border} bg-white dark:bg-gray-900 shadow-sm`}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{stage.emoji}</span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-800 dark:text-white">{stage.label}</p>
                        <p className="text-[9px] text-gray-400 uppercase font-bold">{stage.id}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-black px-3 py-1 rounded-xl ${stage.light} ${stage.text}`}>
                      {stageLeads.length}
                    </span>
                  </div>

                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
                    ))
                  ) : stageLeads.length === 0 ? (
                    <div className="py-16 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
                      <span className="text-4xl block mb-2">{stage.emoji}</span>
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No leads here</p>
                    </div>
                  ) : (
                    <SortableContext id={stage.id} items={stageLeads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                      {stageLeads.map((lead) => (
                        <SortableLeadCard key={lead.id} lead={lead} stage={stage} />
                      ))}
                    </SortableContext>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Desktop: horizontal Kanban */}
          <div className="hidden sm:flex h-full gap-4 overflow-x-auto px-4 py-4 pb-6">
            {STAGES.map((stage) => (
              <StageColumn key={stage.id} stage={stage} leads={getLeads(stage.id)} loading={loading} />
            ))}
          </div>
        </div>
      </DndContext>
    </div>
  );
}