import { Section, SectionId } from "../constants/leadStatus";

export interface FollowUpLead {
  id: number;
  lead_id?: number;
  full_name: string;
  phone?: string;
  lead_status: string;
  interested_course?: string;
  assigned_user_name?: string;
  assigned_user_id?: number | string;
  next_follow_up_date?: string | null;
  last_follow_up_date?: string | null;
  counselor_remarks?: string;
  last_feedback?: string;
  lead_source_id?: number | string;
  lead_source_name?: string;
  source_name?: string;
  source?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StaffUser {
  id: number | string;
  name?: string;
  full_name?: string;
  role?: string;
}

export interface LeadSource {
  id?: number;
  source_id?: number;
  name?: string;
  source_name?: string;
}

export interface FollowUpsApiResponse {
  leads?: FollowUpLead[];
}