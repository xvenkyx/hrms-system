import api from './api';
import type {
  PayrollRecord,
  CreatePayrollRequest,
  UpdatePayrollRequest,
  GeneratePayrollRequest,
  PayrollQueryParams,
  PayrollSummary,
  BulkActionRequest,
} from '../types';

export const payrollApi = {
  // Generate payroll for a month
  generatePayroll: async (data: GeneratePayrollRequest): Promise<any> => {
    const response = await api.post('/payroll/generate', data);
    return response.data;
  },

  // Get all payroll records
  getPayrollRecords: async (params?: PayrollQueryParams): Promise<PayrollRecord[]> => {
    const response = await api.get('/payroll', { params });
    return response.data;
  },

  // Get single payroll record
  getPayrollRecord: async (id: string): Promise<PayrollRecord> => {
    const response = await api.get(`/payroll/${id}`);
    return response.data;
  },

  // Generate payslip
  generatePayslip: async (id: string): Promise<any> => {
    const response = await api.get(`/payroll/${id}/payslip?format=json`);
    return response.data;
  },

  // Get payslip HTML
  getPayslipHtml: async (id: string): Promise<string> => {
    const response = await api.get(`/payroll/${id}/payslip?format=html`);
    return response.data;
  },

  // Get payroll summary
  getPayrollSummary: async (month: string, departmentId?: string): Promise<PayrollSummary> => {
    const params = departmentId ? { departmentId } : {};
    const response = await api.get(`/payroll/summary/${month}`, { params });
    return response.data;
  },

  // Get monthly stats
  getMonthlyStats: async (year: string, departmentId?: string): Promise<any> => {
    const params = departmentId ? { departmentId } : {};
    const response = await api.get(`/payroll/stats/${year}`, { params });
    return response.data;
  },

  // Update payroll record
  updatePayroll: async (id: string, data: UpdatePayrollRequest): Promise<PayrollRecord> => {
    const response = await api.patch(`/payroll/${id}`, data);
    return response.data;
  },

  // Mark as sent
  markAsSent: async (id: string): Promise<PayrollRecord> => {
    const response = await api.patch(`/payroll/${id}/send`);
    return response.data;
  },

  // Bulk actions
  bulkAction: async (data: BulkActionRequest): Promise<any> => {
    const response = await api.post('/payroll/bulk-action', data);
    return response.data;
  },

  // Delete payroll record
  deletePayroll: async (id: string): Promise<void> => {
    await api.delete(`/payroll/${id}`);
  },

  // Create payroll record
  createPayroll: async (data: CreatePayrollRequest): Promise<PayrollRecord> => {
    const response = await api.post('/payroll', data);
    return response.data;
  },
};