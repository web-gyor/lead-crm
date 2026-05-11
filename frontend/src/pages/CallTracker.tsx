import React, { useState, useEffect } from "react";
import {
  Phone,
  Headphones,
  User,
  Star,
  Search,
  Clock,
  Calendar,
  RefreshCw
} from "lucide-react";

import { apiGet, apiPut } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";

export default function CallTracker() {

  const { user } = useAuth();

  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [counselors, setCounselors] = useState<any[]>([]);

  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    page: 1
  });

  // ─── FILTERS ───────────────────────────────
  const [filters, setFilters] = useState({
    page: 1,
    search: '',
    counselorId: '',
    selectedDate: new Date().toISOString().split('T')[0]
  });

  const getLocalToday = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

// Use in state
selectedDate: getLocalToday()

  // ─── FETCH CALLS ──────────────────────────
  const fetchCalls = async () => {

    try {

      setLoading(true);

      const params = new URLSearchParams({
        localDate: filters.selectedDate || '',
        counselorId: filters.counselorId || '',
        search: filters.search || '',
        page: String(filters.page || 1),
        limit: '20'
      });

      const res = await apiGet(
        `/api/telephony/logs?${params.toString()}`
      );

      if (res?.success) {

        setCalls(res.data || []);

        setPagination(
          res.pagination || {
            total: 0,
            totalPages: 1,
            page: 1
          }
        );

      } else {

        toast.error("Failed to sync call logs");

      }

    } catch (err) {

      console.error("CALL_FETCH_ERROR:", err);
      toast.error("Failed to sync call logs");

    } finally {

      setLoading(false);

    }
  };

  // ─── INITIAL LOAD ─────────────────────────
// 1. Initial Load: Fetch Staff List (Runs only ONCE when Admin logs in)
useEffect(() => {
  if (user?.role === 'Admin') {
    apiGet('/api/staff-performance/dropdown')
      .then((res) => {
        const staffData = res?.success ? res.data : Array.isArray(res) ? res : [];
        if (staffData.length > 0) {
          setCounselors(staffData);
        }
      })
      .catch((err) => {
        console.error("Staff dropdown failed, trying fallback:", err);
        // Fallback to general staff list
        apiGet('/api/users').then(res => setCounselors(res?.data || res || []));
      });
  }
}, [user?.role]); // Only runs when role is identified

