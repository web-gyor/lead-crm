import React from "react";
import AccessControlCenter from "./sections/AccessControlCenter";

// 🎯 STRUCTURAL PAGE ROUTER ENTRY POINT
// This acts as your clean public gateway wrapper, routing directly to the core IAM dashboard engine.
export default function PermissionsPageIndex() {
  return <AccessControlCenter />;
}