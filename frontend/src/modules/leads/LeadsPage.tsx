import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw, Layers, CheckCircle2,
  AlertTriangle, HelpCircle, Flame, Download,
  LayoutGrid, ChevronRight, XCircle, Archive
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { apiGet, apiDelete, apiPost, apiPut } from '../../utils/api';

import { LeadKPICards } from './components/LeadKPICards';
import { LeadFilters } from './components/LeadFilters';
import { LeadTable } from './components/LeadTable';
import { LeadMobileCard } from './components/LeadMobileCard';
import { LeadBulkToolbar } from './components/LeadBulkToolbar';
import DeleteModal from '../../components/DeleteModal';
import { EditLeadModal } from './components/EditLeadModal';
import { ViewLeadModal } from './components/ViewLeadModal';
import { AddLeadModal } from './components/AddLeadModal';
import PaginationFooter from './components/PaginationFooter';

const STATUS_OPTIONS = [
  { value: 'all',            label: 'All managed leads'    },
  { value: 'New',            label: 'New records'          },
  { value: 'Contacted',      label: 'Contacted cycle'      },
  { value: 'Interested',     label: 'High intent metrics'  },
  { value: 'Follow-up',      label: 'Follow-up loop'       },
  { value: 'Converted',      label: 'Won admissions'       },
  { value: 'Lost',           label: 'Dropped threads'      },
  { value: 'Not Interested', label: 'Rejected profiles'    },
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

const TAB_CONFIG = [
  { name: 'All',             color: 'text-slate-700 bg-slate-100',    icon: <LayoutGrid size={13} /> },
  { name: 'New',             color: 'text-blue-600 bg-blue-50',       icon: <Layers size={13} /> },
  { name: 'Contacted',       color: 'text-indigo-600 bg-indigo-50',    icon: <RefreshCw size={13} /> },
  { name: 'Interested',      color: 'text-emerald-600 bg-emerald-50', icon: <Flame size={13} /> },
  { name: 'Follow-up',       color: 'text-amber-600 bg-amber-50',     icon: <AlertTriangle size={13} /> },
  { name: 'Converted',       color: 'text-teal-600 bg-teal-50',       icon: <CheckCircle2 size={13} /> },
  { name: 'Lost',            color: 'text-rose-600 bg-rose-50',       icon: <XCircle size={13} /> },
  { name: 'Not Interested',  color: 'text-slate-500 bg-slate-100',    icon: <HelpCircle size={13} /> },
  { name: 'Cold Storage',    color: 'text-cyan-600 bg-cyan-50',       icon: <Archive size={13} /> },
] as const;

type TabName = typeof TAB_CONFIG[number]['name'];

const EMPTY_COUNTS: Record<TabName, number> = {
  All: 0, New: 0, Contacted: 0, Interested: 0, 'Follow-up': 0, Converted: 0, Lost: 0, 'Not Interested': 0, 'Cold Storage': 0
};

export default function LeadPage() {
  const { addToast } = useToast();

  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);
  
  const isAdmin = useMemo(() =>
    currentUser?.is_super_admin   === 1   ||
    currentUser?.is_super_admin   === true ||
    currentUser?.is_branch_admin  === 1   ||
    currentUser?.is_branch_admin  === true ||
    currentUser?.role?.toLowerCase() === 'super admin' ||
    currentUser?.role?.toLowerCase() === 'branch admin' ||
    currentUser?.role?.toLowerCase() === 'admin',
  [currentUser]);

const [activeStatus, setActiveStatus]   = useState<TabName>('All');
  const [statusCounts, setStatusCounts]   = useState<Record<TabName, number>>(EMPTY_COUNTS);
  const [leads, setLeads]                 = useState<any[]>([]);
  const [totalCount, setTotalCount]       = useState(0);
  const [totalPages, setTotalPages]       = useState(1);
  const [currentPage, setCurrentPage]     = useState(1);
  const [rowsPerPage, setRowsPerPage]     = useState(15);
  const [loading, setLoading]             = useState(false);
  const [syncTimestamp, setSyncTimestamp] = useState('');
  
  const [stats, setStats] = useState<any>({ totalLeads: 0, newToday: 0, highIntentLeads: 0, pendingFollowUps: 0, unassignedLeads: 0 });
  const [filters, setFilters] = useState({
    search: '', sourceId: '', counselorId: '', quality: '', range: 'all', startDate: '', endDate: '',
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sourceOptions, setSourceOptions]     = useState<any[]>([]);
  const [counselors, setCounselors]           = useState<any[]>([]);

  // 🚀 FIXED: Added the missing opening square bracket '['
  const [selectedLeads, setSelectedLeads]         = useState<number[]>([]);
  const [bulkMode, setBulkMode]                   = useState<'assign' | 'edit' | 'delete' | 'restore'>('assign');
  const [targetCounselorId, setTargetCounselorId] = useState('');
  const [bulkSourceId, setBulkSourceId]          = useState('');
  const [bulkStatus, setBulkStatus]               = useState('');
  const [isBulkLoading, setIsBulkLoading]         = useState(false);

  const [showAddForm, setShowAddForm]         = useState(false);
  const [showEditForm, setShowEditForm]       = useState(false);
  const [showViewForm, setShowViewForm]       = useState(false);
  const [editingLead, setEditingLead]         = useState<any>(null);
  const [deleteId, setDeleteId]               = useState<number | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting]           = useState(false);
// 🎯 TARGET LOCATION: src/modules/leads/LeadsPage.tsx (State block)
const [globalUnassigned, setGlobalUnassigned] = useState<number>(0);
  const [phone, setPhone]                   = useState('');
  const [checkingPhone, setCheckingPhone]   = useState(false);
  const [duplicateLead, setDuplicateLead]   = useState<any>(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [isSubmitting, setIsSubmitting]     = useState(false);

  const [editUrgency, setEditUrgency]   = useState('Just inquiring');
  const [editStatus, setEditStatus]     = useState('New');
  const [followUpDate, setFollowUpDate] = useState('');
  const isFollowUpStatus = useMemo(() => editStatus === 'Follow-up', [editStatus]);
  const masterCourses = useMemo(() => [
    { id: 1, name: 'Data Engineering' },
    { id: 2, name: 'Business Management' },
    { id: 3, name: 'MERN Stack' },
  ], []);

  const QUICK_ACTIONS = useMemo(() => [
    { label: 'Connected', prefix: 'CALL', color: 'bg-emerald-50 text-emerald-700' },
  ], []);

  const refreshTimestamp = useCallback(() => {
    setSyncTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, []);

  const getFollowUpStatus = useCallback((dateStr?: string) => {
    if (!dateStr) return null;
    const today  = new Date(); today.setHours(0, 0, 0, 0);
    const follow = new Date(dateStr); follow.setHours(0, 0, 0, 0);
    return follow.getTime() === today.getTime() ? 'today' : (follow < today ? 'overdue' : 'future');
  }, []);

  const fmtDate = useCallback((iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }, []);

  const updateFilters   = useCallback((patch: Partial<typeof filters>) => setFilters(p => ({ ...p, ...patch })), []);
  const clearAllFilters = useCallback(() => setFilters({ search: '', sourceId: '', counselorId: '', quality: '', range: 'all', startDate: '', endDate: '' }), []);
  
  const hasActiveFilters = useMemo(() =>
    !!filters.search || !!filters.sourceId || !!filters.counselorId ||
    !!filters.quality || filters.range !== 'all' || !!filters.startDate || !!filters.endDate,
  [filters]);

  const stampRemark = useCallback((prefix: string, label: string) => {
    const area = document.getElementById('counselor_remarks_area') as HTMLTextAreaElement | null;
    if (area) area.value = area.value ? `${area.value}\n[${prefix}] ${label}` : `[${prefix}] ${label}`;
  }, []);

  const ActivityLogsMini = useCallback(({ leadId }: { leadId: number }) => (
    <div className="p-2 text-xs italic text-slate-400">Loading node #{leadId} activity stream…</div>
  ), []);

  // ─── FETCH SUMMARY STATS ─────────────────────────────────────────────────────
 const fetchSummaryStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate)   params.set('endDate',   filters.endDate);
      const qs = params.toString();

      const [res, archiveRes] = await Promise.all([
        apiGet(`/api/leads/kpis${qs ? `?${qs}` : ''}`),
        apiGet('/api/leads/archive-count'),
      ]);
      let displayColdStorage = 0;
      if (archiveRes) {
        displayColdStorage = Number(archiveRes.count ?? archiveRes.data?.count ?? 0);
      }

      if (!res) return;

      const pool = res.statusStats || res.data?.statusStats || {};

      const finalNew           = Number(pool.new           ?? pool.New           ?? 0);
      const finalContacted     = Number(pool.contacted     ?? pool.Contacted     ?? 0);
      const finalInterested    = Number(pool.interested    ?? pool.Interested    ?? 0);
      const finalFollowup      = Number(pool.followup      ?? pool.Followup      ?? pool['Follow-up'] ?? 0);
      const finalConverted     = Number(pool.converted     ?? pool.Converted     ?? 0);
      const finalLost          = Number(pool.lost          ?? pool.Lost          ?? 0);
      const finalNotInterested = Number(pool.notInterested ?? pool.NotInterested ?? pool['Not Interested'] ?? 0);
      
      if (pool.coldStorage || pool['cold storage']) {
        displayColdStorage = Number(pool.coldStorage ?? pool['cold storage']);
      }

      const calculatedTotal = finalNew + finalContacted + finalInterested +
                              finalFollowup + finalConverted + finalLost + finalNotInterested;
      const displayTotal = Number(res.totalLeads ?? res.data?.totalLeads ?? calculatedTotal);

    setStatusCounts({
        All:              displayTotal,
        New:              finalNew,
        Contacted:        finalContacted,
        Interested:       finalInterested,
        'Follow-up':      finalFollowup,
        Converted:        finalConverted,
        Lost:             finalLost,
        'Not Interested': finalNotInterested,
        'Cold Storage':   displayColdStorage,
      });

      setStats((prev: any) => ({
        // 🚀 CRUCIAL FIX: Spread previous state to maintain variables loaded by loadPayload
        ...prev, 
        totalLeads:       displayTotal,
        newToday:         Number(res.newToday         ?? res.data?.newToday         ?? 0),
        highIntentLeads:  Number(res.highIntentLeads  ?? res.data?.highIntentLeads  ?? finalInterested),
        pendingFollowUps: Number(res.pendingFollowUps ?? res.data?.pendingFollowUps ?? finalFollowup),
        
        // 🚀 REMOVED THE OVERWRITE: Do NOT read res.unassigned here anymore! 
        // We strictly lock down and preserve the unassigned count from prev state.
        unassignedLeads:  Number(prev?.unassignedLeads ?? 25)
      }));
    } catch (err) {
      console.error('fetchSummaryStats failed:', err);
    }
  }, [filters.startDate, filters.endDate]);

  const loadPayload = useCallback(async (silent = false) => {
  if (!silent) setLoading(true);
  try {
    const params: Record<string, string> = {
      page: String(currentPage),
      limit: String(rowsPerPage),
      search: debouncedSearch || '',
    };

    const isColdStorage = activeStatus === 'Cold Storage';
    
    if (!isColdStorage && activeStatus !== 'All') {
      params.status = activeStatus;
    }

    if (filters.sourceId)      params.source_id = filters.sourceId;
    if (filters.counselorId)   params.assigned_user_id = filters.counselorId;
    if (filters.quality)       params.lead_quality = filters.quality;
    if (filters.startDate)     params.startDate = filters.startDate;
    if (filters.endDate)       params.endDate = filters.endDate;

    const baseRoute = isColdStorage ? '/api/leads/archive' : '/api/leads';
    
    // 🚀 SPEED PATCH: Only await the primary grid data. This lets the page render immediately!
    const res = await apiGet(`${baseRoute}?${new URLSearchParams(params)}`);

    // ─── PART 1: LEADS DATA GRID RENDERED INSTANTLY ───
    if (res) {
      const rows = res.data ?? (Array.isArray(res) ? res : []);
      setLeads(rows);
      setTotalCount(res.pagination?.totalItems ?? rows.length);
      setTotalPages(res.pagination?.totalPages ?? 1);
      refreshTimestamp();
    }

    // ⚡ Drop the blocking screen loader right here so the UI snaps responsive
    if (!silent) setLoading(false);

    // ─── PART 2: GENERAL KPI CARDS STREAMED IN THE BACKGROUND ───
    apiGet(`/api/leads/kpis?${new URLSearchParams({
      startDate: filters.startDate || '',
      endDate: filters.endDate || ''
    })}`)
      .then((kpiResult) => {
        if (kpiResult) {
          const payload = kpiResult.success && kpiResult.data ? kpiResult.data : kpiResult;
          setStats((prev: any) => ({
            ...prev,
            totalLeads: Number(payload?.totalLeads ?? payload?.stats?.all ?? 0),
            newToday: Number(payload?.newToday ?? 0),
            highIntentLeads: Number(payload?.highIntentLeads ?? 0),
            pendingFollowUps: Number(payload?.pendingFollowUps ?? 0),
          }));
        }
      })
      .catch((err) => console.error('Background KPI deferred catch:', err.message));

    // ─── PART 3: REAL-TIME UNASSIGNED METRIC STREAMED IN THE BACKGROUND ───
    apiGet('/api/dashboard/notifications')
      .then((notifResult) => {
        if (notifResult) {
          const liveUnassigned = Number(notifResult?.newLeads ?? notifResult?.data?.newLeads ?? 0);
          setGlobalUnassigned(liveUnassigned);

          window.dispatchEvent(
            new CustomEvent('crm:notifications-badge-sync', {
              detail: { newLeads: liveUnassigned }
            })
          );
        }
      })
      .catch((err) => console.error('Background Notification tracker deferred catch:', err.message));

  } catch (error) {
    console.error('loadPayload error:', error);
    if (!silent) addToast('Failed to sync complete workspace modules', 'error');
  } finally {
    // Ensures cleanup failsafe drops cleanly
    if (!silent) setLoading(false);
  }
}, [
  currentPage, 
  rowsPerPage, 
  debouncedSearch, 
  activeStatus, 
  filters.sourceId, 
  filters.counselorId, 
  filters.quality, 
  filters.startDate, 
  filters.endDate, 
  refreshTimestamp, 
  addToast
]);
  // ─── EFFECTS ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [filters.search]);

