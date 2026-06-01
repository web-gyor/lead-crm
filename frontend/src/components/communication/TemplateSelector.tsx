import React, { useState, useEffect } from "react";
import { apiGet, apiPost } from "../../utils/api";
import { useToast } from "../../hooks/useToast";

interface Template {
  id: number;
  title: string;
  type: "whatsapp" | "sms" | "email";
}

interface TemplateSelectorProps {
  leadId: number;
  channelType: "whatsapp" | "sms" | "email";
  onTemplateApplied: (compiledText: string) => void;
}

export default function TemplateSelector({ leadId, channelType, onTemplateApplied }: TemplateSelectorProps) {
  const { addToast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchRelevantTemplates = async () => {
      try {
        // Fetches templates filtered by the specific active tab channel type
        const res = await apiGet(`/api/templates?type=${channelType}`) as any;
        const parsedTemplates = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setTemplates(parsedTemplates);
      } catch (err) {
        console.error("Template load error", err);
      }
    };
    fetchRelevantTemplates();
  }, [channelType]);

  const handleApplyTemplate = async (templateId: number) => {
    try {
      setIsDropdownOpen(false);
      
      // Request backend helper engine calculation execution pass
      const res = await apiPost("/api/templates/parse", {
        templateId,
        leadId
      }) as any;

      if (res && res.compiledText) {
        // Pass the compiled text back up to the parent text area form state
        onTemplateApplied(res.compiledText);
        addToast("Template text injected successfully!", "success");
      }
    } catch (err) {
      addToast("Failed to process dynamic template placeholders", "error");
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-medium px-3 py-1.5 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
      >
        📋 Use Template
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-md shadow-xl z-50 max-h-48 overflow-y-auto">
          {templates.length === 0 ? (
            <p className="p-3 text-xs text-slate-400 italic text-center">No templates defined for this channel.</p>
          ) : (
            templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleApplyTemplate(t.id)}
                className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border-b dark:border-slate-600 last:border-0 block truncate"
              >
                {t.title}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}