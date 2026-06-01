import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiGet } from '../../../utils/api';

interface Filters {
  search: string;
  status: string;
  sourceId: string;
  counselorId: string;
  quality: string;
  range: string;
  startDate: string;
  endDate: string;
}

export function useLeadData(initialRowsPerPage = 15) {
  const [leads, setLeads] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    search: "", status: "", sourceId: "", counselorId: "", quality: "", range: "all", startDate: "", endDate: ""
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    const thread = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(thread);
  }, [filters.search]);

  const fetchSummaryStats = useCallback(async () => {
    try {
      const res = await apiGet("/api/leads/dashboard-data");
      if (res) setStats(res);
    } catch (err) {
      console.error("Dashboard metric snapshot failed:", err);
    }
  }, []);

  const loadPayload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        limit: String(rowsPerPage),
        search: debouncedSearch,
        status: filters.status === "all" ? "" : (filters.status || ""),
      };

      if (filters.sourceId) params.source_id = filters.sourceId;
      if (filters.counselorId) params.assigned_user_id = filters.counselorId;

      const res = await apiGet(`/api/leads?${new URLSearchParams(params)}`);
      if (res) {
        setLeads(res.data || []);
        setTotalCount(res.pagination?.totalItems || 0);
        setTotalPages(res.pagination?.totalPages || 1);
        fetchSummaryStats();
      }
    } catch (err) {
      console.error("Failed parsing pipeline payload:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [currentPage, rowsPerPage, debouncedSearch, filters.status, filters.sourceId, filters.counselorId, fetchSummaryStats]);

  const updateFilters = useCallback((patch: Partial<Filters>) => {
    setFilters(p => ({ ...p, ...patch }));
    setCurrentPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({ search: "", status: "", sourceId: "", counselorId: "", quality: "", range: "all", startDate: "", endDate: "" });
    setCurrentPage(1);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return filters.search !== "" || (filters.status !== "" && filters.status !== "all") || filters.sourceId !== "" || filters.counselorId !== "";
  }, [filters]);

  return {
    leads, setLeads, totalCount, setTotalCount, totalPages, currentPage, setCurrentPage,
    rowsPerPage, setRowsPerPage, loading, filters, updateFilters, clearAllFilters,
    hasActiveFilters, stats, loadPayload
  };
}