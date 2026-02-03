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
import MyEvaluations from './pages/evaluation/self/my-evaluations.jsx';
import EmployeeProjects from './pages/employees/self/employee-projects.jsx';
import EmployeeProjectMembers from './pages/employees/self/employee-project-members.jsx';
import CalendarPage from './pages/calendar/calendar.jsx';
import MyDocuments from './pages/employees/self/employee-documents.jsx';
import MyLeaves from './pages/leave/self/myLeaves.jsx';

function TitleManager() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname || '';

    const titleForPath = (pathname) => {
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
        '/employees/my-documents': 'ARISE | MY DOCUMENTS',
        '/employees/departments': 'ARISE | DEPARTMENTS',

        '/projects': 'ARISE | PROJECTS',

        '/leave': 'ARISE | LEAVE',
        '/leave/request': 'ARISE | LEAVE REQUEST',
        '/leave/credits': 'ARISE | LEAVE CREDITS',
        '/leave/history': 'ARISE | LEAVE HISTORY',
        '/leave/my-leaves' : 'ARISE | MY LEAVES',

        '/evaluation': 'ARISE | EVALUATION',
        '/evaluation/history': 'ARISE | EVALUATION HISTORY',
        '/evaluation/upload': 'ARISE | EVALUATION UPLOAD',
        '/evaluation/my-evaluations': 'ARISE | MY EVALUATIONS',

        '/data-overview': 'ARISE | DATA OVERVIEW',

        '/audit/user-accounts': 'ARISE | AUDIT | USER ACCOUNTS',
        '/audit/employees': 'ARISE | AUDIT | EMPLOYEES',
        '/audit/departments': 'ARISE | AUDIT | DEPARTMENTS',
        '/audit/projects': 'ARISE | AUDIT | PROJECTS',
        '/audit/leave': 'ARISE | AUDIT | LEAVE',
        '/audit/evaluation': 'ARISE | AUDIT | EVALUATION',
        '/audit/reports': 'ARISE | AUDIT | REPORTS',

        '/calendar': 'ARISE | CALENDAR',
      };

      if (exact[pathname]) return exact[pathname];

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
  const isEmployee = user?.role === ROLES.EMPLOYEE || user?.role === ROLES.MANAGER;
  return isEmployee ? <EmployeeDepartments /> : <Departments />;
}

function DepartmentDetailsRoute() {
  const { user } = useAuth();
  const isEmployee = user?.role === ROLES.EMPLOYEE || user?.role === ROLES.MANAGER;
  return isEmployee ? <EmployeeDepartmentMembers /> : <DepartmentEmployees />;
}

function ProjectsRoute() {
  const { user } = useAuth();
  const isEmployee = user?.role === ROLES.EMPLOYEE || user?.role === ROLES.MANAGER;
  return isEmployee ? <EmployeeProjects /> : <Projects />;
}

function ProjectDetailsRoute() {
  const { user } = useAuth();
  const isEmployee = user?.role === ROLES.EMPLOYEE || user?.role === ROLES.MANAGER;
  return isEmployee ? <EmployeeProjectMembers /> : <ProjectEmployees />;
}

function App() {
  return (
    <BrowserRouter>
      <TitleManager />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<ProtectedLayoutWithSidebar />}>
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />

          <Route path="/calendar" element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE]}>
                <CalendarPage />
              </ProtectedRoute>
            }/>

          <Route
            path="/departments"
            element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE]}>
                <DepartmentsRoute />
              </ProtectedRoute>
            }
          />

          <Route
            path="/evaluation"
            element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE]}>
                <Evaluation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/evaluation/history"
            element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR, ROLES.MANAGER]}>
                <EvaluationHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/evaluation/upload"
            element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR, ROLES.MANAGER]}>
                <EvaluationUpload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/evaluation/my-evaluations"
            element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE]}>
                <MyEvaluations />
              </ProtectedRoute>
            }
          />

          <Route
            path="/employees"
            element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR]}>
                <Employees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees/onboarding"
            element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR]}>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees/user-accounts"
            element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR]}>
                <UserAccounts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees/201-files"
            element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE]}>
                <OnboardingFiles />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees/my-documents"
            element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE]}>
                <MyDocuments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees/departments"
            element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE]}>
                <DepartmentsRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees/departments/:departmentId"
            element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE]}>
                <DepartmentDetailsRoute />
              </ProtectedRoute>
            }
          />

          <Route
            path="/projects"
            element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE]}>
                <ProjectsRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE]}>
                <ProjectDetailsRoute />
              </ProtectedRoute>
            }
          />

          <Route path="/leave" element={<Leave />} />
          <Route path="/leave/request" element={<LeaveRequest />} />
          <Route path="/leave/credits" element={<LeaveCredits />} />
          <Route path="/leave/history" element={<LeaveHistory />} />
          <Route path="/leave/my-leaves" element={<MyLeaves />} />

          <Route
            path="/data-overview"
            element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR]}>
                <Analytics />
              </ProtectedRoute>
            }
          />

          <Route
            path="/audit/user-accounts"
            element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR]}>
                <UserAccountsLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit/employees"
            element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR]}>
                <EmployeesLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit/departments"
            element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR]}>
                <DepartmentsLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit/projects"
            element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR]}>
                <ProjectsLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit/leave"
            element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR]}>
                <LeaveLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit/evaluation"
            element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR]}>
                <EvaluationLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit/reports"
            element={
              <ProtectedRoute allowedRoles={[ROLES.EXECUTIVE, ROLES.HR]}>
                <ReportsLogs />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

/*function ProtectedLayoutWithSidebar() {
  return (
    <div className="flex min-h-screen">
      <NavSide />
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}*/

function ProtectedLayoutWithSidebar() {

  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ProtectedRoute>
      <NavSide mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}>
        <Outlet />
      </NavSide>
    </ProtectedRoute>
  );
}

export default App;