// 2. Filter Sync: Fetch Calls (Runs every time a filter changes)
useEffect(() => {
  fetchCalls();
}, [filters.selectedDate, filters.counselorId, filters.search, filters.page]);

  // ─── SAVE FEEDBACK ────────────────────────
  const handleSaveFeedback = async (id: number) => {

    try {

      await apiPut("/api/telephony/feedback", {
        logId: id,
        feedback: feedbackText
      });

      toast.success("Feedback recorded");

      setEditingLogId(null);

      fetchCalls();

    } catch (err) {

      toast.error("Failed to save feedback");

    }
  };

  return (

    <div className="space-y-4 pb-12 max-w-5xl mx-auto">

      {/* ─── HEADER ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">

        <div className="flex items-center gap-3">

          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20 shrink-0">
            <Headphones size={20} />
          </div>

          <div>

            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Call Tracker
            </h1>

            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">
              {pagination.total} Records · Quality Assurance & Logs
            </p>

          </div>
        </div>

       <div className="flex items-center gap-2">

  {/* Clear Old Logs */}
  {user?.role === 'Admin' && (

    <button
      onClick={async () => {

        const confirmed = window.confirm(
          "Delete all previous month call logs?\n\nOnly current month logs will be kept."
        );

        if (!confirmed) return;

        try {

          const res = await apiPut('/api/telephony/clear-old-logs');

          if (res?.success) {

            toast.success("Previous month logs cleared");
            fetchCalls();

          } else {

            toast.error("Failed to clear logs");

          }

        } catch (err) {

          console.error(err);
          toast.error("Cleanup failed");

        }

      }}

      /*
        Change this dynamically later using storage usage %
        Example:
        const storageWarning = true;
      */

      className={`
        px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all shadow-sm
        ${
          false
            ? "bg-blue-600 text-white border-blue-600 shadow-blue-600/20"
            : "bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700 hover:text-gray-700"
        }
      `}
    >
      Clear Logs
    </button>

  )}

  {/* Sync Button */}
  <button
    type="button"
    onClick={fetchCalls}
    className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 hover:text-blue-600 transition-colors shadow-sm"
  >
    <RefreshCw
      size={15}
      className={loading ? "animate-spin" : ""}
    />
  </button>

</div>
      </div>

      {/* ─── FILTERS ───────────────────────── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

          {/* Search */}
          <div className="relative">

            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              placeholder="Search lead..."
              value={filters.search}
              onChange={(e) =>
                setFilters(prev => ({
                  ...prev,
                  search: e.target.value,
                  page: 1
                }))
              }
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none"
            />
          </div>

          {/* Date Filter */}
          <input
            type="date"
            value={filters.selectedDate}
            onChange={(e) =>
              setFilters(prev => ({
                ...prev,
                selectedDate: e.target.value,
                page: 1
              }))
            }
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none"
          />

          {/* Staff Filter */}
          {user?.role === 'Admin' && (

            <select
          value={filters.counselorId}
  onChange={(e) => {
    // When the value changes, trigger the filter immediately
    setFilters(prev => ({ ...prev, counselorId: e.target.value, page: 1 }));
  }}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none"
            >

    <option value="">All Staff</option>
  {counselors.map((c: any) => (
    <option key={c.id} value={c.id}>
      {c.name}
    </option>
  ))}

            </select>

          )}

        </div>
      </div>




      {/* ─── CONTENT ───────────────────────── */}
      <div className="grid gap-4 mt-6">

        {loading ? (

          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center py-20 gap-3">

            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />

            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
              Fetching call records...
            </p>

          </div>

        ) : calls.length === 0 ? (

          <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 dark:bg-gray-800/40 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">

            <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center shadow-sm mb-3">
              <Phone size={24} className="text-gray-200" />
            </div>

            <p className="text-[11px] font-black uppercase text-gray-400 tracking-widest">
              No Call Logs Found
            </p>

          </div>

        ) : (

          calls.map((call: any) => (

            <div
              key={call.id}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm group transition-all hover:border-blue-200 dark:hover:border-blue-900/50"
            >

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                {/* Lead */}
                <div className="flex items-center gap-3 lg:w-1/4">

                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                    <User size={18} className="text-blue-600" />
                  </div>

                  <div className="min-w-0">

                    <p className="text-[11px] font-black dark:text-white uppercase truncate tracking-tight">
                      {call.lead_name || "Unknown Lead"}
                    </p>

                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                      Agent: {call.user_name || "Unassigned"}
                    </p>

                  </div>
                </div>

                {/* Audio */}
                <div className="flex-1 max-w-md bg-gray-50 dark:bg-gray-800/50 rounded-xl px-2 py-1 border border-gray-100 dark:border-gray-700">

                  {call.recording_url ? (

                    <audio controls className="w-full h-8 scale-95 origin-center">
                      <source
                        src={call.recording_url}
                        type="audio/mpeg"
                      />
                    </audio>

                  ) : (

                    <div className="h-8 flex items-center justify-center">
                      <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                        Recording Unavailable
                      </span>
                    </div>

                  )}

                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 lg:text-right shrink-0">

                  <div className="flex flex-col lg:items-end">

                    <div className="flex items-center gap-1 text-[10px] font-black dark:text-white uppercase tracking-tight">
                      <Clock size={10} className="text-blue-500" />
                      {call.duration || 0} Secs
                    </div>

                    <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold uppercase">
                      <Calendar size={10} />
                      {new Date(call.created_at).toLocaleDateString()}
                    </div>

                  </div>
                </div>
              </div>

              {/* Feedback */}
              <div className="mt-4 p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-700">

                <div className="flex items-center justify-between mb-2">

                  <div className="flex items-center gap-2">

                    <Star
                      size={12}
                      className={
                        call.admin_feedback
                          ? "text-amber-500"
                          : "text-gray-300"
                      }
                    />

                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      Performance Review
                    </p>

                  </div>
                </div>

                {user?.role === 'Admin' ? (

                  editingLogId === call.id ? (

                    <div className="space-y-3">

                      <textarea
                        value={feedbackText}
                        onChange={(e) =>
                          setFeedbackText(e.target.value)
                        }
                        className="w-full p-3 text-[11px] font-medium border border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-900 dark:text-white outline-none"
                        placeholder="Write feedback..."
                        rows={2}
                      />

                      <div className="flex gap-2">

                        <button
                          onClick={() =>
                            handleSaveFeedback(call.id)
                          }
                          className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase"
                        >
                          Save
                        </button>

                        <button
                          onClick={() =>
                            setEditingLogId(null)
                          }
                          className="text-gray-400 px-4 py-1.5 text-[9px] font-black uppercase"
                        >
                          Cancel
                        </button>

                      </div>
                    </div>

                  ) : (

                    <div className="flex justify-between items-center gap-4">

                      <p className="text-[11px] text-gray-600 dark:text-gray-400 italic">
                        {call.admin_feedback || "No feedback provided yet."}
                      </p>

                      <button
                        onClick={() => {
                          setEditingLogId(call.id);
                          setFeedbackText(call.admin_feedback || "");
                        }}
                        className="shrink-0 px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-blue-600 text-[9px] font-black uppercase shadow-sm"
                      >
                        Edit
                      </button>

                    </div>

                  )

                ) : (

                  <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium italic">
                    {call.admin_feedback || "Awaiting supervisor review..."}
                  </p>

                )}

              </div>
            </div>

          ))
        )}
      </div>
    </div>
  );
}