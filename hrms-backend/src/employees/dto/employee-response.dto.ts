export class EmployeeResponseDto {
  id: string;
  employeeId: string;
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
  dateOfJoining: string;
  isActive: boolean;
  role: {
    id: string;
    roleName: string;
    roleLevel: number;
  };
  department: {
    id: string;
    deptName: string;
  };
  manager?: {
    id: string;
    fullName: string;
    employeeId: string;
  };
  createdAt: string;
  updatedAt: string;
}