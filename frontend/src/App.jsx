import React from 'react';
import './App.css';
import { Routes, Route, Navigate, Outlet, BrowserRouter } from 'react-router-dom';
import { NavSide } from "./pages/components/sidenav";
import Login from "./pages/login";
import Dashboard from './pages/dashboard';
import Employees from './pages/employees';
import Onboarding from './pages/onboarding';
import Projects from './pages/projects';
import ProjectEmployees from './pages/project-page/project-employees';
import Leave from './pages/leave';
import LeaveRequest from './pages/leave-page/request';
import ProtectedRoute from './utils/ProtectedRoute.jsx';
import { ROLES } from './constants/config.js';
import UserAccountsLogs from './pages/audit-logs-pages/user-accounts-logs.jsx';
import EmployeesLogs from './pages/audit-logs-pages/employees-logs.jsx';
import DepartmentsLogs from './pages/audit-logs-pages/departments-logs.jsx';
import ProjectsLogs from './pages/audit-logs-pages/projects-logs.jsx';
import LeaveLogs from './pages/audit-logs-pages/leave-logs.jsx';
import EvaluationLogs from './pages/audit-logs-pages/evaluation-logs.jsx';
import ReportsLogs from './pages/audit-logs-pages/reports-logs.jsx';

{ /*  

import Evaluation from './pages/evaluation';
import Analytics from './pages/analytics';
import Audit from './pages/audit';
*/}

{/*
import Onboarding from './pages/employees/onboarding';
import UserAccounts from './pages/employees/user-accounts';
import EmployeeFiles from './pages/employees/201-files';
import Departments from './pages/employees/departments';
import LeaveCredits from './pages/leave/credits';
import LeaveHistory from './pages/leave/history';
import EvaluationHistory from './pages/evaluation/history';
import AuditUserAccounts from './pages/audit/user-accounts';
import AuditEmployees from './pages/audit/employees';
import AuditDepartments from './pages/audit/departments';
import AuditProjects from './pages/audit/projects';
import AuditLeave from './pages/audit/leave';
import AuditEvaluation from './pages/audit/evaluation';
import AuditReports from './pages/audit/reports';
*/}

function App() {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <Routes>
          {/* public route (no auth needeed) */}
          <Route path="/login" element={<Login />} />

          {/* protected routes */}
          <Route element={<ProtectedLayoutWithSidebar />}>
            {/* Default redirect */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/* Main routes */}
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/employees" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.HR]}> <Employees /> </ProtectedRoute> } />

            <Route path="/employees/onboarding" element={<Onboarding />} />

            <Route path="/projects" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.HR]}> <Projects /> </ProtectedRoute>} />

            <Route path="/projects/:projectId" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.HR]}> <ProjectEmployees /> </ProtectedRoute>} />

            <Route path="/leave" element={<Leave />} />

            <Route path="/leave/request" element={<LeaveRequest />} />

            {/* START -  FOR AUDIT LOGS */}

            <Route path = "/audit/user-accounts" element = {<UserAccountsLogs />} />
            <Route path = "/audit/employees" element = {<EmployeesLogs />} />
            <Route path = "/audit/departments" element = {<DepartmentsLogs />} />
            <Route path = "/audit/projects" element = {<ProjectsLogs />} />
            <Route path = "/audit/leave" element = {<LeaveLogs />} />
            <Route path = "/audit/evaluation" element = {<EvaluationLogs />} />
            <Route path = "/audit/reports" element = {<ReportsLogs />} />

            {/* END -  FOR AUDIT LOGS */}


            {/*
            <Route path="/evaluation" element={<Evaluation />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/audit" element={<Audit />} /> 
            */}
            
            {/* 
            <Route path="/employees/onboarding" element={<Onboarding />} />
            <Route path="/employees/user-accounts" element={<UserAccounts />} />
            <Route path="/employees/201-files" element={<EmployeeFiles />} />
            <Route path="/employees/departments" element={<Departments />} />
            
            <Route path="/leave/credits" element={<LeaveCredits />} />
            <Route path="/leave/history" element={<LeaveHistory />} />
            
            <Route path="/evaluation/history" element={<EvaluationHistory />} />
            
            <Route path="/audit/user-accounts" element={<AuditUserAccounts />} />
            <Route path="/audit/employees" element={<AuditEmployees />} />
            <Route path="/audit/departments" element={<AuditDepartments />} />
            <Route path="/audit/projects" element={<AuditProjects />} />
            <Route path="/audit/leave" element={<AuditLeave />} />
            <Route path="/audit/evaluation" element={<AuditEvaluation />} />
            <Route path="/audit/reports" element={<AuditReports />} /> 
            */}
            
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
  );
}

function ProtectedLayoutWithSidebar() {
  return (
    <ProtectedRoute>
      <NavSide>
        <Outlet />
      </NavSide>
    </ProtectedRoute>
  );
}

export default App;