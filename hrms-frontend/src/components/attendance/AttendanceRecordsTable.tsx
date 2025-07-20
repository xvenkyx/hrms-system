import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar, Search, Download, Filter, Loader2, Clock } from 'lucide-react';
import { attendanceApi } from '../../lib/attendanceApi';
import { useAuthStore } from '../../stores/authStore';
import type { AttendanceRecord } from '../../types';
import { formatDate } from '../../lib/utils';

export function AttendanceRecordsTable() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { employee } = useAuthStore();

  // Set default date range to current month
  useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  });

  // Fetch attendance records
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['attendanceRecords', startDate, endDate],
    queryFn: () => attendanceApi.getAttendanceRecords({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    enabled: !!startDate && !!endDate,
  });

  // Filter records based on search term
  const filteredRecords = records.filter(record =>
    record.employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.employee.department?.deptName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ON_TIME':
        return 'bg-green-100 text-green-800';
      case 'LATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'EARLY_OUT':
        return 'bg-orange-100 text-orange-800';
      case 'ABSENT':
        return 'bg-red-100 text-red-800';
      case 'HALF_DAY':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ON_TIME':
        return 'On Time';
      case 'LATE':
        return 'Late';
      case 'EARLY_OUT':
        return 'Early Out';
      case 'ABSENT':
        return 'Absent';
      case 'HALF_DAY':
        return 'Half Day';
      default:
        return status;
    }
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatWorkHours = (hours: number | null) => {
    if (!hours) return '0h 0m';
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const canViewAllRecords = ['ADMIN', 'HR', 'DEPARTMENT_HEAD'].includes(employee?.role.roleName || '');

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Attendance Records
            </CardTitle>
            <CardDescription>
              {canViewAllRecords ? 'View and manage attendance records' : 'View your attendance history'}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, ID, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">From Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">To Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </div>

        {/* Records Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-gray-600">Loading attendance records...</p>
            </div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No attendance records found.</p>
            {searchTerm && (
              <p className="text-sm mt-2">Try adjusting your search or date range.</p>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  {canViewAllRecords && <TableHead>Employee</TableHead>}
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Work Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="font-medium">
                        {formatDate(record.date)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                    </TableCell>
                    
                    {canViewAllRecords && (
                      <TableCell>
                        <div>
                          <div className="font-medium">{record.employee.fullName}</div>
                          <div className="text-sm text-gray-500">
                            {record.employee.employeeId}
                            {record.employee.department && (
                              <> • {record.employee.department.deptName}</>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    )}
                    
                    <TableCell>
                      <div className="font-medium">
                        {formatTime(record.checkInTime)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="font-medium">
                        {formatTime(record.checkOutTime)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="font-medium">
                        {formatWorkHours(record.workHours)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={getStatusColor(record.status)}>
                        {getStatusText(record.status)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="max-w-xs truncate text-sm text-gray-600">
                        {record.notes || '--'}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Summary */}
        <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
          <div>
            Showing {filteredRecords.length} of {records.length} records
          </div>
          <div className="flex gap-4">
            <span>
              Present: {records.filter(r => r.checkInTime).length}
            </span>
            <span>
              On Time: {records.filter(r => r.status === 'ON_TIME').length}
            </span>
            <span>
              Late: {records.filter(r => r.status === 'LATE').length}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}