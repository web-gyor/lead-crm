export enum LeadStatus {
  NEW = "New",
  CONTACTED = "Contacted",
  INTERESTED = "Interested",
  FOLLOW_UP = "Follow-up",
  FOLLOW_UP_NEEDED = "Follow-up Needed",
  CONVERTED = "Converted",
  LOST = "Lost",
  NOT_INTERESTED = "Not Interested",
}

export enum InteractionType {
  CALL = "Call",
  WHATSAPP = "WhatsApp",
  SMS = "SMS",
  EMAIL = "Email",
  MEETING = "Meeting",
  NOTE = "Note",
}

export interface Lead {
  id: number;
  full_name: string;
  phone?: string;
  email?: string;
  lead_status?: string;
  interested_course?: string;
  assigned_user_name?: string;
}

export interface LogEntry {
  id: number;
  type: string;
  summary: string;
  user_name?: string;
  created_at: string;
}

export interface Template {
  id: number;
  title: string;
  subject?: string;
  message: string;
  type: "sms" | "whatsapp" | "email";
  is_active: boolean | number;
}

export interface SystemSettings {
  is_call_recording_enabled: boolean | number;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  leads?: T;
  count?: number;
  message?: string;
}