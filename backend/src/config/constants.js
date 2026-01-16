export const ROLES = {
  ADMIN: 'Admin',
  HR: 'HR',
  EMPLOYEE: 'Employee'
};

export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  GENERATE_REPORT: 'GENERATE_REPORT',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST'
};

export const EMPLOYMENT_STATUSES = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive'
};

export const PERSONNEL_TYPES = {
  REGULAR: 'Regular',
  PROJECT_BASED: 'Project-Based',
  PROBATIONARY: 'Probationary'
};

export const PROJECT_STATUSES = {
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
  CANCELLED: 'Cancelled'
};

export const ASSIGNMENT_STATUSES = {
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

export const DOCUMENT_TYPES = {
  EMPLOYEE_CONTRACT: 'Employee Contract',
  RESUME_CV: 'Resume/CV',
  APPLICATION_FOR_EMPLOYMENT: 'Application for Employment',
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
  DRIVERS_LICENSE: "Driver's License",
  PRC_ID: 'PRC ID',
  OTHERS: 'Others'
};

export const ALLOWED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'image/jpeg': '.jpg',
  'image/png': '.png'
};

export const FILE_VALIDATION = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
  ALLOWED_MIME_TYPES: Object.keys(ALLOWED_FILE_TYPES),
  ALLOWED_EXTENSIONS: Object.values(ALLOWED_FILE_TYPES)
};

export const ONBOARDING_STATUSES = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};