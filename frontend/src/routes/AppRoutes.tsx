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

          {/* Core Routes */}
          <Route path="/dashboard" element={<ProtectedRoute permissionKey="Status Board Trackers" />} >
             <Route index element={<Dashboard />} />
          </Route>
          
          <Route path="/leads" element={<ProtectedRoute permissionKey="View Leads" />} >
             <Route index element={<Leads />} />
          </Route>

          <Route path="/pipeline" element={<ProtectedRoute permissionKey="Kanban Pipeline" />} >
             <Route index element={<Pipeline />} />
          </Route>

          <Route path="/followups" element={<ProtectedRoute permissionKey="View Leads" />} >
             <Route index element={<FollowUps />} />
          </Route>

          <Route path="/communication" element={<ProtectedRoute permissionKey="Communication Log" />} >
             <Route index element={<CommunicationLog />} />
          </Route>

          {/* Lead Status Pages (These worked because they had no permissionKey restriction) */}
          <Route path="/leads/new" element={<NewLeads />} />
          <Route path="/leads/contacted" element={<ContactedLeads />} />
          <Route path="/leads/interested" element={<InterestedLeads />} />
          <Route path="/leads/converted" element={<ConvertedLeads />} />
          <Route path="/leads/followup-leads" element={<FollowupLeads />} />
          <Route path="/leads/rejected" element={<RejectedLeads />} />
          <Route path="/leads/lost" element={<LostLeads />} />

          {/* Advanced & Admin */}
          <Route path="/analytics" element={<ProtectedRoute permissionKey="Revenue Analytics" />} >
             <Route index element={<Analytics />} />
          </Route>
          
          <Route path="/reports" element={<ProtectedRoute permissionKey="Revenue Analytics" />} >
             <Route index element={<Reports />} />
          </Route>

          <Route path="/performance" element={<ProtectedRoute permissionKey="Staff Performance" />} >
             <Route index element={<Performance />} />
          </Route>

          <Route path="/import" element={<ProtectedRoute permissionKey="Bulk Import" />} >
             <Route index element={<BulkImport />} />
          </Route>

          <Route path="/permissions" element={<ProtectedRoute permissionKey="Role Permission" />} >
             <Route index element={<Permissions />} />
          </Route>

          <Route path="/audit-logs" element={<ProtectedRoute permissionKey="reports" />} >
             <Route index element={<ActivityLogs />} />
          </Route>

          <Route path="/masters/users" element={<ProtectedRoute permissionKey="Staff Master" />} >
             <Route index element={<UsersMaster />} />
          </Route>

          <Route path="/masters/courses" element={<ProtectedRoute permissionKey="Course Master" />} >
             <Route index element={<CoursesMaster />} />
          </Route>

          <Route path="/settings" element={<ProtectedRoute permissionKey="System Settings" />} >
             <Route index element={<Settings />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
 