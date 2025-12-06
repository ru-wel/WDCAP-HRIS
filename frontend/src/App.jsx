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
          <Route path="/login" element={<Login />} />
          <Route element={<LayoutWithSidebar />}>
            {/* Default redirect */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/* Main routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/employees/onboarding" element={<Onboarding />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:projectId" element={<ProjectEmployees />} />
            <Route path="/leave" element={<Leave />} />
            <Route path="/leave/request" element={<LeaveRequest />} />

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

function LayoutWithSidebar() {
  return (
    <NavSide>
      <Outlet />
    </NavSide>
  );
}

export default App;