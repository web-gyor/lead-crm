import { useEffect, useState } from "react";
import { apiGet } from "../../../utils/api";
import { useNavigate } from "react-router-dom";

interface ActivityLog {
  id: number;
  action_type: string;
  description: string;
  created_at: string;
}

export default function ActivityLogsMini({ leadId }: { leadId: number }) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!leadId) return;

    const fetchLogs = async () => {
      try {
        setLoading(true);
        const response = await apiGet(`/api/activity/lead/${leadId}`);
        const rawData = response?.data || (Array.isArray(response) ? response : []);
        setLogs(rawData.slice(0, 5));
      } catch (err) {
        console.error("ActivityLogsMini Fetch Error:", err);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [leadId]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
      <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">
          Recent Activity
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 max-h-[350px] scrollbar-hide">
        {loading ? (
          <div className="py-10 text-center animate-pulse text-[10px] font-bold uppercase text-gray-300">
            Syncing Logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[10px] font-bold uppercase text-gray-400">No History Found</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="relative pl-4 border-l-2 border-blue-50 dark:border-gray-800 pb-1">
              <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-blue-500 shadow-sm" />
              
              <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 uppercase leading-none">
                {log.action_type.replace(/_/g, " ")}
              </p>
              
              <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">
                {log.description}
              </p>

              <p className="text-[9px] font-medium text-gray-400 mt-1 uppercase tracking-tighter">
                {new Date(log.created_at).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-50 dark:border-gray-800">
        <button
          onClick={() => navigate(`/audit-logs?lead=${leadId}`)}
          className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors"
        >
          View Full Audit Trail
        </button>
      </div>
    </div>
  );
}