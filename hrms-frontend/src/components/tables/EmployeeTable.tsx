import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { 
  MoreHorizontal, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Filter,
  Loader2,
  Plus,
  X
} from 'lucide-react';
import { employeeApi } from '../../lib/employeeApi';
import { useAuthStore } from '../../stores/authStore';
import type { Employee } from '../../types';
import { toast } from 'sonner';
import { formatDate } from '../../lib/utils';

interface EmployeeTableProps {
  onEdit: (employee: Employee) => void;
  onAdd: () => void;
}

interface Filters {
  departments: string[];
  roles: string[];
  status: string[];
}

export function EmployeeTable({ onEdit, onAdd }: EmployeeTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    departments: [],
    roles: [],
    status: [],
  });
  
  const queryClient = useQueryClient();
  const { employee: currentUser } = useAuthStore();

  // Fetch employees
  const { data: employees = [], isLoading, error } = useQuery({
    queryKey: ['employees'],
    queryFn: employeeApi.getEmployees,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: employeeApi.deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee deactivated successfully');
      setShowDeleteDialog(false);
      setSelectedEmployee(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to deactivate employee');
    },
  });

  // Get unique values for filters
  const uniqueDepartments = [...new Set(employees.map(emp => emp.department.deptName))];
  const uniqueRoles = [...new Set(employees.map(emp => emp.role.roleName))];
  const statusOptions = ['Active', 'Inactive'];

  // Apply filters and search
  const filteredEmployees = employees.filter(employee => {
    // Search filter
    const matchesSearch = 
      employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department.deptName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.role.roleName.toLowerCase().includes(searchTerm.toLowerCase());

    // Department filter
    const matchesDepartment = filters.departments.length === 0 || 
      filters.departments.includes(employee.department.deptName);

    // Role filter
    const matchesRole = filters.roles.length === 0 || 
      filters.roles.includes(employee.role.roleName);

    // Status filter
    const employeeStatus = employee.isActive ? 'Active' : 'Inactive';
    const matchesStatus = filters.status.length === 0 || 
      filters.status.includes(employeeStatus);

    return matchesSearch && matchesDepartment && matchesRole && matchesStatus;
  });

  const handleFilterChange = (filterType: keyof Filters, value: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: checked 
        ? [...prev[filterType], value]
        : prev[filterType].filter(item => item !== value)
    }));
  };

  const clearFilters = () => {
    setFilters({
      departments: [],
      roles: [],
      status: [],
    });
  };

  const activeFiltersCount = filters.departments.length + filters.roles.length + filters.status.length;

  const handleDelete = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedEmployee) {
      deleteMutation.mutate(selectedEmployee.id);
    }
  };

  const canEdit = (employee: Employee) => {
    if (!currentUser) return false;
    
    const userRole = currentUser.role.roleName;
    
    // Admin and HR can edit anyone
    if (['ADMIN', 'HR'].includes(userRole)) return true;
    
    // Department heads can edit employees in their department
    if (userRole === 'DEPARTMENT_HEAD') {
      return employee.department.id === currentUser.department.id;
    }
    
    return false;
  };

  const canDelete = (employee: Employee) => {
    if (!currentUser) return false;
    
    // Only Admin and HR can delete
    const userRole = currentUser.role.roleName;
    return ['ADMIN', 'HR'].includes(userRole) && employee.id !== currentUser.id;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Loading employees...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-red-600">Failed to load employees. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Employees</CardTitle>
              <CardDescription>
                Manage employee information and access
              </CardDescription>
            </div>
            {(['ADMIN', 'HR'].includes(currentUser?.role.roleName || '')) && (
              <Button onClick={onAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex items-center space-x-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filters</h4>
                    {activeFiltersCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>

                  {/* Department Filter */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Department</label>
                    <div className="space-y-2">
                      {uniqueDepartments.map(dept => (
                        <div key={dept} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`dept-${dept}`}
                            checked={filters.departments.includes(dept)}
                            onChange={(e) => handleFilterChange('departments', dept, e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <label htmlFor={`dept-${dept}`} className="text-sm">
                            {dept}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Role Filter */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Role</label>
                    <div className="space-y-2">
                      {uniqueRoles.map(role => (
                        <div key={role} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`role-${role}`}
                            checked={filters.roles.includes(role)}
                            onChange={(e) => handleFilterChange('roles', role, e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <label htmlFor={`role-${role}`} className="text-sm">
                            {role}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <div className="space-y-2">
                      {statusOptions.map(status => (
                        <div key={status} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`status-${status}`}
                            checked={filters.status.includes(status)}
                            onChange={(e) => handleFilterChange('status', status, e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <label htmlFor={`status-${status}`} className="text-sm">
                            {status}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {filters.departments.map(dept => (
                <Badge key={`dept-${dept}`} variant="secondary" className="flex items-center gap-1">
                  Dept: {dept}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleFilterChange('departments', dept, false)}
                  />
                </Badge>
              ))}
              {filters.roles.map(role => (
                <Badge key={`role-${role}`} variant="secondary" className="flex items-center gap-1">
                  Role: {role}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleFilterChange('roles', role, false)}
                  />
                </Badge>
              ))}
              {filters.status.map(status => (
                <Badge key={`status-${status}`} variant="secondary" className="flex items-center gap-1">
                  Status: {status}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleFilterChange('status', status, false)}
                  />
                </Badge>
              ))}
            </div>
          )}

          {/* Employee Table */}
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No employees found.</p>
              {(searchTerm || activeFiltersCount > 0) && (
                <p className="text-sm mt-2">Try adjusting your search terms or filters.</p>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{employee.fullName}</div>
                          <div className="text-sm text-gray-500">
                            {employee.employeeId} • {employee.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {employee.role.roleName}
                        </Badge>
                      </TableCell>
                      <TableCell>{employee.department.deptName}</TableCell>
                      <TableCell>
                        {employee.manager ? (
                          <div className="text-sm">
                            <div>{employee.manager.fullName}</div>
                            <div className="text-gray-500">{employee.manager.employeeId}</div>
                          </div>
                        ) : (
                          <span className="text-gray-500">No Manager</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.isActive ? "default" : "destructive"}>
                          {employee.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(employee.dateOfJoining)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {/* View employee details */}}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {canEdit(employee) && (
                              <DropdownMenuItem
                                onClick={() => onEdit(employee)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {canDelete(employee) && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(employee)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
              Showing {filteredEmployees.length} of {employees.length} employees
            </div>
            <div>
              Active: {employees.filter(e => e.isActive).length} • 
              Inactive: {employees.filter(e => !e.isActive).length}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate{' '}
              <strong>{selectedEmployee?.fullName}</strong>? This will disable their
              access to the system but preserve their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deactivating...
                </>
              ) : (
                'Deactivate'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}