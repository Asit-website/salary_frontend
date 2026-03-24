import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import Login from './components/Login';
import SignupAdmin from './components/SignupAdmin';
import Dashboard from './components/Dashboard';
import StaffManagement from './components/StaffManagement';
import StaffProfileView from './components/StaffProfileView';
import AddRegularStaff from './components/AddRegularStaff';
import AttendanceManagement from './components/AttendanceManagement';
import SalaryManagement from './components/SalaryManagement';
import Reports from './components/Reports';
import Settings from './components/Settings';
import AttendanceTemplates from './components/AttendanceTemplates';
import ShiftSettings from './components/ShiftSettings';
import PrivateRoute from './components/PrivateRoute';
import HolidayTemplates from './components/HolidayTemplates';
import LeaveTemplates from './components/LeaveTemplates';
import BusinessFunctions from './components/BusinessFunctions';
import WeeklyOffTemplates from './components/WeeklyOffTemplates';
import ManageDocuments from './components/ManageDocuments';
import ManageSalaryTemplate from './components/ManageSalaryTemplate';
import SalaryCalculationLogic from './components/SalaryCalculationLogic';
import SalaryDetailsAccess from './components/SalaryDetailsAccess';
import GeofenceSettings from './components/GeofenceSettings';
import Sales from './components/Sales';
import PayrollList from './components/PayrollList';
import PayrollCycle from './components/PayrollCycle';
import OrgReports from './components/OrgReports';
import Geolocation from './components/Geolocation';
import SuperadminPlans from './components/SuperadminPlans';
import SuperadminDashboard from './components/SuperadminDashboard';
import SuperadminClients from './components/SuperadminClients';
import SuperadminChannelPartners from './components/SuperadminChannelPartners';
import ChannelPartnerClients from './components/ChannelPartnerClients';
import RolesPermissions from './components/RolesPermissions';
import AssetsManagement from './components/AssetsManagement';
import AssetAssignments from './components/AssetAssignments';
import AssetMaintenance from './components/AssetMaintenance';
import Loans from './components/Loans';
import LetterManagement from './components/LetterManagement';
import EmployeeSalaryList from './components/EmployeeSalaryList';
import ImpersonateRedirect from './components/ImpersonateRedirect';
import ExpenseManagement from './components/ExpenseManagement';
import UserAccess from './components/UserAccess';
import OrderProductsSettings from './components/OrderProductsSettings';
import SalesIncentiveSettings from './components/SalesIncentiveSettings';
import DeviceManagementSettings from './components/DeviceManagementSettings';
import AutomationRules from './components/AutomationRules';
import AppraisalManagement from './components/AppraisalManagement';
import RatingSystem from './components/RatingSystem';
import LeaveRequests from './components/LeaveRequests';
import LeaveEncashment from './components/LeaveEncashment';
import TaskManagement from './components/TaskManagement';
import RosterManagement from './components/RosterManagement';
import AIReports from './components/AIReports';
import AttendanceProductivity from './components/AttendanceProductivity';
import AdminChatbot from './components/AdminChatbot';
import RiskDetectionReports from './components/RiskDetectionReports';
import Advances from './components/Advances';

