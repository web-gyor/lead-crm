
// src/hooks/useCommunicationLogs.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { LogEntry } from "../types/communication.types";
import { communicationService } from "../services/communicationService";

export function useCommunicationLogs(leadId?: number) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchLogs = useCallback(async (silent = false) => {
    if (!leadId) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (!silent) setLogsLoading(true);
    try {
      const data = await communicationService.getLogs(leadId, abortControllerRef.current.signal);
      setLogs(data);
    } catch (err: any) {
      if (err.name !== "AbortError" && import.meta.env.DEV) {
        console.error("Log compilation failed", err);
      }
    } finally {
      if (!silent) setLogsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchLogs();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchLogs]);

  return { logs, setLogs, logsLoading, fetchLogs };
}