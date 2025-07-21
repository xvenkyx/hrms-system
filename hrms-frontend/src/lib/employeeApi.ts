import api from './api';
import type { Employee, CreateEmployeeRequest, UpdateEmployeeRequest, Role, Department, Manager } from '../types';

export const employeeApi = {
  // Get all employees
  getEmployees: async (): Promise<Employee[]> => {
    const response = await api.get('/employees');
    return response.data;
  },

  // Get single employee
  getEmployee: async (id: string): Promise<Employee> => {
    const response = await api.get(`/employees/${id}`);
    return response.data;
  },

  // Create employee
  createEmployee: async (data: CreateEmployeeRequest): Promise<Employee> => {
    const response = await api.post('/employees', data);
    return response.data;
  },

  // Update employee
  updateEmployee: async (id: string, data: UpdateEmployeeRequest): Promise<Employee> => {
    const response = await api.patch(`/employees/${id}`, data);
    return response.data;
  },

  // Delete employee (soft delete)
  deleteEmployee: async (id: string): Promise<void> => {
    await api.delete(`/employees/${id}`);
  },

  // Get managers by department
  getManagersByDepartment: async (departmentId: string): Promise<Manager[]> => {
    const response = await api.get(`/employees/managers/${departmentId}`);
    return response.data;
  },

  // Get roles
  getRoles: async (): Promise<Role[]> => {
    const response = await api.get('/roles');
    return response.data;
  },

  // Get departments
  getDepartments: async (): Promise<Department[]> => {
    const response = await api.get('/departments');
    return response.data;
  },
  getSalaryDetails: async () => {
    const res = await api.get("/payroll/salary-details");
    return res.data;
  },
};