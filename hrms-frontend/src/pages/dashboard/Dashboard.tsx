import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

export function Dashboard() {
  const { employee } = useAuthStore();

  const getWelcomeMessage = () => {
    switch (employee?.role.roleName) {
      case 'ADMIN':
        return 'You have full system access and can manage all aspects of the HRMS.';
      case 'HR':
        return 'You can manage employees, payroll, and leave requests.';
      case 'DEPARTMENT_HEAD':
        return `You can manage your ${employee.department.deptName} department and approve leave requests.`;
      case 'TEAM_LEAD':
        return 'You can assign tasks and manage your team.';
      case 'TECHNICAL_EXPERT':
        return 'You can update task status and manage your personal information.';
      default:
        return 'Welcome to the HRMS system.';
    }
  };

  const getPermissions = () => {
    if (!employee?.role.permissions) return [];
    
    const permissions = employee.role.permissions;
    const permissionList = [];
    
    if (permissions.canManageEmployees) permissionList.push('Manage Employees');
    if (permissions.canManagePayroll) permissionList.push('Manage Payroll');
    if (permissions.canApproveLeaves) permissionList.push('Approve Leaves');
    if (permissions.canManageTasks) permissionList.push('Manage Tasks');
    if (permissions.canViewAllData) permissionList.push('View All Data');
    
    return permissionList;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back, {employee?.fullName}! Here's an overview of your account.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Employee ID</p>
              <p className="text-lg">{employee?.employeeId}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="text-lg">{employee?.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Department</p>
              <p className="text-lg">{employee?.department.deptName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Role</p>
              <Badge variant="secondary">{employee?.role.roleName}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Welcome Message */}
        <Card>
          <CardHeader>
            <CardTitle>Welcome Message</CardTitle>
            <CardDescription>Your role and responsibilities</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{getWelcomeMessage()}</p>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardHeader>
            <CardTitle>Your Permissions</CardTitle>
            <CardDescription>What you can do in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {getPermissions().map((permission) => (
                <Badge key={permission} variant="outline">
                  {permission}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks based on your role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>Quick action buttons will be added here based on your role.</p>
            <p className="text-sm mt-2">This is where role-specific functionality will appear.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}