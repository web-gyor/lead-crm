import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

// 🎯 SWAPPED: Old library alerts dropped for your modern app design custom tracker
import { useToast } from "../../hooks/useToast";

import { apiGet, apiPut } from "../../utils/api";
import { getISTDateString, getStatusBucket } from "../../utils/date";
import { SECTIONS, FINAL_STATUSES, SectionId, LEAD_STATUS } from "../../constants/leadStatus";
import { FollowUpLead, StaffUser, LeadSource } from "../../types/followup";

// ─── MODULE COMPONENTS SEPARATIONS SPLITS ───────────────────────────────────
import { FollowUpHeader } from "./components/FollowUpHeader";
import { FollowUpFilters } from "./components/FollowUpFilters";
import { FollowUpBoard } from "./components/FollowUpBoard";
import { NoteModal } from "./components/NoteModal";
import { MarkAllConfirm } from "./MarkAllConfirm";

function normaliseLead(l: FollowUpLead, sourceMap: Map<number, string>): FollowUpLead {
  return {
    ...l,
    assigned_user_name: l.assigned_user_name || l.source_name || "Unassigned",
    lead_source_name:
      l.lead_source_name ||
      l.source_name ||
      sourceMap.get(Number(l.lead_source_id)) ||
      "Unknown Source",
  };
}
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
const sameId = (a: number | string | undefined, b: number | string | undefined) => Number(a) === Number(b);

