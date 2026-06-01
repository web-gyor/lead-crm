// src/hooks/useCommunicationActions.ts
import { useState, useRef } from "react";
import { Lead, Template } from "../types/communication.types";
import { parseTemplate } from "../utils/templateHelper";
import { cleanPhoneNumber } from "../utils/phoneHelpers";
import { communicationService } from "../services/communicationService";
import { telephonyService } from "../services/telephonyService";
import toast from "react-hot-toast";

export function useCommunicationActions(lead: Lead, useRecording: boolean, onActionExecuted: () => void) {
  const [actionLock, setActionLock] = useState(false);

  const triggerCommunication = async (type: "sms" | "wa" | "email", templateList: Template[]) => {
    if (actionLock || !lead?.id) return;
    setActionLock(true);

    const template = templateList.find((t) => t.is_active) || templateList[0];
    let parsedMsg = "";
    let url = "";

    if (template) {
      parsedMsg = parseTemplate(template.message, {
        name: lead.full_name,
        course: lead.interested_course || "Course",
        ...lead
      });
    }

    const cleanPhone = cleanPhoneNumber(lead.phone);
    if (!cleanPhone && type !== "email") {
      toast.error("Valid telephone routing index missing");
      setActionLock(false);
      return;
    }

    if (type === "wa") {
      url = `https://wa.me/91${cleanPhone}${parsedMsg ? `?text=${encodeURIComponent(parsedMsg)}` : ""}`;
    } else if (type === "sms") {
      url = `sms:${cleanPhone}?&body=${encodeURIComponent(parsedMsg)}`;
    } else if (type === "email") {
      if (!lead.email) {
        toast.error("Target mailbox destination unconfigured");
        setActionLock(false);
        return;
      }
      const subject = template?.subject 
        ? parseTemplate(template.subject, { name: lead.full_name }) 
        : "Follow up regarding your enquiry";
      url = `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(parsedMsg)}`;
    }

    try {
      await communicationService.createLog(
        lead.id,
        type === "wa" ? "WhatsApp" : type.toUpperCase(),
        template ? `Sent ${type.toUpperCase()} template: ${template.title}` : `Opened manual ${type.toUpperCase()} dialer`
      );
      onActionExecuted();
    } catch (err) {
      if (import.meta.env.DEV) console.error("Auto-log execution fail", err);
    }

    if (type === "wa") {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      const nativeLink = document.createElement("a");
      nativeLink.href = url;
      nativeLink.click();
    }
    setActionLock(false);
  };

  const triggerCallBridge = async () => {
    if (actionLock || !lead?.phone || !lead?.id) return;
    setActionLock(true);

    const loadingToast = toast.loading("Initiating secure call bridge...");
    try {
      const res = await telephonyService.initiateBridge(lead.id, useRecording);
      if (res?.success) {
        toast.success("Connecting! Your phone will ring now.", { id: loadingToast });
        onActionExecuted();
      } else {
        throw new Error("Bridge route down");
      }
    } catch {
      toast.error("Bridge unavailable. Opening system dialer...", { id: loadingToast });
      const nativeLink = document.createElement("a");
      nativeLink.href = `tel:${lead.phone}`;
      nativeLink.click();
    } finally {
      setActionLock(false);
    }
  };

  return { triggerCommunication, triggerCallBridge, actionLock };
}