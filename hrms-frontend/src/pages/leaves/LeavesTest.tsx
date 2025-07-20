import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { LeaveBalance } from '../../components/leaves/LeaveBalance';
import { LeaveApplicationForm } from '../../components/leaves/LeaveApplicationForm';
import { LeaveRequestsTable } from '../../components/leaves/LeaveRequestsTable';
import { Button } from '../../components/ui/button';
import { Plus } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export function LeavesTest() {
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [activeTab, setActiveTab] = useState('balance');
  const { employee } = useAuthStore();

  const canViewRequests = ['ADMIN', 'HR', 'DEPARTMENT_HEAD', 'TEAM_LEAD'].includes(employee?.role.roleName || '');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
          <p className="mt-2 text-gray-600">
            Manage your leave applications, view balance, and track requests
          </p>
        </div>
        
        <Button onClick={() => setShowApplicationForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Apply for Leave
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full ${canViewRequests ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="balance">Leave Balance</TabsTrigger>
          <TabsTrigger value="requests">My Requests</TabsTrigger>
          {canViewRequests && (
            <TabsTrigger value="approvals">Team Requests</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="balance">
          <LeaveBalance />
        </TabsContent>

        <TabsContent value="requests">
          <LeaveRequestsTable />
        </TabsContent>

        {canViewRequests && (
          <TabsContent value="approvals">
            <LeaveRequestsTable />
          </TabsContent>
        )}
      </Tabs>

      <LeaveApplicationForm
        open={showApplicationForm}
        onOpenChange={setShowApplicationForm}
      />
    </div>
  );
}