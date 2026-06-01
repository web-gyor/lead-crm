import React, { useState, useEffect, useCallback, useMemo } from "react";
import { MessageSquare } from "lucide-react";

// 🎯 SWAPPED: Removed react-hot-toast layout layers for your unified system hook
import { useToast } from "../../hooks/useToast";

import { apiGet } from "../../utils/api";
import { Lead, ServiceResponse } from "../../types/communication.types";
import { useLeadFilters } from "../../hooks/useLeadFilters";

import { LeadListPanel, EmptyState } from "../../components/communication/WorkspacePanels";
import InteractionHub from "../../components/communication/InteractionHub";

export default function CommunicationPage() {
  // 🎯 INJECT UNIFIED MODERN HOOK
  const { addToast } = useToast();

  const [leads, setLeads] = useState<Lead[]>([]);
  // 🎯 FIXED TRACKING POINTER: Track selections by unique id to protect state from memory address flashes
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await apiGet("/api/leads?status=all&limit=300") as ServiceResponse<Lead[]>;
      const parsedLeads = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setLeads(parsedLeads);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Lead initialization synchronization error", err);
      // ⚡ UPDATED: Log hook initialization errors directly to the modern toast manager
      addToast("Failed to sync communication profiles", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { 
    fetchLeads(); 
  }, [fetchLeads]);

  const { searchTerm, setSearchTerm, statusFilter, setStatusFilter, filteredLeads, statusCounts } = useLeadFilters(leads);

  // 🎯 DYNAMIC RE-ANCHOR LOOP: Always grabs the fresh live reference matching your selected ID
  const activeSelectedLead = useMemo(() => {
    if (!selectedLeadId) return null;
    return leads.find(l => Number(l.id) === selectedLeadId) || null;
  }, [leads, selectedLeadId]);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] bg-white dark:bg-slate-900 lg:-m-6 overflow-hidden font-sans antialiased w-full relative">
      {/* ❌ REMOVED OLD DIRECT TOASTER COMPONENT WRAPPER */}
      
      {/* Structural left lead workspace listing panel */}
      <LeadListPanel
        leads={leads}
        filteredLeads={filteredLeads}
        selectedLead={activeSelectedLead}
        // 🎯 FIXED CALLBACK: Locks ID values instantly into state
        onSelectLead={(lead: Lead | null) => setSelectedLeadId(lead ? Number(lead.id) : null)}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusCounts={statusCounts}
        loading={loading}
      />

      {/* Primary Communication Timeline Interaction Hub Canvas */}
      <div className={`flex-1 min-w-0 h-full overflow-hidden ${activeSelectedLead ? "flex flex-col" : "hidden lg:flex lg:flex-col"}`}>
        {activeSelectedLead ? (
          <InteractionHub
            lead={activeSelectedLead}
            leads={leads}
            onSelectLead={(lead: Lead) => setSelectedLeadId(Number(lead.id))}
            onNewLog={fetchLeads}
            onBack={() => setSelectedLeadId(null)}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-slate-50/40 dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800/80">
            <EmptyState 
              title="Select an inquiry profile" 
              message="Choose from the communication list pane row metrics to trace call history timelines" 
              icon={MessageSquare} 
            />
          </div>
        )}
      </div>
    </div>
  );
}