import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

// Layout
import MainLayout from "../layouts/MainLayout";

// Pages
import Dashboard from "../pages/Dashboard";
import FollowUps from "../pages/FollowUps";
import Leads from "../pages/Leads";
import Pipeline from "../pages/Pipeline";
import Permissions from "../pages/Permissions";
import Analytics from "../pages/Analytics";
import Reports from "../pages/Reports";
import UsersMaster from "../pages/masters/UsersMaster";
import CoursesMaster from "../pages/masters/CoursesMaster";
import CountryMaster from "../pages/masters/CountryMaster";
import Login from "../pages/Login";
import Settings from "../pages/Settings";
import Performance from "../pages/Performance";
import BulkImport from "../pages/BulkImport";
import CommunicationLog from "../pages/Communication";
import ResetPassword from "../pages/ResetPassword";

// Lead Status Pages
import NewLeads from "../pages/leads/New";
import ContactedLeads from "../pages/leads/Contacted";
import InterestedLeads from "../pages/leads/Interested";
import ConvertedLeads from "../pages/leads/Converted";
import FollowupLeads from "../pages/leads/FollowupLeads";
import RejectedLeads from "../pages/leads/Rejected";
import LostLeads from "../pages/leads/Lost";
import LeadDistribution from "../pages/LeadDistribution"; 
import AttendanceMaster from "../pages/AttendanceMaster";

// Components
import ActivityLogs from "../components/ActivityLogs";
import NotFound from "../components/NotFound";

export default function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* ─── Public Routes ─── */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* ─── Protected Routes + Layout ─── */}
      <Route element={<ProtectedRoute />}> 
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Core Routes - Updated to Production Keys */}
          <Route path="/dashboard" element={<ProtectedRoute permissionKey="tracker.status" />} >
              <Route index element={<Dashboard />} />
          </Route>
          
          <Route path="/leads" element={<ProtectedRoute permissionKey="leads.view" />} >
              <Route index element={<Leads />} />
          </Route>

          <Route path="/pipeline" element={<ProtectedRoute permissionKey="leads.kanban" />} >
              <Route index element={<Pipeline />} />
          </Route>

          <Route path="/followups" element={<ProtectedRoute permissionKey="tasks.view" />} >
              <Route index element={<FollowUps />} />
          </Route>

          <Route path="/communication" element={<ProtectedRoute permissionKey="logs.communication" />} >
              <Route index element={<CommunicationLog />} />
          </Route>

          {/* Lead Status Pages - Adding keys for security */}
          <Route path="/leads/new" element={<ProtectedRoute permissionKey="leads.view" />} >
             <Route index element={<NewLeads />} />
          </Route>
          <Route path="/leads/contacted" element={<ProtectedRoute permissionKey="leads.view" />} >
             <Route index element={<ContactedLeads />} />
          </Route>
          <Route path="/leads/interested" element={<ProtectedRoute permissionKey="leads.view" />} >
             <Route index element={<InterestedLeads />} />
          </Route>
          <Route path="/leads/converted" element={<ProtectedRoute permissionKey="leads.view" />} >
             <Route index element={<ConvertedLeads />} />
          </Route>
          <Route path="/leads/followup-leads" element={<ProtectedRoute permissionKey="leads.view" />} >
             <Route index element={<FollowupLeads />} />
          </Route>
          <Route path="/leads/rejected" element={<ProtectedRoute permissionKey="leads.view" />} >
             <Route index element={<RejectedLeads />} />
          </Route>
          <Route path="/leads/lost" element={<ProtectedRoute permissionKey="leads.view" />} >
             <Route index element={<LostLeads />} />
          </Route>

          {/* Advanced & Admin */}
          <Route path="/analytics" element={<ProtectedRoute permissionKey="analytics.revenue" />} >
              <Route index element={<Analytics />} />
          </Route>
          
          <Route path="/reports" element={<ProtectedRoute permissionKey="data.export" />} >
              <Route index element={<Reports />} />
          </Route>

          <Route path="/performance" element={<ProtectedRoute permissionKey="analytics.staff" />} >
              <Route index element={<Performance />} />
          </Route>

          <Route path="/import" element={<ProtectedRoute permissionKey="data.import" />} >
              <Route index element={<BulkImport />} />
          </Route>

          {/* Intelligent Lead Distribution Route */}
          <Route path="/distribution" element={<ProtectedRoute permissionKey="leads.assign" />} >
              <Route index element={<LeadDistribution />} />
          </Route>

          <Route path="/permissions" element={<ProtectedRoute permissionKey="system.permissions" />} >
              <Route index element={<Permissions />} />
          </Route>

          <Route path="/audit-logs" element={<ProtectedRoute permissionKey="logs.activity" />} >
              <Route index element={<ActivityLogs />} />
          </Route>

          <Route path="/masters/users" element={<ProtectedRoute permissionKey="master.staff" />} >
              <Route index element={<UsersMaster />} />
          </Route>

          <Route path="/masters/courses" element={<ProtectedRoute permissionKey="master.course" />} >
              <Route index element={<CoursesMaster />} />
          </Route>
          <Route path="/masters/countries" element={<ProtectedRoute permissionKey="master.country" />} >
    <Route index element={<CountryMaster />} />
</Route>
<Route path="/attendance" element={<ProtectedRoute permissionKey="attendance.view" />} >
      <Route index element={<AttendanceMaster />} />
  </Route>

          <Route path="/settings" element={<ProtectedRoute permissionKey="system.settings" />} >
              <Route index element={<Settings />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}