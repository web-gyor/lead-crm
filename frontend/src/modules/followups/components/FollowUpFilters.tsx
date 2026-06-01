import React from "react";
import { Search, X } from "lucide-react";
import { StaffUser, LeadSource } from "../../../types/followup";

interface FollowUpFiltersProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  userFilter: string;
  setUserFilter: (v: string) => void;
  courseFilter: string;
  setCourseFilter: (v: string) => void;
  sourceFilter: string;
  setSourceFilter: (v: string) => void;
  staff: StaffUser[];
  uniqueCourses: string[];
  sources: LeadSource[];
  hasFilters: boolean;
  clearFilters: () => void;
}

export const FollowUpFilters = React.memo(function FollowUpFilters({
  searchTerm,
  setSearchTerm,
  userFilter,
  setUserFilter,
  courseFilter,
  setCourseFilter,
  sourceFilter,
  setSourceFilter,
  staff,
  uniqueCourses,
  sources,
  hasFilters,
  clearFilters,
}: FollowUpFiltersProps) {
  return (
    <div className="px-4 sm:px-5 pb-4 pt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-gray-100 dark:border-gray-800 animate-in fade-in duration-100">
      <div className="relative col-span-2 sm:col-span-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
        <input
          type="text"
          placeholder="Name or phone…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search string by name or telephone digits"
          className="w-full pl-8 pr-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:border-blue-400 transition-all placeholder-gray-400"
        />
      </div>

      <select
        value={userFilter}
        onChange={(e) => setUserFilter(e.target.value)}
        aria-label="Filter allocation by assigning counselor user reference"
        className="px-2 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-[10px] font-black uppercase text-gray-500 outline-none cursor-pointer"
      >
        <option value="">All Counselors</option>
        {staff.map((s) => {
          const id = String(s.id ?? "");
          const name = s.name || s.full_name || "";
          return id && name ? <option key={id} value={id}>{name}</option> : null;
        })}
      </select>

      <select
        value={courseFilter}
        onChange={(e) => setCourseFilter(e.target.value)}
        aria-label="Filter inquiries by structural course tracks"
        className="px-2 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-[10px] font-black uppercase text-gray-500 outline-none cursor-pointer"
      >
        <option value="">All Courses</option>
        {uniqueCourses.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <div className="flex gap-2">
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          aria-label="Filter metrics by marketing lead ingest source channels"
          className="flex-1 px-2 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-[10px] font-black uppercase text-gray-500 outline-none cursor-pointer"
        >
          <option value="">All Sources</option>
          {sources.map((s) => {
            const id = String(s.id ?? s.source_id ?? "");
            const name = s.name || s.source_name || "";
            return id && name ? <option key={id} value={id}>{name}</option> : null;
          })}
        </select>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            aria-label="Flush all filter parameters"
            className="px-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all cursor-pointer flex items-center justify-center shrink-0"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
});