/**
 * templateHelper.ts
 * Utility to parse WhatsApp/SMS/Email templates for Webgyor Media.
 * Handles lead data injection with consultancy-specific fallbacks.
 */

interface LeadData {
  name?: string;
  phone?: string;
  mobile?: string;
  course?: string;
  country?: string;
  counselor_name?: string;
  assigned_to?: string;
  appointment_date?: string;
  appointment_time?: string;
  greeting?: string;
  email?: string;
  company?: string; // Allow dynamic company name if needed
}

/**
 * Generates a contextual greeting based on the current time in IST.
 */
const getTimeBasedGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

/**
 * Parses a message template by replacing {{variable}} tags with actual lead data.
 */
export const parseTemplate = (message: string, leadData: LeadData = {}): string => {
  if (!message) return "";

  // Unified variable mapping - Ensures all keys are lowercase for consistent matching
  const vars: Record<string, string> = {
    // Basic Personalization
    name: leadData.name?.trim() || "Student",
    greeting: leadData.greeting || getTimeBasedGreeting(),
    phone: leadData.phone || leadData.mobile || "your registered number",
    email: leadData.email || "your email",
    
    // Webgyor Media Context
    company: leadData.company || "Webgyor Media",
    website: "www.webgyormedia.com",
    
    // Education / Training Context
    course: leadData.course || "the requested course",
    country: leadData.country || "your preferred location",
    
    // Staff / Counselor Info
    assigned_user: leadData.counselor_name || leadData.assigned_to || "our Academic Counselor",
    
    // Scheduling
    date: leadData.appointment_date || "the scheduled date",
    time: leadData.appointment_time || "the scheduled time",
  };

  /**
   * Enhanced Regex:
   * Supports {{key}}, {{ key }}, and handles case-insensitivity.
   */
  return message.replace(/{{\s*([\w]+)\s*}}/gi, (match, key) => {
    const lowerKey = key.toLowerCase().trim();
    
    // Return mapped value or the original tag if not found in the vars map
    return vars[lowerKey] !== undefined ? String(vars[lowerKey]) : match;
  });
};