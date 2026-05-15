/**
 * templateHelper.js (Backend Version)
 * Handles lead data injection for WhatsApp, SMS, and Email automation.
 */

const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const parseTemplate = (message, leadData = {}) => {
  if (!message) return "";

  // Prepare replacement map
  const vars = {
    // 1. Basic Personalization
    // Use first name if available to make it sound more natural
    
    name: leadData.name?.split(' ')[0] || "Student", 
    full_name: leadData.name?.trim() || "Student",
    greeting: leadData.greeting || getTimeBasedGreeting(),
    phone: leadData.phone || leadData.mobile || "your registered number",
    email: leadData.email || "your email",
    
    // 2. WebGyor Media / Brand Context
    company: leadData.company || "WebGyor Media",
    website: "www.webgyormedia.com",
    whatsapp: leadData.whatsapp || leadData.phone || "",
    // 3. Education / Training Context (Kerala/Gulf specific leads)
    course: leadData.course || leadData.course_name || "the requested course",
    country: leadData.country || "your preferred location",
    
    // 4. Staff / Counselor Info
    counselor: leadData.counselor_name || leadData.assigned_to || "our Academic Counselor",
    
    // 5. Scheduling (for Lead Follow-ups)
    date: leadData.appointment_date || "the scheduled date",
    time: leadData.appointment_time || "the scheduled time",
    
    // 6. Lead Specifics
    status: leadData.status || "Inquiry",
  };

  /**
   * Case-insensitive regex for {{variable}} and {{ variable }}
   * Using trim() inside the replace to catch extra spaces like {{ name }}
   */
  return message.replace(/{{\s*([\w]+)\s*}}/gi, (match, key) => {
    const lowerKey = key.toLowerCase().trim();
    // Return empty string instead of the tag if data is missing, 
    // or keep the tag for debugging—here we provide the key or a blank.
    return vars[lowerKey] !== undefined ? String(vars[lowerKey]) : match;
  });
};

module.exports = { parseTemplate };