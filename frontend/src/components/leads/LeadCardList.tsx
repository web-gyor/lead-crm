// src/components/leads/LeadCardList.tsx
import React from "react";
import { Phone, MessageCircle, Edit3, Trash2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  'New': 'bg-blue-100 text-blue-800',
  'Contacted': 'bg-yellow-100 text-yellow-800',
  'Interested': 'bg-indigo-100 text-indigo-800',
  'Follow-up Needed': 'bg-orange-100 text-orange-800',
  'Converted': 'bg-green-100 text-green-800',
  'Lost': 'bg-red-100 text-red-800',
  'Not Interested': 'bg-gray-100 text-gray-800'
};

interface LeadCardListProps {
  leads: any[];
  loading: boolean;
  currentPage: number;
  rowsPerPage: number;
  selectedLeads: number[];
  onSelectLead: (id: number) => void;
  onSelectAll: () => void;
  onEdit: (lead: any) => void;
  onDelete?: (id: number) => void;
  canDelete?: boolean;
  sourceOptions?: any[];
  counselors?: any[];
  onTransfer?: (leadId: number, userId: string) => void;
  showAssignDropdown?: boolean;  // Contacted page uses inline dropdown
  showStatus?: boolean;          // show status badge on card
  extraCardField?: (lead: any) => React.ReactNode; // page-specific extra field
}

export default function LeadCardList({
  leads, loading, currentPage, rowsPerPage,
  selectedLeads, onSelectLead, onSelectAll,
  onEdit, onDelete, canDelete = false,
  sourceOptions = [], counselors = [],
  onTransfer, showAssignDropdown = false,
  showStatus = false, extraCardField
}: LeadCardListProps) {

  if (loading) return <div className="py-16 text-center text-gray-400 text-sm">📡 Syncing...</div>;
  if (!leads.length) return <div className="py-16 text-center text-gray-400 text-sm">📭 No leads found.</div>;

  return (
    <div className="space-y-3">
      {/* Select all bar */}
      <div className="flex items-center justify-between px-1">
        <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedLeads.length === leads.length && leads.length > 0}
            onChange={onSelectAll}
            className="w-4 h-4 rounded border-gray-300"
          />
          Select All ({leads.length})
        </label>
        {selectedLeads.length > 0 && (
          <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
            {selectedLeads.length} selected
          </span>
        )}
      </div>

      {leads.map((lead, index) => (
        <div
          key={lead.id}
          className={`bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-hidden transition-all ${
            selectedLeads.includes(lead.id)
              ? 'border-blue-300 ring-1 ring-blue-200'
              : 'border-gray-200 dark:border-gray-800'
          }`}
        >
          {/* Card Header */}
          <div className="flex items-start gap-2.5 p-3 border-b border-gray-100 dark:border-gray-800">
            <input
              type="checkbox"
              checked={selectedLeads.includes(lead.id)}
              onChange={() => onSelectLead(lead.id)}
              className="w-4 h-4 rounded border-gray-300 mt-0.5 flex-shrink-0"
            />
            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 font-black text-[10px] flex-shrink-0">
              {((currentPage - 1) * rowsPerPage) + index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate uppercase">
                {lead.full_name}
              </p>
              <p className="text-[10px] text-blue-600 font-medium uppercase">
                {lead.qualification || '—'}{lead.year_of_passing ? ` · ${lead.year_of_passing}` : ''}
              </p>
            </div>
            <div className="flex-shrink-0 flex flex-col items-end gap-1">
              {showStatus && (
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[lead.lead_status] || 'bg-gray-100 text-gray-700'}`}>
                  {lead.lead_status}
                </span>
              )}
              {/* Assigned badge or dropdown */}
              {showAssignDropdown && onTransfer ? (
                <select
                  value={lead.assigned_user_id || ""}
                  onChange={(e) => onTransfer(lead.id, e.target.value)}
                  className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100 outline-none"
                >
                  <option value="">Assign...</option>
                  {counselors.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                lead.assigned_user_name
                  ? <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100 uppercase">{lead.assigned_user_name}</span>
                  : <span className="text-[9px] font-black text-orange-500 bg-orange-50 px-2 py-1 rounded-full border border-orange-100 uppercase">Waiting</span>
              )}
            </div>
          </div>

          {/* Card Body */}
          <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Phone</p>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 tabular-nums">{lead.phone || '--'}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">City</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 uppercase">{lead.city || '--'}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Source</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {lead.lead_source_name || sourceOptions?.find((s: any) => s.id === lead.lead_source_id)?.name || 'Direct'}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Email</p>
              <p className="text-xs text-gray-500 lowercase truncate">{lead.email || '--'}</p>
            </div>
            {/* Page-specific extra field */}
            {extraCardField && extraCardField(lead)}
          </div>

          {/* Card Footer */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600">
                <Phone size={13} /> Call
              </a>
              <a
                href={`https://wa.me/91${lead.phone?.replace(/\D/g, '')}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-[11px] font-bold text-green-600"
              >
                <MessageCircle size={13} /> WhatsApp
              </a>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(lead)}
                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
              >
                <Edit3 size={15} />
              </button>
              {canDelete && onDelete && (
                <button
                  onClick={() => onDelete(lead.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}