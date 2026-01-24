// backend api config
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// user roles
export const ROLES = {
  EXECUTIVE: 'Executive',
  HR: 'HR',
  MANAGER: 'Manager',
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
  RESUME_CV: 'Resume/CV',
  APPLICATION_FOR_EMPLOYMENT: 'Application for Employment',
  PRE_EMPLOYMENT_EXAM: 'Pre-Employment Exam',
  EMPLOYEE_CONTRACT: 'Employee Contract',
  PERSONAL_DATA_SHEET: 'Personal Data Sheet',
  EMPLOYEE_PHOTO: 'Employee Photo',
  SINUMPAANG_SALAYSAY: 'Sinumpaang Salaysay',
  WAIVER_OF_MEDICAL_EXAMINATION: 'Waiver of Medical Examination',
  NDA: 'NDA',
  DIPLOMA: 'Diploma',
  TOR: 'Transcript of Records',
  SSS: 'SSS',
  PHILHEALTH: 'PhilHealth',
  PAG_IBIG: 'Pag-IBIG',
  VALID_ID: 'Valid ID',
};

// onboarding statuses
export const ONBOARDING_STATUSES =  {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

// local storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  TOKEN_EXPIRY: 'token_expiry',
  USER: 'user_data'
};