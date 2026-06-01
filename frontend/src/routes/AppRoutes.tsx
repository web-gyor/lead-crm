import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

// Core System Frame Layout Wrapper
import MainLayout from "../layouts/MainLayout";

// Core Active Modular Base Pages
import Dashboard from "../pages/dashboard/Dashboard";
import FollowUps from "../modules/followups/FollowUps";
import ColdStorage from "../pages/ColdStorage";
import Leads from "../modules/leads/LeadsPage";
import Pipeline from "../pages/pipeline/Pipeline";
import Analytics from "../pages/Analytics";
import Reports from "../pages/Reports";
import Login from "../pages/Login";
import Performance from "../pages/Performance";
import CommunicationPage from "../pages/communication/CommunicationPage";
import AutomationManager from "../pages/AutomationManager";
import ResetPassword from "../pages/ResetPassword";

// Lead Core Operations & Attribution
import LeadOperationsHub from "../modules/import/LeadOperationsHub";

// Master Control Data Grids
import MastersDashboard from "../modules/master/MastersDashboard";
import SettingsDashboardHub from "../modules/settings/SettingsDashboardHub";
import Permissions from "../modules/permissions/index";

// Tracking Audits & Operations Logs
import OperationsLogsHub from "../modules/operations-logs/Index";

// Shared Fallbacks
import NotFound from "../components/NotFound";

export default function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Routes>
      {/* ─── PUBLIC ACCESS LANES ─── */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* ─── PRIVILEGED SECURE SYSTEM LAYER ─── */}
      <Route element={!user ? <Navigate to="/login" replace /> : <MainLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Core Overview Dashboards */}
        <Route path="/dashboard" element={<ProtectedRoute permissionKey="dashboard" />}>
          <Route index element={<Dashboard />} />
        </Route>

        {/* Lead Management Context Scopes */}
        <Route path="/leads" element={<ProtectedRoute permissionKey="leads" />}>
          <Route index element={<Leads />} />
        </Route>

        <Route path="/pipeline" element={<ProtectedRoute permissionKey="pipeline" />}>
          <Route index element={<Pipeline />} />
        </Route>

        <Route path="/followups" element={<ProtectedRoute permissionKey="tasks" />}>
          <Route index element={<FollowUps />} />
        </Route>

        <Route path="/leads/cold-storage" element={<ProtectedRoute permissionKey="leads" />}>
          <Route index element={<ColdStorage />} />
        </Route>

        {/* Communications Tracking and Engine Controls */}
        <Route path="/communication" element={<ProtectedRoute permissionKey="communication" />}>
          <Route index element={<CommunicationPage />} />
        </Route>

        <Route path="/automation" element={<ProtectedRoute permissionKey="automation" />}>
          <Route index element={<AutomationManager />} />
        </Route>

        {/* Administrative Analytics, KPI, and Metrics Layers */}
        <Route path="/analytics" element={<ProtectedRoute permissionKey="analytics" />}>
          <Route index element={<Analytics />} />
        </Route>

        <Route path="/reports" element={<ProtectedRoute permissionKey="reports" />}>
          <Route index element={<Reports />} />
        </Route>

        {/* Ingestion Pipeline Operations Center */}
        <Route path="/leads/operations-hub" element={<ProtectedRoute permissionKey="import" />}>
          <Route index element={<Navigate to="/leads/operations-hub/import" replace />} />
          <Route path=":activeTab" element={<LeadOperationsHub />} />
        </Route>

        {/* Legacy Routing Aliases Compatibility Layers */}
        <Route path="/import" element={<Navigate to="/leads/operations-hub/import" replace />} />
        <Route path="/distribution" element={<Navigate to="/leads/operations-hub/distribution" replace />} />

        {/* Governance & Access Security Management */}
        <Route path="/permissions" element={<ProtectedRoute permissionKey="rbac" />}>
          <Route index element={<Permissions />} />
        </Route>

        <Route path="/audit-logs" element={<ProtectedRoute permissionKey="audit" />}>
          <Route index element={<OperationsLogsHub />} />
        </Route>

        <Route path="/performance" element={<ProtectedRoute permissionKey="performance" />}>
          <Route index element={<Performance />} />
        </Route>

        {/* Core System Database Master References */}
        <Route path="/masters/users" element={<Navigate to="/masters" replace />} />
        <Route path="/masters/courses" element={<Navigate to="/masters" replace />} />
        <Route path="/masters/countries" element={<Navigate to="/masters" replace />} />
        <Route path="/masters" element={<ProtectedRoute permissionKey="masters" />}>
          <Route index element={<MastersDashboard />} />
        </Route>

        {/* Base Panel Settings Context */}
        <Route path="/settings" element={<ProtectedRoute permissionKey="settings" />}>
          <Route index element={<SettingsDashboardHub />} />
        </Route>

        {/* Catch-all Fallback Node */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}