// API Configuration
// export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https:hrms-system-production-3c6e.up.railway.app';
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Role Constants
export const ROLES = {
  ADMIN: 'ADMIN',
  HR: 'HR',
  DEPARTMENT_HEAD: 'DEPARTMENT_HEAD',
  TEAM_LEAD: 'TEAM_LEAD',
  TECHNICAL_EXPERT: 'TECHNICAL_EXPERT',
} as const;

// Department Constants
export const DEPARTMENTS = {
  TECHNICAL: 'TECHNICAL',
  HR: 'HR',
  SALES: 'SALES',
  MARKETING: 'MARKETING',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'hrms_access_token',
  USER_DATA: 'hrms_user_data',
} as const;

// Routes
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  EMPLOYEES: '/employees',
  PAYROLL: '/payroll',
  LEAVES: '/leaves',
  ATTENDANCE: '/attendance',
  TASKS: '/tasks',
  PROFILE: '/profile',
} as const;