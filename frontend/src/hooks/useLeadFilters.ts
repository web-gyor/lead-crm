import { useMemo, useState } from "react";
import { Lead } from "../types/communication.types";
import { useDebounce } from "./useDebounce";

export function useLeadFilters(leads: Lead[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Clean, performant 250ms lookup throttling
  const debouncedSearch = useDebounce(searchTerm, 250);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchSearch = !debouncedSearch ? true : (
        l.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
        l.phone?.includes(debouncedSearch)
      );
      const matchStatus = statusFilter === "all" || l.lead_status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [leads, debouncedSearch, statusFilter]);

  const statusCounts = useMemo(() => {
    return leads.reduce<Record<string, number>>((acc, l) => {
      if (l.lead_status) {
        acc[l.lead_status] = (acc[l.lead_status] ?? 0) + 1;
      }
      return acc;
    }, {});
  }, [leads]);

  return { 
    searchTerm, 
    setSearchTerm, 
    statusFilter, 
    setStatusFilter, 
    filteredLeads, 
    statusCounts 
  };
}