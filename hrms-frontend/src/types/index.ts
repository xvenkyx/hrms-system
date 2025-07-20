// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
}

// export interface Employee {
//   id: string;
//   employeeId: string;
//   email: string;
//   fullName: string;
//   phone?: string;
//   address?: string;
//   dateOfJoining: string;
//   role: Role;
//   department: Department;
//   manager?: {
//     id: string;
//     fullName: string;
//     employeeId: string;
//   };
// }

export interface Role {
  id: string;
  roleName: string;
  roleLevel: number;
  permissions: {
    canManageEmployees: boolean;
    canManagePayroll: boolean;
    canApproveLeaves: boolean;
    canManageTasks: boolean;
    canViewAllData: boolean;
  };
  description?: string;
}

export interface Department {
  id: string;
  deptName: string;
  description?: string;
}

export interface LoginResponse {
  access_token: string;
  employee: Employee;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

// Navigation Types
export interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  current: boolean;
  roles?: string[];
}

// ... existing types ...

// Employee Management Types
export interface Employee {
  id: string;
  employeeId: string;
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
  dateOfJoining: string;
  isActive: boolean;
  role: Role;
  department: Department;
  manager?: {
    id: string;
    fullName: string;
    employeeId: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeRequest {
  employeeId: string;
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  address?: string;
  dateOfJoining: string;
  roleId: string;
  departmentId: string;
  managerId?: string;
}

export interface UpdateEmployeeRequest {
  employeeId?: string;
  email?: string;
  fullName?: string;
  phone?: string;
  address?: string;
  dateOfJoining?: string;
  roleId?: string;
  departmentId?: string;
  managerId?: string;
}

export interface Manager {
  id: string;
  fullName: string;
  employeeId: string;
  role: {
    roleName: string;
  };
}

// ... existing types ...

// Attendance Types
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  workHours: number | null;
  status: "ON_TIME" | "LATE" | "EARLY_OUT" | "ABSENT" | "HALF_DAY";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    fullName: string;
    employeeId: string;
    department?: {
      deptName: string;
    };
  };
}

export interface TodayAttendance {
  id?: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  workHours: number | null;
  status: "ON_TIME" | "LATE" | "EARLY_OUT" | "ABSENT" | "HALF_DAY" | null;
  notes: string | null;
  employee?: {
    fullName: string;
    employeeId: string;
    department: {
      attendanceSettings: Array<{
        checkInTime: string;
        checkOutTime: string;
        standardWorkHours: number;
        gracePeriodMins: number;
      }>;
    };
  };
}

export interface CheckInRequest {
  notes?: string;
}

export interface CheckOutRequest {
  notes?: string;
}

export interface AttendanceQueryParams {
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  departmentId?: string;
}

export interface MonthlyAttendanceStats {
  employee: {
    id: string;
    fullName: string;
    employeeId: string;
    department: {
      deptName: string;
    };
  };
  totalDays: number;
  presentDays: number;
  lateDays: number;
  earlyOutDays: number;
  totalWorkHours: number;
  records: AttendanceRecord[];
}

// ... existing types ...

// Leave Management Types
export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: "CASUAL" | "SICK" | "ANNUAL" | "MATERNITY" | "PATERNITY" | "OTHER";
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvedBy?: string;
  approvalDate?: string;
  approvalNotes?: string;
  appliedAt: string;
  employee: {
    id: string;
    fullName: string;
    employeeId: string;
    email: string;
    department?: {
      deptName: string;
    };
  };
  approver?: {
    id: string;
    fullName: string;
    employeeId: string;
  };
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  year: number;
  casualLeaves: number;
  sickLeaves: number;
  annualLeaves: number;
  usedCasual: number;
  usedSick: number;
  usedAnnual: number;
  casualRemaining: number;
  sickRemaining: number;
  annualRemaining: number;
  createdAt: string;
}

export interface CreateLeaveRequest {
  leaveType: "CASUAL" | "SICK" | "ANNUAL" | "MATERNITY" | "PATERNITY" | "OTHER";
  startDate: string;
  endDate: string;
  reason: string;
}

export interface ApproveLeaveRequest {
  status: "APPROVED" | "REJECTED";
  approvalNotes?: string;
}

export interface LeaveQueryParams {
  status?: "PENDING" | "APPROVED" | "REJECTED";
  leaveType?:
    | "CASUAL"
    | "SICK"
    | "ANNUAL"
    | "MATERNITY"
    | "PATERNITY"
    | "OTHER";
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  departmentId?: string;
}

// Payroll Types
export interface PayrollRecord {
  id: string;
  employeeId: string;
  month: string;
  
  // Earnings
  basicSalary: number;
  hra: number;
  fuelAllowance: number;
  performanceIncentive: number;
  otherEarnings: number;
  
  // Deductions
  pfDeduction: number;
  ptDeduction: number;
  otherDeductions: number;
  
  // Calculated fields
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  
  // Attendance info
  totalDays: number;
  daysPresent: number;
  arrearDays: number;
  lwpDays: number;
  
  payslipUrl?: string;
  generatedBy?: string;
  generatedAt?: string;
  status: 'DRAFT' | 'GENERATED' | 'SENT';
  createdAt: string;
  
  employee: {
    id: string;
    fullName: string;
    employeeId: string;
    email: string;
    department: {
      deptName: string;
    };
  };
}

export interface CreatePayrollRequest {
  employeeId: string;
  month: string;
  basicSalary: number;
  hra?: number;
  fuelAllowance?: number;
  performanceIncentive?: number;
  otherEarnings?: number;
  pfDeduction?: number;
  ptDeduction?: number;
  otherDeductions?: number;
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  totalDays: number;
  daysPresent: number;
  arrearDays?: number;
  lwpDays?: number;
  payslipUrl?: string;
}

export interface UpdatePayrollRequest extends Partial<CreatePayrollRequest> {}

export interface GeneratePayrollRequest {
  month: string;
  employeeIds?: string[];
  departmentId?: string;
}

export interface PayrollQueryParams {
  month?: string;
  year?: string;
  employeeId?: string;
  departmentId?: string;
  status?: 'DRAFT' | 'GENERATED' | 'SENT';
}

export interface PayrollSummary {
  totalRecords: number;
  totalBasicSalary: number;
  totalEarnings: number;
  totalDeductions: number;
  totalNetPay: number;
  statusBreakdown: {
    draft: number;
    generated: number;
    sent: number;
  };
  departmentBreakdown: Record<string, {
    count: number;
    totalNetPay: number;
    totalEarnings: number;
    totalDeductions: number;
  }>;
}

export interface BulkActionRequest {
  payrollIds: string[];
  action: 'DRAFT' | 'GENERATED' | 'SENT';
}

export interface YearlyStatsData {
  totalRecords: number;
  totalNetPay: number;
  totalEarnings: number;
  totalDeductions: number;
  statusCounts: {
    draft: number;
    generated: number;
    sent: number;
  };
}

export interface YearlyStats {
  [month: string]: YearlyStatsData;
}