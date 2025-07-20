import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Calendar, Download, TrendingUp, Users, Clock, Loader2 } from 'lucide-react';
import { attendanceApi } from '../../lib/attendanceApi';
import { useAuthStore } from '../../stores/authStore';
import type { MonthlyAttendanceStats } from '../../types';

export function MonthlyReport() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
  const { employee } = useAuthStore();

  // Fetch monthly report
  const { data: monthlyStats = [], isLoading } = useQuery({
    queryKey: ['monthlyReport', selectedMonth, selectedYear],
    queryFn: () => attendanceApi.getMonthlyReport(selectedMonth, selectedYear),
  });

  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => {
    const year = currentDate.getFullYear() - 2 + i;
    return { value: year.toString(), label: year.toString() };
  });

  const formatWorkHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getAttendancePercentage = (presentDays: number, totalDays: number) => {
    return totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
  };

  const canViewAllReports = ['ADMIN', 'HR', 'DEPARTMENT_HEAD'].includes(employee?.role.roleName || '');

  // Calculate overall statistics
  const totalEmployees = monthlyStats.length;
  const totalPresentDays = monthlyStats.reduce((sum, stat) => sum + stat.presentDays, 0);
  const totalWorkingDays = monthlyStats.reduce((sum, stat) => sum + stat.totalDays, 0);
  const totalLateDays = monthlyStats.reduce((sum, stat) => sum + stat.lateDays, 0);
  const totalWorkHours = monthlyStats.reduce((sum, stat) => sum + stat.totalWorkHours, 0);

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Monthly Attendance Report
              </CardTitle>
              <CardDescription>
                {canViewAllReports ? 'Department attendance analytics' : 'Your monthly attendance summary'}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year.value} value={year.value}>
                    {year.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {canViewAllReports && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Employees</p>
                  <p className="text-2xl font-bold">{totalEmployees}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                  <p className="text-2xl font-bold">
                    {totalWorkingDays > 0 ? Math.round((totalPresentDays / totalWorkingDays) * 100) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Work Hours</p>
                  <p className="text-2xl font-bold">{formatWorkHours(totalWorkHours)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Late Arrivals</p>
                  <p className="text-2xl font-bold">{totalLateDays}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Employee Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>
            {canViewAllReports ? 'Employee Statistics' : 'Your Attendance Summary'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-gray-600">Loading monthly report...</p>
              </div>
            </div>
          ) : monthlyStats.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No attendance data found for the selected period.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {monthlyStats.map((stat) => (
                <div key={stat.employee.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-medium">{stat.employee.fullName}</h3>
                      <p className="text-sm text-gray-600">
                        {stat.employee.employeeId} • {stat.employee.department.deptName}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {getAttendancePercentage(stat.presentDays, stat.totalDays)}% Attendance
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Present Days</p>
                      <p className="text-lg font-semibold text-green-600">
                        {stat.presentDays}/{stat.totalDays}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Late Days</p>
                      <p className="text-lg font-semibold text-yellow-600">{stat.lateDays}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Early Outs</p>
                      <p className="text-lg font-semibold text-orange-600">{stat.earlyOutDays}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Hours</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {formatWorkHours(stat.totalWorkHours)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Attendance Rate</span>
                      <span>{getAttendancePercentage(stat.presentDays, stat.totalDays)}%</span>
                    </div>
                    <Progress 
                      value={getAttendancePercentage(stat.presentDays, stat.totalDays)} 
                      className="h-2" 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}