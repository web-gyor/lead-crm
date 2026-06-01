
// src/hooks/useTemplates.ts
import { useState, useEffect } from "react";
import { Template } from "../types/communication.types";
import { communicationService } from "../services/communicationService";

export function useTemplates() {
  const [templates, setTemplates] = useState<{ sms: Template[], email: Template[], whatsapp: Template[] }>({ sms: [], email: [], whatsapp: [] });

  useEffect(() => {
    let isMounted = true;
    const loadTemplates = async () => {
      try {
        const [smsRes, waRes, emailRes] = await Promise.all([
          communicationService.getTemplates("sms"),
          communicationService.getTemplates("whatsapp"),
          communicationService.getTemplates("email")
        ]);
        if (isMounted) {
          setTemplates({
            sms: smsRes?.data || [],
            whatsapp: waRes?.data || [],
            email: emailRes?.data || []
          });
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error("Template load failed", err);
      }
    };
    loadTemplates();
    return () => { isMounted = false; };
  }, []);

  return templates;
}