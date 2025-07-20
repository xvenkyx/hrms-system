import api from './api';
import type {
  LeaveRequest,
  LeaveBalance,
  CreateLeaveRequest,
  ApproveLeaveRequest,
  LeaveQueryParams,
} from '../types';

export const leaveApi = {
  // Get leave balance
  getLeaveBalance: async (year?: number): Promise<LeaveBalance> => {
    const params = year ? { year: year.toString() } : {};
    const response = await api.get('/leaves/balance', { params });
    return response.data;
  },

  // Get employee leave balance (for managers)
  getEmployeeLeaveBalance: async (employeeId: string, year?: number): Promise<LeaveBalance> => {
    const params = year ? { year: year.toString() } : {};
    const response = await api.get(`/leaves/balance/${employeeId}`, { params });
    return response.data;
  },

  // Apply for leave
  applyForLeave: async (data: CreateLeaveRequest): Promise<LeaveRequest> => {
    const response = await api.post('/leaves', data);
    return response.data;
  },

  // Get leave requests
  getLeaveRequests: async (params?: LeaveQueryParams): Promise<LeaveRequest[]> => {
    const response = await api.get('/leaves', { params });
    return response.data;
  },

  // Get single leave request
  getLeaveRequest: async (id: string): Promise<LeaveRequest> => {
    const response = await api.get(`/leaves/${id}`);
    return response.data;
  },

  // Approve/reject leave
  approveLeave: async (id: string, data: ApproveLeaveRequest): Promise<LeaveRequest> => {
    const response = await api.patch(`/leaves/${id}/approve`, data);
    return response.data;
  },

  // Update leave request
  updateLeaveRequest: async (id: string, data: Partial<CreateLeaveRequest>): Promise<LeaveRequest> => {
    const response = await api.patch(`/leaves/${id}`, data);
    return response.data;
  },

  // Delete leave request
  deleteLeaveRequest: async (id: string): Promise<void> => {
    await api.delete(`/leaves/${id}`);
  },
};