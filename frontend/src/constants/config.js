// backend api config
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// user roles
export const ROLES = {
  ADMIN: 'Admin',
  HR: 'HR',
  EMPLOYEE: 'Employee'
};

export const PERSONNEL_TYPES = {
  REGULAR: 'Regular',
  PROJECT_BASED: 'Project-Based',
  PROBATIONARY: 'Probationary'
}

// employee status
export const EMPLOYMENT_STATUSES = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive'
};

// project status
export const PROJECT_STATUSES = {
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
  CANCELLED: 'Cancelled'
};

// document types
export const DOCUMENT_TYPES = {
  EMPLOYEE_CONTRACT: 'Employee Contract',
  RESUME_CV: 'Resume/CV',
  APPLICATION_FOR_EMPLOYMENT: 'Application for Employment',
  PERSONAL_DATA_SHEET: 'Personal Data Sheet',
  NDA: 'NDA',
  DIPLOMA: 'Diploma',
  TOR: 'Transcript of Records',
  SSS: 'SSS',
  PHILHEALTH: 'PhilHealth',
  PAG_IBIG: 'Pag-IBIG',
  DRIVERS_LICENSE: "Driver's License",
  PRC_ID: 'PRC ID',
  OTHERS: 'Others'
};

// local storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  TOKEN_EXPIRY: 'token_expiry',
  USER: 'user_data'
};