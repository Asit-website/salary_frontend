import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import Login from './components/Login';
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

const { Content } = Layout;

function App() {    
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/staff-management" element={<PrivateRoute><StaffManagement /></PrivateRoute>} />
      <Route path="/staff/:id/profile" element={<PrivateRoute><StaffProfileView /></PrivateRoute>} />
      <Route path="/add-regular-staff" element={<PrivateRoute><AddRegularStaff /></PrivateRoute>} />
      <Route path="/attendance" element={<PrivateRoute><AttendanceManagement /></PrivateRoute>} />
      <Route path="/salary" element={<PrivateRoute><SalaryManagement /></PrivateRoute>} />
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
      <Route path="/payroll" element={<PrivateRoute><PayrollList /></PrivateRoute>} />
      <Route path="/payroll/:cycleId" element={<PrivateRoute><PayrollCycle /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default App;
