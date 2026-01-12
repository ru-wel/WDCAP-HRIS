import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet, BrowserRouter, useLocation } from 'react-router-dom';
import { NavSide } from "./components/sidenav";
import { useAuth } from './context/AuthContext.jsx';
import Login from "./pages/login/login.jsx";
import ResetPassword from './pages/login/reset-password.jsx';
import Dashboard from './pages/dashboard/dashboard.jsx';
import Employees from './pages/employees/employees.jsx';
import Onboarding from './pages/onboarding/onboarding.jsx';
import Projects from './pages/projects/projects.jsx';
import ProjectEmployees from './pages/projects/project-employees';
import Leave from './pages/leave/leave.jsx';
import LeaveRequest from './pages/leave/request';
import LeaveCredits from './pages/leave/credits';
import LeaveHistory from './pages/leave/history';
import Analytics from './pages/analytics/analytics.jsx';
import ProtectedRoute from './utils/ProtectedRoute.jsx';
import { ROLES } from './constants/config.js';
import UserAccountsLogs from './pages/audit/user-accounts-logs.jsx';
import EmployeesLogs from './pages/audit/employees-logs.jsx';
import DepartmentsLogs from './pages/audit/departments-logs.jsx';
import ProjectsLogs from './pages/audit/projects-logs.jsx';
import LeaveLogs from './pages/audit/leave-logs.jsx';
import EvaluationLogs from './pages/audit/evaluation-logs.jsx';
import ReportsLogs from './pages/audit/reports-logs.jsx';
import UserAccounts from './pages/employees/user-accounts.jsx';
import OnboardingFiles from './pages/employees/201-files.jsx';
import Departments from './pages/employees/departments.jsx';
import DepartmentEmployees from "./pages/employees/departments-employees.jsx";
import Profile from './pages/profile/profile.jsx';
import EmployeeDepartments from './pages/employees/self/employee-departments.jsx';
import EmployeeDepartmentMembers from './pages/employees/self/employee-department-members.jsx';
import EvaluationHistory from './pages/evaluation/history.jsx';
import EvaluationUpload from './pages/evaluation/upload.jsx';
import Evaluation from './pages/evaluation/evaluation.jsx';
import EmployeeProjects from './pages/employees/self/employee-projects.jsx';
import EmployeeProjectMembers from './pages/employees/self/employee-project-members.jsx';

function TitleManager() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname || '';

    const titleForPath = (pathname) => {
      // Exact routes
      const exact = {
        '/login': 'ARISE | LOGIN',
        '/reset-password': 'ARISE | RESET PASSWORD',
        '/dashboard': 'ARISE | DASHBOARD',
        '/profile': 'ARISE | PROFILE',

        '/departments': 'ARISE | DEPARTMENTS',
        '/employees': 'ARISE | EMPLOYEES',
        '/employees/onboarding': 'ARISE | ONBOARDING',
        '/employees/user-accounts': 'ARISE | USER ACCOUNTS',
        '/employees/201-files': 'ARISE | 201 FILES',
        '/employees/departments': 'ARISE | DEPARTMENTS',

        '/projects': 'ARISE | PROJECTS',

        '/leave': 'ARISE | LEAVE',
        '/leave/request': 'ARISE | LEAVE REQUEST',
        '/leave/credits': 'ARISE | LEAVE CREDITS',
        '/leave/history': 'ARISE | LEAVE HISTORY',

        '/evaluation': 'ARISE | EVALUATION',
        '/evaluation/history': 'ARISE | EVALUATION HISTORY',
        '/evaluation/upload': 'ARISE | EVALUATION UPLOAD',

        '/analytics': 'ARISE | ANALYTICS',

        '/audit/user-accounts': 'ARISE | AUDIT | USER ACCOUNTS',
        '/audit/employees': 'ARISE | AUDIT | EMPLOYEES',
        '/audit/departments': 'ARISE | AUDIT | DEPARTMENTS',
        '/audit/projects': 'ARISE | AUDIT | PROJECTS',
        '/audit/leave': 'ARISE | AUDIT | LEAVE',
        '/audit/evaluation': 'ARISE | AUDIT | EVALUATION',
        '/audit/reports': 'ARISE | AUDIT | REPORTS',
      };

      if (exact[pathname]) return exact[pathname];

      // Dynamic routes
      if (pathname.startsWith('/employees/departments/')) return 'ARISE | DEPARTMENT DETAILS';
      if (pathname.startsWith('/projects/') && pathname !== '/projects') return 'ARISE | PROJECT DETAILS';

      return 'ARISE';
    };

    document.title = titleForPath(path);
  }, [location.pathname]);

  return null;
}

