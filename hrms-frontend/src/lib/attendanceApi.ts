import api from './api';
import type {
  TodayAttendance,
  AttendanceRecord,
  CheckInRequest,
  CheckOutRequest,
  AttendanceQueryParams,
  MonthlyAttendanceStats,
} from '../types';

export const attendanceApi = {
  // Get today's attendance
  getTodayAttendance: async (): Promise<TodayAttendance | null> => {
    const response = await api.get('/attendance/today');
    return response.data;
  },

  // Check in
  checkIn: async (data: CheckInRequest): Promise<AttendanceRecord> => {
    const response = await api.post('/attendance/check-in', data);
    return response.data;
  },

  // Check out
  checkOut: async (data: CheckOutRequest): Promise<AttendanceRecord> => {
    const response = await api.post('/attendance/check-out', data);
    return response.data;
  },

  // Get attendance records
  getAttendanceRecords: async (params?: AttendanceQueryParams): Promise<AttendanceRecord[]> => {
    const response = await api.get('/attendance/records', { params });
    return response.data;
  },

  // Get monthly report
  getMonthlyReport: async (month: string, year: string): Promise<MonthlyAttendanceStats[]> => {
    const response = await api.get(`/attendance/report/${month}/${year}`);
    return response.data;
  },
};