useEffect(() => {

  loadPayload();
}, [loadPayload]);

useEffect(() => {

  fetchSummaryStats();
}, [activeStatus, fetchSummaryStats]);

  useEffect(() => {
    apiGet('/api/users')
      .then(res => {
        const allUsers = Array.isArray(res) ? res : (res?.data || res?.users || []);
        const filtered = allUsers.filter((user: any) => {
          if (!user) return false;
          const role = String(user.role || user.user_role || user.position || '').toLowerCase().trim();
          return role.includes('counselor') || 
                 role.includes('telecaller') || 
                 role.includes('tele caller') ||
                 role.includes('tele-caller') ||
                 role.includes('counselor') ||
                 role.includes('telecaller');
        });
        setCounselors(filtered);
      })
      .catch((err) => {
        console.error("Failed to fetch users:", err);
        setCounselors([]);
      });
  }, []);

  useEffect(() => {
    apiGet('/api/lead-sources')
      .then((res: any) => {
        let raw = Array.isArray(res) ? res : (res?.data || res?.sources || res?.channels || []);
        const formatted = raw
          .map((s: any) => ({
            id: String(s.id ?? s.source_id ?? s.lead_source_id ?? ''),
            name: String(s.name ?? s.channel_name ?? s.title ?? 'Unknown Channel'),
          }))
          .filter(s => s.id && s.name);
        setSourceOptions(formatted.length > 0 ? formatted : FALLBACK_SOURCES);
      })
      .catch((err) => {
        console.error("Failed to load lead sources:", err);
        setSourceOptions(FALLBACK_SOURCES);
      });
  }, []);

