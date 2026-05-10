import { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Download, 
  UserPlus, Phone, Lightbulb, Clock, FileText 
} from 'lucide-react';

const BulkAssign = () => {
  const [leads, setLeads] = useState([]);
  const [counselors, setCounselors] = useState([]);
  const [selectedCounselors, setSelectedCounselors] = useState<number[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  // Fetch real counselors from /api/staff
  useEffect(() => {
    fetch('/api/staff')
      .then(res => res.json())
      .then(setCounselors);
  }, []);

  // Fetch unassigned leads (same as your Leads API)
  const fetchUnassignedLeads = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/leads/unassigned?page=${currentPage}&limit=${rowsPerPage}`);
      const data = await response.json();
      setLeads(data.leads || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnassignedLeads();
  }, [currentPage]);

  const toggleAllLeads = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map((lead: any) => lead.id));
    }
  };

  const toggleLead = (leadId: number) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleBulkAssign = async () => {
    if (selectedCounselors.length === 0 || selectedLeads.length === 0) return alert('Select counselors & leads');

    setBulkStatus('processing');
    try {
      const response = await fetch('/api/leads/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: selectedLeads, counselorIds: selectedCounselors })
      });

      if (response.ok) {
        setBulkStatus('success');
        setSelectedLeads([]);
        fetchUnassignedLeads();
        setTimeout(() => setBulkStatus('idle'), 2000);
      }
    } catch (error) {
      setBulkStatus('error');
    }
  };

const handleExport = () => {
    // 1. Standardized Headers to match backend mapping and template
    const headers = ['Full Name', 'Phone Number', 'Email', 'City', 'Course', 'Country'];

    // 2. Map data to the correct columns
    const rows = leads.map(lead => [
      `"${(lead.full_name || '').replace(/"/g, '""')}"`,
      `"${lead.phone || ''}"`,
      `"${(lead.email || '').replace(/"/g, '""')}"`,
      `"${(lead.city || '').replace(/"/g, '""')}"`,
      `"${(lead.interested_course || 'Inquiry').replace(/"/g, '""')}"`,
      `"${(lead.country || 'India').replace(/"/g, '""')}"`
    ]);

    // 3. Join with industry-standard CRLF and proper escaping
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    // 4. Standard Download Logic
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-template-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); // Required for Firefox
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-5 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="px-5 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg max-w-7xl mx-auto">
        
        {/* Header - Same as Leads */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              Bulk Assign Leads
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
              Assign unassigned leads to counselors in bulk ({totalCount} available)
            </p>
          </div>
          
          {/* Bulk Assign Button */}
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-lg text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              disabled={loading}
            >
              <Download size={16} />
              Export CSV
            </button>
            <button
              onClick={handleBulkAssign}
              disabled={selectedLeads.length === 0 || selectedCounselors.length === 0 || loading}
              className={`px-8 py-2.5 font-bold rounded-lg text-sm shadow-lg transition-all flex items-center gap-2 ${
                selectedLeads.length === 0 || selectedCounselors.length === 0 || loading
                  ? 'bg-gray-400 cursor-not-allowed text-gray-500'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98] hover:shadow-xl'
              }`}
            >
              {bulkStatus === 'processing' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Assign {selectedLeads.length}
                </>
              ) : (
                <>
                  <Users size={16} />
                  Assign {selectedLeads.length}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Counselors Selection - Same style */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <Users size={20} className="text-blue-600" />
            <h3 className="font-bold text-lg text-blue-900 dark:text-blue-100">Select Counselors</h3>
            <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-xs font-bold rounded-full">
              {selectedCounselors.length} selected
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {counselors.map((counselor: any) => (
              <label key={counselor.id} className="flex items-center gap-2 p-3 hover:bg-white rounded-lg cursor-pointer group transition-all">
                <input
                  type="checkbox"
                  checked={selectedCounselors.includes(counselor.id)}
                  onChange={(e) => {
                    const id = counselor.id;
                    setSelectedCounselors(prev => 
                      prev.includes(id) 
                        ? prev.filter(c => c !== id) 
                        : [...prev, id]
                    );
                  }}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-blue-600">
                    {counselor.name}
                  </div>
                  <div className="text-xs text-gray-500">{counselor.role}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Leads Table - EXACT Leads Tracker Design */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full">
              <thead className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedLeads.length === leads.length && leads.length > 0}
                      onChange={toggleAllLeads}
                      className="w-4 h-4 rounded border-2 border-gray-300 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase text-gray-400 tracking-widest">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase text-gray-400 tracking-widest">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase text-gray-400 tracking-widest">
                    Treatment
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase text-gray-400 tracking-widest">
                    City
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase text-gray-400 tracking-widest">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase text-gray-400 tracking-widest">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-gray-500 font-medium">Loading unassigned leads...</span>
                      </div>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <div className="text-gray-500">
                        <Users size={48} className="mx-auto mb-4 opacity-40" />
                        <p className="text-lg font-medium">No unassigned leads</p>
                        <p className="text-sm">All leads are assigned to counselors</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead: any) => (
                    <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-all group">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={() => toggleLead(lead.id)}
                          className="w-4 h-4 rounded border-2 border-gray-300 bg-white dark:bg-gray-700 
                                   focus:ring-2 focus:ring-blue-500 group-hover:border-blue-400"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white truncate max-w-[160px]">
                        {lead.full_name || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm text-gray-900 dark:text-white">
                          {lead.phone}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">{lead.email}</div>
                      </td>
                      <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-medium text-sm">
                        {lead.interested_treatment || 'General'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs capitalize">
                        {lead.city || '--'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm ${
                          lead.lead_status === 'New' 
                            ? 'bg-blue-100 text-blue-800 border-2 border-blue-200' 
                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {lead.lead_status || 'New'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-500 font-medium">
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-GB') : '--'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination - Exact copy of your Leads pagination */}
          <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Show</span>
              <select value={rowsPerPage} className="bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-[11px] font-bold">
                <option>10</option>
              </select>
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">per page</span>
            </div>

            <div className="text-[11px] font-black uppercase tracking-tighter text-gray-500">
              Showing 
              <span className="text-blue-600 mx-1">
                {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, totalCount)}
              </span> 
              of 
              <span className="text-gray-900 dark:text-white mx-1">{totalCount}</span> 
              Unassigned Leads
            </div>

            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className={`w-8 h-8 flex items-center justify-center rounded-full border-2 transition-all 
                  ${currentPage === 1 ? 'border-gray-100 text-gray-200 cursor-not-allowed' : 'border-gray-900 text-gray-900 hover:border-red-600 hover:bg-red-50 hover:text-red-600 cursor-pointer active:scale-90'}`}
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>

              <span className="text-xs font-black bg-gray-900 text-white w-8 h-8 flex items-center justify-center rounded-full shadow-md ring-2 ring-white dark:ring-gray-800">
                {currentPage}
              </span>

              <button 
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className={`w-8 h-8 flex items-center justify-center rounded-full border-2 transition-all 
                  ${currentPage >= totalPages ? 'border-gray-100 text-gray-200 cursor-not-allowed' : 'border-gray-900 text-gray-900 hover:border-red-600 hover:bg-red-50 hover:text-red-600 cursor-pointer active:scale-90'}`}
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Status */}
      {bulkStatus === 'success' && (
        <div className="mt-6 p-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
          <div className="flex items-center gap-3">
            <CheckCircle size={24} className="text-emerald-500" />
            <div>
              <h3 className="font-bold text-emerald-900 dark:text-emerald-100 text-lg">
                {selectedLeads.length} leads assigned successfully!
              </h3>
              <p className="text-emerald-800 dark:text-emerald-200 text-sm">
                Refreshing unassigned leads list...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkAssign;