export default function FollowUps() {
  // 🎯 INJECT UNIFIED MODERN HOOK
  const { addToast } = useToast();

  const [leads, setLeads] = useState<FollowUpLead[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [noteLead, setNoteLead] = useState<FollowUpLead | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<SectionId>("overdue");
  const [showConfirm, setShowConfirm] = useState<boolean>(false);

  // Request Lock Mechanisms
  const isMutatingLock = useRef<boolean>(false);

  // Optimistic State Architecture with Auto-Expiry Tracker
  const optimisticState = useRef<Map<number, { patch: Record<string, any>; until: number }>>(new Map());
  const isUpdating = useRef<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [courseFilter, setCourseFilter] = useState<string>("");
  const [userFilter, setUserFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");

  // Cleans stale locks to safeguard component synchronization pipelines
  const enforceOptimisticCleanup = useCallback(() => {
    const now = Date.now();
    optimisticState.current.forEach((value, key) => {
      if (now > value.until) {
        optimisticState.current.delete(key);
      }
    });
  }, []);

  const uniqueCourses = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => {
      const course = (l.interested_course || "").toString().trim();
      if (course && course.toLowerCase() !== "null" && course.toLowerCase() !== "undefined") {
        set.add(course.toUpperCase());
      }
    });
    return Array.from(set).sort();
  }, [leads]);

  // ── Telemetry Loading Track Ingestion ──────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (silent && isUpdating.current) return;
    enforceOptimisticCleanup();

    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const localDate = getISTDateString();
      
      const [fuRes, staffRes, sourcesRes] = await Promise.all([
        apiGet(`/api/leads?status=Follow-up&limit=100&localDate=${localDate}`),
        apiGet("/api/users").catch(() => ({ data: [] })),
        apiGet("/api/lead-sources").catch(() => ({ data: [] })),
      ]);

      const rawLeads: FollowUpLead[] = fuRes?.leads ?? fuRes?.data ?? (Array.isArray(fuRes) ? fuRes : []);
      const rawSources: LeadSource[] = Array.isArray(sourcesRes) 
        ? sourcesRes 
        : (sourcesRes?.data ?? sourcesRes?.sources ?? sourcesRes?.channels ?? sourcesRes?.lead_sources ?? sourcesRes?.rows ?? []);

      const sm = new Map<number, string>();
      rawSources.forEach((s) => {
        const id = Number(s?.id ?? s?.source_id);
        const name = (s?.name || s?.source_name || "").trim();
        if (!isNaN(id) && name) sm.set(id, name);
      });

      const normalized = rawLeads.map((l) => {
        const cleanDate = l.next_follow_up_date ? String(l.next_follow_up_date).split("T")[0] : null;
        return normaliseLead({ ...l, next_follow_up_date: cleanDate }, sm);
      });

      const now = Date.now();
      const merged = normalized.map((l) => {
        const id = Number(l.id ?? l.lead_id);
        const entry = optimisticState.current.get(id);
        if (entry && entry.until > now) {
          return { ...l, ...entry.patch };
        }
        return l;
      });

      setLeads(merged);
      
      const rawStaff: StaffUser[] = Array.isArray(staffRes) ? staffRes : (staffRes?.data ?? staffRes?.users ?? []);
    const filteredStaff = rawStaff.filter((s) => {
  const rName = String(s.role?.name ?? s.role ?? s.role_name ?? "").toLowerCase();
  return rName.includes("counselor") || rName.includes("telecaller");
});
      
      setStaff(filteredStaff);
      setSources(rawSources.length > 0 ? rawSources : FALLBACK_SOURCES);

    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("Central operational sync core breakdown: ", err);
      }
      // ⚡ UPDATED: Standardized alert trigger
      addToast("Failed to load follow-ups", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enforceOptimisticCleanup, addToast]);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  useEffect(() => {
    if (leads.length > 0) {
      console.log("DEBUG: First 3 leads for bucket analysis:", leads.slice(0, 3).map(l => ({
        name: l.full_name,
        date: l.next_follow_up_date,
        bucket: getStatusBucket(l.next_follow_up_date)
      })));
    }
  }, [leads]);

  // ── Dynamic Filtration Track Calculation ───────────────────────────────────
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (!(l.full_name ?? "").toLowerCase().includes(q) && !(l.phone ?? "").includes(q)) return false;
      }
      if (courseFilter && (l.interested_course ?? "").trim().toUpperCase() !== courseFilter) return false;
      if (userFilter && String(l.assigned_user_id) !== userFilter) return false;
      if (sourceFilter && String(l.lead_source_id) !== sourceFilter) return false;
      return true;
    });
  }, [leads, searchTerm, courseFilter, userFilter, sourceFilter]);

  const hasFilters = !!(searchTerm || courseFilter || userFilter || sourceFilter);
  const handleClearFilters = useCallback(() => { 
    setSearchTerm(""); setCourseFilter(""); setUserFilter(""); setSourceFilter(""); 
  }, []);

  const todayIST = useMemo(() => getISTDateString(), []);

  const getBucketLeads = useCallback((sid: SectionId) => {
    return filteredLeads.filter(
      l => getStatusBucket(l.next_follow_up_date, todayIST) === sid
    );
  }, [filteredLeads, todayIST]);

  // ── Mutational Core API Transaction Hooks ─────────────────────────────────
  const handleMarkDone = async (leadId: number) => {
    if (isMutatingLock.current) return;
    const nId = Number(leadId);
    const lead = leads.find(l => sameId(l.id ?? l.lead_id, nId));
    if (!lead) return;
    
    const status = (lead.lead_status ?? "").trim();
    if (status === LEAD_STATUS.FOLLOW_UP) { 
      // ⚡ UPDATED: Standardized alert trigger
      addToast("Change the status first before marking as done", "error"); 
      return; 
    }
    
    isMutatingLock.current = true;
    setProcessingId(nId);
    try {
      await apiPut(`/api/leads/${nId}`, {
        lead_status: status,
        next_follow_up_date: null,
        last_follow_up_date: getISTDateString(),
      });
      setLeads(prev => prev.filter(l => !sameId(l.id ?? l.lead_id, nId)));
      // ⚡ UPDATED: Standardized alert trigger
      addToast("Marked as done", "success");
    } catch { 
      // ⚡ UPDATED: Standardized alert trigger
      addToast("Failed to update lead", "error"); 
    } finally { 
      setProcessingId(null);
      isMutatingLock.current = false;
    }
  };

  const handleStatusChange = async (leadId: number, newStatus: string) => {
    if (isMutatingLock.current) return;
    const nId = Number(leadId);
   
    if (FINAL_STATUSES.has(newStatus)) {
      setLeads(prev => prev.filter(l => !sameId(l.id ?? l.lead_id, nId)));
    } else {
      optimisticState.current.set(nId, {
        patch: { lead_status: newStatus },
        until: Date.now() + 15_000,
      });
      setLeads(prev => prev.map(l => sameId(l.id ?? l.lead_id, nId) ? { ...l, lead_status: newStatus } : l));
    }
   
    isUpdating.current = true;
    isMutatingLock.current = true;
    try {
      await apiPut(`/api/leads/${nId}`, { lead_status: newStatus });
      // ⚡ UPDATED: Standardized alert trigger
      if (!FINAL_STATUSES.has(newStatus)) addToast("Status updated", "success");
    } catch {
      optimisticState.current.delete(nId);
      // ⚡ UPDATED: Standardized alert trigger
      addToast("Update failed", "error");
      fetchData(true);
    } finally {
      isUpdating.current = false;
      isMutatingLock.current = false;
    }
  };

  const handleReschedule = async (leadId: number, newDate: string) => {
    if (!newDate || isMutatingLock.current) return;
    const nId = Number(leadId);
   
    const patch = { next_follow_up_date: newDate };
    optimisticState.current.set(nId, { patch, until: Date.now() + 30_000 });
    setLeads(prev => prev.map(l => sameId(l.id ?? l.lead_id, nId) ? { ...l, ...patch } : l));
   
    isUpdating.current = true;
    isMutatingLock.current = true;
    try {
      await apiPut(`/api/leads/${nId}`, patch);
      // ⚡ UPDATED: Standardized alert trigger
      addToast(`Rescheduled → ${newDate}`, "success");
      setTimeout(() => fetchData(true), 800);
    } catch {
      // ⚡ UPDATED: Standardized alert trigger
      addToast("Reschedule failed", "error");
      optimisticState.current.delete(nId);
      fetchData(true);
    } finally {
      isUpdating.current = false;
      isMutatingLock.current = false;
    }
  };

  const handleNoteSave = async (text: string) => {
    if (!noteLead || isMutatingLock.current) return;
    const nId = Number(noteLead.id ?? noteLead.lead_id);

    isUpdating.current = true;
    isMutatingLock.current = true;
    optimisticState.current.set(nId, {
      patch: { counselor_remarks: text },
      until: Date.now() + 10000,
    });

    try {
      await apiPut(`/api/leads/${nId}`, { counselor_remarks: text });
      setLeads(prev => prev.map(l => sameId(l.id ?? l.lead_id, nId) ? { ...l, counselor_remarks: text } : l));
      setNoteLead(null);
      // ⚡ UPDATED: Standardized alert trigger
      addToast("Note saved", "success");
    } catch {
      setTimeout(() => { optimisticState.current.delete(nId); }, 5000);
      // ⚡ UPDATED: Standardized alert trigger
      addToast("Save failed", "error");
    } finally {
      isUpdating.current = false;
      isMutatingLock.current = false;
    }
  };

  const handleMarkAllDone = async () => {
    if (isMutatingLock.current) return;
    setShowConfirm(false);
    if (!filteredLeads.length) return;
    
    setLoading(true);
    isMutatingLock.current = true;
    try {
      const todayString = getISTDateString();
      await Promise.allSettled(
        filteredLeads.map(l =>
          apiPut(`/api/leads/${Number(l.id ?? l.lead_id)}`, {
            next_follow_up_date: null,
            last_follow_up_date: todayString,
          })
        )
      );
      // ⚡ UPDATED: Standardized alert trigger
      addToast(`${filteredLeads.length} follow-ups cleared`, "success");
      fetchData();
    } catch { 
      // ⚡ UPDATED: Standardized alert trigger
      addToast("Some updates failed", "error"); 
      setLoading(false); 
    } finally {
      isMutatingLock.current = false;
    }
  };

  const handleOpenConfirm = useCallback(() => setShowConfirm(true), []);
  const handleCloseConfirm = useCallback(() => setShowConfirm(false), []);
  const handleCloseNoteModal = useCallback(() => setNoteLead(null), []);
  const handleToggleFilters = useCallback(() => setShowFilters(v => !v), []);
  const handleRefreshClick = useCallback(() => { setRefreshing(true); fetchData(true); }, [fetchData]);

  return (
    <div className="space-y-4 pb-8 antialiased">
      {/* ❌ REMOVED OLD DIRECT TOASTER COMPONENT INJECTION OUT OF RENDER FLOW */}
      
      {/* Header Framework Component Wrapper */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="w-full px-5 pt-4 pb-1">
          <FollowUpHeader 
            filteredLeads={filteredLeads}
            getBucketLeads={getBucketLeads}
            refreshing={refreshing}
            onRefresh={handleRefreshClick}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            hasFilters={Boolean(showFilters)}
            onOpenConfirm={handleOpenConfirm}
          />
        </div>

        {showFilters && (
          <FollowUpFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            userFilter={userFilter}
            setUserFilter={setUserFilter}
            courseFilter={courseFilter}
            setCourseFilter={setCourseFilter}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
            staff={staff}
            uniqueCourses={uniqueCourses}
            sources={sources}
            hasFilters={hasFilters}
            clearFilters={handleClearFilters}
          />
        )}
      </div>

      {/* Responsive Section Controller Navigation Tabs for Mobile viewports */}
      <div className="lg:hidden flex bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm select-none">
        {SECTIONS.map(s => {
          const count = getBucketLeads(s.id).length;
          const isActive = activeSection === s.id;
          return (
            <button 
              key={s.id} 
              type="button" 
              onClick={() => setActiveSection(s.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 border-b-2 transition-all cursor-pointer ${isActive ? `border-current ${s.color}` : "border-transparent text-gray-400"}`}
            >
              <span className="text-base">{s.emoji}</span>
              <span className="text-[9px] font-black uppercase tracking-widest">{s.label}</span>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isActive ? `${s.bg} ${s.color}` : "bg-gray-100 text-gray-400"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Board Layout Deck */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 select-none">
          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">Loading follow-ups…</p>
        </div>
      ) : (
        <FollowUpBoard
          getBucketLeads={getBucketLeads}
          activeSection={activeSection}
          processingId={processingId}
          onMarkDone={handleMarkDone}
          onOpenNote={setNoteLead}
          onReschedule={handleReschedule}
          onStatusChange={handleStatusChange}
        />
      )}

      {noteLead && (
        <NoteModal 
          lead={noteLead} 
          onClose={handleCloseNoteModal} 
          onSave={handleNoteSave} 
        />
      )}
      
      {showConfirm && (
        <MarkAllConfirm 
          count={filteredLeads.length} 
          onConfirm={handleMarkAllDone} 
          onCancel={handleCloseConfirm} 
        />
      )}
    </div>
  );
}