const { Content } = Layout;

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/signup-admin" element={<SignupAdmin />} />
      <Route path="/impersonate" element={<ImpersonateRedirect />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/staff-management" element={<PrivateRoute><StaffManagement /></PrivateRoute>} />
      <Route path="/roster" element={<PrivateRoute><RosterManagement /></PrivateRoute>} />
      <Route path="/ai-reports" element={<PrivateRoute><AIReports /></PrivateRoute>} />
      <Route path="/ai-reports/salary-forecast" element={<PrivateRoute><AIReports /></PrivateRoute>} />
      <Route path="/ai-reports/risk-detection" element={<PrivateRoute><RiskDetectionReports /></PrivateRoute>} />
      <Route path="/ai-reports/attendance-productivity" element={<PrivateRoute><AttendanceProductivity /></PrivateRoute>} />
      <Route path="/ai-reports/assistant" element={<PrivateRoute><AdminChatbot /></PrivateRoute>} />
      <Route path="/staff/:id/profile" element={<PrivateRoute><StaffProfileView /></PrivateRoute>} />
      <Route path="/add-regular-staff" element={<PrivateRoute><AddRegularStaff /></PrivateRoute>} />
      <Route path="/attendance" element={<PrivateRoute><AttendanceManagement /></PrivateRoute>} />
      <Route path="/salary" element={<PrivateRoute><SalaryManagement /></PrivateRoute>} />
      <Route path="/payroll" element={<PrivateRoute><PayrollList /></PrivateRoute>} />
      <Route path="/payroll/:cycleId" element={<PrivateRoute><PayrollCycle /></PrivateRoute>} />
      <Route path="/loans" element={<PrivateRoute><Loans /></PrivateRoute>} />
      <Route path="/advances" element={<PrivateRoute><Advances /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="/settings/attendance-templates" element={<PrivateRoute><AttendanceTemplates /></PrivateRoute>} />
      <Route path="/settings/shifts" element={<PrivateRoute><ShiftSettings /></PrivateRoute>} />
      <Route path="/settings/holidays" element={<PrivateRoute><HolidayTemplates /></PrivateRoute>} />
      <Route path="/settings/leave-templates" element={<PrivateRoute><LeaveTemplates /></PrivateRoute>} />
      <Route path="/settings/weekly-off" element={<PrivateRoute><WeeklyOffTemplates /></PrivateRoute>} />
      <Route path="/settings/business-functions" element={<PrivateRoute><BusinessFunctions /></PrivateRoute>} />
      <Route path="/settings/documents" element={<PrivateRoute><ManageDocuments /></PrivateRoute>} />
      <Route path="/settings/salary-templates" element={<PrivateRoute><ManageSalaryTemplate /></PrivateRoute>} />
      <Route path="/settings/salary-calculation" element={<PrivateRoute><SalaryCalculationLogic /></PrivateRoute>} />
      <Route path="/settings/salary-access" element={<PrivateRoute><SalaryDetailsAccess /></PrivateRoute>} />
      <Route path="/settings/geofence" element={<PrivateRoute><GeofenceSettings /></PrivateRoute>} />
      <Route path="/sales" element={<PrivateRoute><Sales /></PrivateRoute>} />
      <Route path="/org-reports" element={<PrivateRoute><OrgReports /></PrivateRoute>} />
      <Route path="/assets-management" element={<PrivateRoute><AssetsManagement /></PrivateRoute>} />
      <Route path="/assets-management/asset-assignments" element={<PrivateRoute><AssetAssignments /></PrivateRoute>} />
      <Route path="/assets-management/asset-maintenance" element={<PrivateRoute><AssetMaintenance /></PrivateRoute>} />
      <Route path="/settings/letters" element={<PrivateRoute><LetterManagement /></PrivateRoute>} />
      <Route path="/geolocation" element={<PrivateRoute><Geolocation /></PrivateRoute>} />
      <Route path="/employee-salary" element={<PrivateRoute><EmployeeSalaryList /></PrivateRoute>} />
      <Route path="/payroll" element={<PrivateRoute><PayrollList /></PrivateRoute>} />
      <Route path="/payroll/:cycleId" element={<PrivateRoute><PayrollCycle /></PrivateRoute>} />
      <Route path="/superadmin/plans" element={<PrivateRoute><SuperadminPlans /></PrivateRoute>} />
      <Route path="/superadmin/dashboard" element={<PrivateRoute><SuperadminDashboard /></PrivateRoute>} />
      <Route path="/superadmin/clients" element={<PrivateRoute><SuperadminClients /></PrivateRoute>} />
      <Route path="/superadmin/channel-partners" element={<PrivateRoute><SuperadminChannelPartners /></PrivateRoute>} />
      <Route path="/partner/clients" element={<PrivateRoute><ChannelPartnerClients /></PrivateRoute>} />
      <Route path="/roles-permissions" element={<PrivateRoute><RolesPermissions /></PrivateRoute>} />
      <Route path="/expense-management" element={<PrivateRoute><ExpenseManagement /></PrivateRoute>} />
      <Route path="/settings/user-access" element={<PrivateRoute><UserAccess /></PrivateRoute>} />
      <Route path="/settings/order-products" element={<PrivateRoute><OrderProductsSettings /></PrivateRoute>} />
      <Route path="/settings/sales-incentives" element={<PrivateRoute><SalesIncentiveSettings /></PrivateRoute>} />
      <Route path="/settings/device-management" element={<PrivateRoute><DeviceManagementSettings /></PrivateRoute>} />
      <Route path="/settings/automation-rules" element={<PrivateRoute><AutomationRules /></PrivateRoute>} />
      <Route path="/performance/appraisals" element={<PrivateRoute><AppraisalManagement /></PrivateRoute>} />
      <Route path="/performance/ratings" element={<PrivateRoute><RatingSystem /></PrivateRoute>} />
      <Route path="/leave/requests" element={<PrivateRoute><LeaveRequests /></PrivateRoute>} />
      <Route path="/leave/encashment" element={<PrivateRoute><LeaveEncashment /></PrivateRoute>} />
      <Route path="/task-management" element={<PrivateRoute><TaskManagement /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default App;
