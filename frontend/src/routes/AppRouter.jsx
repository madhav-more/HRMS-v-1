import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

import Login from '../pages/auth/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import AttendancePage from '../pages/attendance/AttendancePage';
import AttendanceSummary from '../pages/attendance/AttendanceSummary';
import EmployeeList from '../pages/employees/EmployeeList';
import CreateEmployee from '../pages/employees/CreateEmployee';
import ProfilePage from '../pages/profile/ProfilePage';

const CAN_CREATE = ['SuperUser', 'HR', 'Director', 'VP', 'GM'];
const ALL_ROLES = ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'];
const MANAGEMENT_PLUS = ['SuperUser', 'HR', 'Director', 'VP', 'GM', 'Manager'];

const AppRouter = () => (
  <AuthProvider>
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.9rem',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={ALL_ROLES}><Dashboard /></ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute allowedRoles={ALL_ROLES}><ProfilePage /></ProtectedRoute>
        } />

        <Route path="/attendance" element={
          <ProtectedRoute allowedRoles={ALL_ROLES}><AttendancePage /></ProtectedRoute>
        } />
        <Route path="/attendance/summary" element={
          <ProtectedRoute allowedRoles={ALL_ROLES}><AttendanceSummary /></ProtectedRoute>
        } />

        <Route path="/employees" element={
          <ProtectedRoute allowedRoles={MANAGEMENT_PLUS}><EmployeeList /></ProtectedRoute>
        } />
        <Route path="/employees/create" element={
          <ProtectedRoute allowedRoles={CAN_CREATE}><CreateEmployee /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default AppRouter;
