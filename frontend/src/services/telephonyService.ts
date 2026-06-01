import { apiGet, apiPost } from "../utils/api";
import { SystemSettings } from "../types/communication.types";

export const telephonyService = {
  getSettings: async (): Promise<SystemSettings> => {
    const res = await apiGet("/api/settings") as any;
    const raw = res?.data ?? res;
    return {
      is_call_recording_enabled: Number(raw?.is_call_recording_enabled) === 1
    };
  },
  
  initiateBridge: async (leadId: number, recordCall: boolean): Promise<{ success: boolean }> => {
    return await apiPost("/api/telephony/call/initiate", { leadId, recordCall }) as { success: boolean };
  }
};