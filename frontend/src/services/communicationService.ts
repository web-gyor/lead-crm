import { apiGet, apiPost, apiDelete } from "../utils/api";
import { LogEntry, Template, ServiceResponse } from "../types/communication.types";

export const communicationService = {
  getLogs: async (leadId: number, signal?: AbortSignal): Promise<LogEntry[]> => {
    const data = await apiGet(`/api/communication-logs/${leadId}`, { signal });
    return (data as LogEntry[]) ?? [];
  },
  
  createLog: async (leadId: number, type: string, summary: string): Promise<LogEntry> => {
    return await apiPost("/api/communication-logs", { lead_id: leadId, type, summary }) as LogEntry;
  },
  
  deleteLog: async (logId: number): Promise<void> => {
    await apiDelete(`/api/communication-logs/${logId}`);
  },
  
  getTemplates: async (type: "sms" | "whatsapp" | "email"): Promise<ServiceResponse<Template[]>> => {
    return await apiGet(`/api/communication-templates?type=${type}`) as ServiceResponse<Template[]>;
  }
};