function DepartmentsRoute() {
  const { user } = useAuth();
  const isEmployee = user?.role === ROLES.EMPLOYEE;
  return isEmployee ? <EmployeeDepartments /> : <Departments />;
}

function DepartmentDetailsRoute() {
  const { user } = useAuth();
  const isEmployee = user?.role === ROLES.EMPLOYEE;
  return isEmployee ? <EmployeeDepartmentMembers /> : <DepartmentEmployees />;
}

function ProjectsRoute() {
  const { user } = useAuth();
  const isEmployee = user?.role === ROLES.EMPLOYEE;
  return isEmployee ? <EmployeeProjects /> : <Projects />;
}

function ProjectDetailsRoute() {
  const { user } = useAuth();
  const isEmployee = user?.role === ROLES.EMPLOYEE;
  return isEmployee ? <EmployeeProjectMembers /> : <ProjectEmployees />;
}

function App() {
  return (
    <BrowserRouter>
      <TitleManager />
      <Routes>
        {/* public route (no auth needeed) */}
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* protected routes */}
        <Route element={<ProtectedLayoutWithSidebar />}>
          {/* Default redirect */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Main routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/departments"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE]}>
                <DepartmentsRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/evaluation"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE]}>
                <Evaluation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/evaluation/history"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE]}>
                <EvaluationHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/evaluation/upload"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.HR]}>
                <EvaluationUpload />
              </ProtectedRoute>
            }
          />

          {/* START - EMPLOYEES */}
          <Route
            path="/employees"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.HR]}>
                <Employees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees/onboarding"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.HR]}>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees/user-accounts"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <UserAccounts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees/201-files"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE]}>
                <OnboardingFiles />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees/departments"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE]}>
                <DepartmentsRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees/departments/:departmentId"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE]}>
                <DepartmentDetailsRoute />
              </ProtectedRoute>
            }
          />
          {/* END - EMPLOYEES */}

          <Route
            path="/projects"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE]}>
                <ProjectsRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE]}>
                <ProjectDetailsRoute />
              </ProtectedRoute>
            }
          />

          <Route path="/leave" element={<Leave />} />
          <Route path="/leave/request" element={<LeaveRequest />} />
          <Route path="/leave/credits" element={<LeaveCredits />} />
          <Route path="/leave/history" element={<LeaveHistory />} />

          <Route
            path="/analytics"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.HR]}>
                <Analytics />
              </ProtectedRoute>
            }
          />

          {/* START -  FOR AUDIT LOGS */}
          <Route
            path="/audit/user-accounts"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <UserAccountsLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit/employees"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <EmployeesLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit/departments"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <DepartmentsLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit/projects"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <ProjectsLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit/leave"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <LeaveLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit/evaluation"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <EvaluationLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit/reports"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <ReportsLogs />
              </ProtectedRoute>
            }
          />
          {/* END -  FOR AUDIT LOGS */}

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function ProtectedLayoutWithSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ProtectedRoute>
      {/* ✅ PASS THESE PROPS DOWN */}
      <NavSide mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}>
        <Outlet />
      </NavSide>
    </ProtectedRoute>
  );
}

export default App;