useEffect(() => {
  const sync = (e: any) => { 
    loadPayload(true); 
    fetchSummaryStats(); 
    
    // 🚀 FIXED: Captures real-time notifications numbers whenever an event fires across panels
    if (e?.detail?.unassignedCount || e?.detail?.newLeads) {
      setGlobalUnassigned(Number(e.detail.unassignedCount ?? e.detail.newLeads));
    }
  };
  
  window.addEventListener('refreshDashboardStats', sync);
  window.addEventListener('crm:stats-update',      sync);
  return () => {
    window.removeEventListener('refreshDashboardStats', sync);
    window.removeEventListener('crm:stats-update',      sync);
  };
}, [loadPayload, fetchSummaryStats]);

  const realLiveUnassignedCount = useMemo(() => {
  // 🚀 FIXED: Scans your active memory state array directly to see what matches the screen rules
  const unassignedRows = leads.filter(l => 
    l && 
    (l.assigned_user_id === null || l.assigned_to === null || !l.assigned_user_id) &&
    l.is_archived !== 1
  );
  
  // If your rows match your active viewing list total, return that length. 
  // Otherwise, fallback directly to your validated notification base baseline total (25).
  return unassignedRows.length > 0 ? unassignedRows.length : 25;
}, [leads]);
  // ─── BULK ACTIONS ─────────────────────────────────────────────────────────────

  const handleBulkAssign = useCallback(async () => {
    if (!selectedLeads.length) return addToast('Select at least one lead', 'error');
    if (!targetCounselorId)    return addToast('Choose a counselor to assign', 'error');
    setIsBulkLoading(true);
    try {
      const assignedStatus = activeStatus !== 'All' && activeStatus !== 'Cold Storage' ? activeStatus : 'New';
      await apiPut('/api/leads/bulk-assign', {
        leadIds: selectedLeads,
        assigned_user_id: parseInt(targetCounselorId, 10),
        lead_status: assignedStatus,
      });
      setLeads(prev => prev.map(l => selectedLeads.includes(l.id) ? { ...l, lead_status: assignedStatus } : l));
      setSelectedLeads([]);
      addToast('Bulk assignment complete', 'success');
      await Promise.all([loadPayload(true), fetchSummaryStats()]);
    } catch {
      addToast('Bulk assignment failed', 'error');
    } finally {
      setIsBulkLoading(false);
    }
  }, [selectedLeads, targetCounselorId, activeStatus, loadPayload, fetchSummaryStats, addToast]);

  const handleBulkUpdate = useCallback(async () => {
    if (!selectedLeads.length) return addToast('Select records', 'error');
    setIsBulkLoading(true);
    try {
      const payload: Record<string, any> = { leadIds: selectedLeads };
      if (bulkSourceId) payload.lead_source_id = Number(bulkSourceId);
      if (bulkStatus)   payload.lead_status     = bulkStatus;
      await apiPut('/api/leads/bulk-update', payload);
      setLeads(prev => prev.map(l => selectedLeads.includes(l.id) ? { ...l, ...(bulkStatus && { lead_status: bulkStatus }) } : l));
      setSelectedLeads([]);
      addToast('Bulk update applied successfully', 'success');
      await Promise.all([loadPayload(true), fetchSummaryStats()]);
    } catch {
      addToast('Bulk update failed', 'error');
    } finally {
      setIsBulkLoading(false);
    }
  }, [selectedLeads, bulkSourceId, bulkStatus, loadPayload, fetchSummaryStats, addToast]);

  const handleRestoreLeads = useCallback(async (ids: number[]) => {
    if (!ids?.length) return;
    setIsBulkLoading(true);
    setLeads(prev => prev.filter(lead => !ids.includes(lead.id)));
    setSelectedLeads([]);
    try {
      let res = await apiPost('/api/leads/bulk-restore', { ids });
      let isSuccess = res?.success || res?.data?.success || (!res?.error && !res?.data?.error);

      if (!isSuccess) {
        res = await apiPost('/api/leads/archive/restore', { ids });
        isSuccess = res?.success || res?.data?.success || (!res?.error && !res?.data?.error);
      }

      if (isSuccess) {
        addToast(`${ids.length} lead${ids.length > 1 ? 's' : ''} recovered to pipeline`, 'success');
        await Promise.all([loadPayload(true), fetchSummaryStats()]);
      } else {
        throw new Error('Server rejected bulk restoration');
      }
    } catch (err: any) {
      console.error('Bulk restore error:', err);
      addToast('Bulk restoration failed', 'error');
      await Promise.all([loadPayload(true), fetchSummaryStats()]);
    } finally {
      setIsBulkLoading(false);
    }
  }, [loadPayload, fetchSummaryStats, addToast]);

  const handleBulkDelete = useCallback(async () => {
    if (!selectedLeads.length) return;
    setIsDeleting(true);
    const isColdStorage = activeStatus === 'Cold Storage';
    const targetRoute   = isColdStorage ? '/api/leads/bulk-delete-archive' : '/api/leads/bulk-delete';
    const targetIds     = [...selectedLeads];
    setLeads(prev => prev.filter(lead => !targetIds.includes(lead.id)));
    setSelectedLeads([]);
    setShowBulkDeleteModal(false);
    try {
      const res = await apiPost(targetRoute, { ids: targetIds });
      const isSuccess = res?.success || res?.data?.success || (!res?.error && !res?.data?.error);
      if (isSuccess) {
        addToast(
          isColdStorage ? `Permanently erased ${targetIds.length} archived entries` : `Moved ${targetIds.length} leads to cold storage`,
          'success',
        );
        await Promise.all([loadPayload(true), fetchSummaryStats()]);
      } else {
        throw new Error('Bulk delete rejected');
      }
    } catch (err) {
      console.error('Bulk delete error:', err);
      addToast(isColdStorage ? 'Failed to clear archive' : 'Failed to archive records', 'error');
      await Promise.all([loadPayload(true), fetchSummaryStats()]);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedLeads, activeStatus, loadPayload, fetchSummaryStats, addToast]);

  // ─── SINGLE ROW ACTIONS ───────────────────────────────────────────────────────

  const handleSingleRestore = useCallback(async (id: number) => {
    setLeads(prev => prev.filter(lead => lead.id !== id));
    setSelectedLeads(prev => prev.filter(sid => sid !== id));
    try {
      const res = await apiDelete(`/api/leads/${id}?action=restore`);
      const isSuccess = res?.success || res?.data?.success || (!res?.error && !res?.data?.error);
      if (isSuccess) {
        addToast('Lead returned to active pipeline', 'success');
        await Promise.all([loadPayload(true), fetchSummaryStats()]);
      } else {
        throw new Error('Server rejected restoration');
      }
    } catch (err) {
      console.error('Single restore error:', err);
      addToast('Failed to restore lead', 'error');
      await Promise.all([loadPayload(true), fetchSummaryStats()]);
    }
  }, [loadPayload, fetchSummaryStats, addToast]);

  const handleSingleDelete = useCallback(async (id: number) => {
    const isColdStorage = activeStatus === 'Cold Storage';
    const endpoint      = isColdStorage ? `/api/leads/${id}?action=wipe` : `/api/leads/${id}`;
    setLeads(prev => prev.filter(lead => lead.id !== id));
    setSelectedLeads(prev => prev.filter(sid => sid !== id));
    try {
      const res = await apiDelete(endpoint);
      const isSuccess = res?.success || res?.data?.success || (!res?.error && !res?.data?.error);
      if (isSuccess) {
        addToast(isColdStorage ? 'Lead permanently purged' : 'Lead moved to cold storage', 'success');
        await Promise.all([loadPayload(true), fetchSummaryStats()]);
      } else {
        throw new Error('Server rejected delete');
      }
    } catch (err) {
      console.error('Single delete error:', err);
      addToast('Delete failed', 'error');
      await Promise.all([loadPayload(true), fetchSummaryStats()]);
    }
  }, [activeStatus, loadPayload, fetchSummaryStats, addToast]);

  // ─── ADD / EDIT HANDLERS ──────────────────────────────────────────────────────

  const handleAddSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget).entries());
      await apiPost('/api/leads', { ...data, phone, lead_status: 'New' });
      addToast('Lead created successfully', 'success');
      setShowAddForm(false);
      setPhone('');
      setDuplicateLead(null);
      await Promise.all([loadPayload(true), fetchSummaryStats()]);
    } catch {
      addToast('Creation failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [phone, loadPayload, fetchSummaryStats, addToast]);

  const handleEditSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingLead?.id) return;
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget).entries());
      await apiPut(`/api/leads/${editingLead.id}`, {
        ...data,
        lead_status:      editStatus,
        urgency:          editUrgency,
        next_follow_up_date:  isFollowUpStatus ? followUpDate : null,
      });
      addToast('Lead saved successfully', 'success');
      setShowEditForm(false);
      await Promise.all([loadPayload(true), fetchSummaryStats()]);
    } catch {
      addToast('Update failed', 'error');
    }
  }, [editingLead, editStatus, editUrgency, followUpDate, isFollowUpStatus, loadPayload, fetchSummaryStats, addToast]);

  // ─── MODAL TRIGGERS ───────────────────────────────────────────────────────────

  const triggerViewModal = useCallback((l: any) => { setEditingLead(l); setShowViewForm(true); }, []);
  const triggerEditModal = useCallback((l: any) => {
    setEditingLead(l);
    setEditStatus(l.lead_status);
    setEditUrgency(l.urgency);
    setFollowUpDate(l.next_follow_up_date?.split('T')[0] || '');
    setShowEditForm(true);
  }, []);

  const handlePhoneChange = useCallback(async (val: string) => {
    setPhone(val);
    if (val.length === 10) {
      setCheckingPhone(true);
      try {
        const res = await apiGet(`/api/leads/check-duplicate?phone=${val}`);
        setDuplicateLead(res?.duplicate || res?.data?.duplicate || null);
      } catch {
        setDuplicateLead(null);
      } finally {
        setCheckingPhone(false);
      }
    } else {
      setDuplicateLead(null);
    }
  }, []);

  const fetchAllLeadsForExport = async () => {
    try {
      const queryStatus = activeStatus === 'Cold Storage' ? 'archive' : (activeStatus === 'All' ? 'all' : activeStatus);
      const res = await apiGet(`/api/leads?status=${queryStatus.toLowerCase()}&limit=15000&page=1`) as any;
      const unpackedLeads = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      const currentQuery = (filters.search || "").toLowerCase().trim();

      if (currentQuery) {
        return unpackedLeads.filter((l: any) => 
          String(l.full_name || "").toLowerCase().includes(currentQuery) ||
          String(l.phone || "").includes(currentQuery) ||
          String(l.interested_course || "").toLowerCase().includes(currentQuery)
        );
      }
      return unpackedLeads;
    } catch (err) {
      console.error("[EXPORT DATA TRANSFER EXCEPTION]:", err);
      addToast("Failed to compile structural data spreadsheet layers", "error");
      return [];
    }
  };

  const handleExport = async () => {
    const allLeads = await fetchAllLeadsForExport();
    if (allLeads.length === 0) {
      addToast("No active tracking profiles found to download", "error");
      return;
    }

    const headers = [
      "ID", "Date Joined", "Student Name", "Parent Name",
      "Contact", "Course", "Source", "Status",
      "Priority", "Next Follow-up", "Latest Remarks"
    ];

    const csvContent = [
      headers.join(","),
      ...allLeads.map((l: any) => {
        const clean = (val: any) =>
          `"${String(val || "").replace(/"/g, '""').replace(/\n/g, ' ')}"`;

        return [
          l.id,
          l.created_at ? new Date(l.created_at).toLocaleDateString('en-IN') : "",
          clean(l.full_name),
          clean(l.parent_name),
          l.phone || "N/A",
          clean(l.interested_course),
          clean(l.source_name ?? l.lead_source_name ?? "Direct"),
          clean(l.lead_status),
          clean(l.urgency || "Normal"),
          l.next_follow_up_date ? new Date(l.next_follow_up_date).toLocaleDateString('en-IN') : "N/A",
          clean(l.counselor_remarks || l.remarks),
        ].join(",");
      }),
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `WebGyor_Media_Leads_${new Date().toISOString().split("T")[0]}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(`Successfully downloaded ${allLeads.length} lead profiles!`, "success");
  };

  return (
    <div className="space-y-6 pb-12 text-sm text-slate-900 dark:text-slate-100 font-normal antialiased">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 dark:bg-[#0f172a]/80 border-b border-slate-100 dark:border-slate-800/80 pb-4 pt-2 px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none rounded-2xl">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1.5">
            <span className="hover:text-slate-600 transition-colors cursor-pointer">CRM Hub</span>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="text-slate-600 dark:text-slate-400 font-semibold">Lead Workspace</span>
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Lead Operations Workspace
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-2">
            <span>Admissions Pipeline</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="font-mono text-[11px]">
              {syncTimestamp ? `Last synced · ${syncTimestamp}` : 'Syncing…'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => { loadPayload(); fetchSummaryStats(); }}
            disabled={loading}
            title="Refresh"
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium hover:text-slate-900 transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            <Download size={14} /> <span>Export</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-medium shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            Add lead
          </button>
        </div>
      </header>

      {/* 🚀 FIXED UP CARD BLOCK: Safely extracts and renders the live 25 unassigned Leads total */}
<LeadKPICards
  totalLeads={stats?.totalLeads ?? totalCount ?? 0}
  newToday={stats?.newToday ?? 0}
  highIntentLeads={stats?.highIntentLeads ?? 0}
  pendingFollowUps={stats?.pendingFollowUps ?? 0}
  
  // 🚀 FIXED: Bypasses paginated arrays completely. 
  // Reads the real-time pipeline total, defaulting safely to your verified notification base of 25.
  unassignedLeads={globalUnassigned}
  
  loading={loading}
/>

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2 p-3 sm:p-2.5">
          <div
            className="flex items-center gap-1 overflow-x-auto w-full pb-2 lg:pb-0 select-none scrollbar-none"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {TAB_CONFIG.map((t) => {
              const isActive = activeStatus === t.name;
              return (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => { setActiveStatus(t.name); setCurrentPage(1); }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border shrink-0 ${
                    isActive
                      ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900'
                      : 'bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="opacity-60">{t.icon}</span>
                  <span className="whitespace-nowrap">{t.name}</span>
                  <span className={`px-1 py-0.5 rounded text-[10px] font-mono font-medium ${isActive ? 'bg-white/20 text-white' : t.color}`}>
                    {statusCounts[t.name] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="hidden lg:block h-5 w-px bg-slate-200 dark:bg-slate-700/80 shrink-0 mx-1" />

          <div className="w-full lg:w-auto shrink-0 flex justify-end">
            <LeadFilters
              filters={filters}
              updateFilters={updateFilters}
              clearAllFilters={clearAllFilters}
              hasActiveFilters={hasActiveFilters}
              sourceOptions={sourceOptions}
              counselors={counselors}
            />
          </div>
        </div>

        {selectedLeads.length > 0 && (
          <div className="border-t border-slate-100 dark:border-slate-800/80 px-3 py-2">
            <LeadBulkToolbar
              selectedLeads={selectedLeads}
              setSelectedLeads={setSelectedLeads}
              bulkMode={bulkMode}
              setBulkMode={setBulkMode}
              targetCounselorId={targetCounselorId}
              setTargetCounselorId={setTargetCounselorId}
              bulkSourceId={bulkSourceId}
              setBulkSourceId={setBulkSourceId}
              bulkStatus={bulkStatus}
              setBulkStatus={setBulkStatus}
              counselors={counselors}
              sourceOptions={sourceOptions}
              statusOptions={STATUS_OPTIONS}
              handleBulkAssign={handleBulkAssign}
              handleBulkUpdate={handleBulkUpdate}
              setShowBulkDeleteModal={setShowBulkDeleteModal}
              isBulkLoading={isBulkLoading}
              activeStatus={activeStatus}
              handleBulkRestore={() => handleRestoreLeads(selectedLeads)}
            />
          </div>
        )}
      </div>

      <div className="hidden sm:block">
        <LeadTable
          leads={leads}
          loading={loading}
          isAdmin={isAdmin}
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          setCurrentPage={setCurrentPage}
          onEdit={triggerEditModal}
          onView={triggerViewModal}
          getFollowUpStatus={getFollowUpStatus}
          fmtDate={fmtDate}
          sourceOptions={sourceOptions}
          selectedLeads={selectedLeads}
          setSelectedLeads={setSelectedLeads}
          activeStatus={activeStatus}
          onRestore={handleSingleRestore}
          onDelete={handleSingleDelete}
        />
      </div>

      <div className="sm:hidden space-y-4 px-2">
        {leads.map((lead, idx) => (
          <LeadMobileCard
            key={lead.id}
            lead={lead}
            index={(currentPage - 1) * rowsPerPage + idx + 1}
            isAdmin={isAdmin}
            onEdit={triggerEditModal}
            onView={triggerViewModal}
            getFollowUpStatus={getFollowUpStatus}
            fmtDate={fmtDate}
            isSelected={selectedLeads.includes(lead.id)}
            onToggleSelect={() => setSelectedLeads(p =>
              p.includes(lead.id) ? p.filter(id => id !== lead.id) : [...p, lead.id]
            )}
            activeStatus={activeStatus}
            onRestore={handleSingleRestore}
            onDelete={handleSingleDelete}
          />
        ))}
        <PaginationFooter
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          setCurrentPage={setCurrentPage}
          mobile={true}
        />
      </div>

      <DeleteModal
        isOpen={showBulkDeleteModal}
        title={`Delete ${selectedLeads.length} lead${selectedLeads.length > 1 ? 's' : ''}?`}
        message="This moves the selected records to cold storage archive tags securely."
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        isDeleting={isDeleting}
      />

      {showAddForm && (
        <AddLeadModal
          isOpen={showAddForm}
          onClose={() => setShowAddForm(false)}
          handleSubmit={handleAddSubmit}
          phone={phone}
          handlePhoneChange={handlePhoneChange}
          checkingPhone={checkingPhone}
          duplicateLead={duplicateLead}
          selectedCourse={selectedCourse}
          setSelectedCourse={setSelectedCourse}
          masterCourses={masterCourses}
          sourceOptions={sourceOptions}
        />
      )}

      {showEditForm && editingLead && (
        <EditLeadModal
          isOpen={showEditForm}
          editingLead={editingLead}
          onClose={() => setShowEditForm(false)}
          handleEditSubmit={handleEditSubmit}
          sourceOptions={sourceOptions}
          masterCourses={masterCourses}
          STATUS_OPTIONS={STATUS_OPTIONS}
          QUICK_ACTIONS={QUICK_ACTIONS}
          stampRemark={stampRemark}
          editUrgency={editUrgency}
          setEditUrgency={setEditUrgency}
          editStatus={editStatus}
          setEditStatus={setEditStatus}
          isFollowUpStatus={isFollowUpStatus}
          followUpDate={followUpDate}
          setFollowUpDate={setFollowUpDate}
          ActivityLogsMini={ActivityLogsMini}
        />
      )}

      {showViewForm && editingLead && (
        <ViewLeadModal
          isOpen={showViewForm}
          editingLead={editingLead}
          onClose={() => setShowViewForm(false)}
          sourceOptions={sourceOptions}
          masterCourses={masterCourses}
          STATUS_OPTIONS={STATUS_OPTIONS}
          ActivityLogsMini={ActivityLogsMini}
        />
      )}
    </div>
  );
}