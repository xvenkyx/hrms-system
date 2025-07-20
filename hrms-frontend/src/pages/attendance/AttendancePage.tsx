import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { AttendanceWidget } from '../../components/attendance/AttendanceWidget';
import { AttendanceRecordsTable } from '../../components/attendance/AttendanceRecordsTable';
import { MonthlyReport } from '../../components/attendance/MonthlyReport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useAuthStore } from '../../stores/authStore';

export function AttendancePage() {
  const { employee } = useAuthStore();
  const [activeTab, setActiveTab] = useState('today');

  const canViewReports = ['ADMIN', 'HR', 'DEPARTMENT_HEAD', 'TEAM_LEAD'].includes(employee?.role.roleName || '');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
        <p className="mt-2 text-gray-600">
          Track daily attendance, view records, and generate reports
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="today">Today's Attendance</TabsTrigger>
          <TabsTrigger value="records">Attendance Records</TabsTrigger>
          {canViewReports && (
            <TabsTrigger value="reports">Monthly Reports</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="today" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Attendance Widget */}
            <div className="lg:col-span-2">
              <AttendanceWidget />
            </div>

            {/* Quick Info */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Work Schedule</CardTitle>
                  <CardDescription>Your department's work hours</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Department:</span>
                    <span className="font-medium">{employee?.department.deptName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Standard Hours:</span>
                    <span className="font-medium">9:00 AM - 5:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Daily Target:</span>
                    <span className="font-medium">8 hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Grace Period:</span>
                    <span className="font-medium">15 minutes</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-gray-600">
                  <p>• Check in within 15 minutes of your start time to avoid being marked late</p>
                  <p>• Add notes to track important activities or explain any delays</p>
                  <p>• Your work hours are automatically calculated</p>
                  <p>• View your attendance history in the Records tab</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="records">
          <AttendanceRecordsTable />
        </TabsContent>

        {canViewReports && (
          <TabsContent value="reports">
            <MonthlyReport />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}