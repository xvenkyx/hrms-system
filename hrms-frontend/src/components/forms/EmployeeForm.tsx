import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Loader2 } from 'lucide-react';
import { employeeApi } from '../../lib/employeeApi';
import type { Employee, Role, Department, Manager } from '../../types';
import { toast } from 'sonner';

const employeeSchema = z.object({
  employeeId: z.string().min(3, 'Employee ID must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfJoining: z.string().min(1, 'Date of joining is required'),
  roleId: z.string().min(1, 'Role is required'),
  departmentId: z.string().min(1, 'Department is required'),
  managerId: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  employee?: Employee;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EmployeeForm({ employee, onSuccess, onCancel }: EmployeeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');

  const isEditing = !!employee;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: employee ? {
      employeeId: employee.employeeId,
      email: employee.email,
      fullName: employee.fullName,
      phone: employee.phone || '',
      address: employee.address || '',
      dateOfJoining: employee.dateOfJoining.split('T')[0],
      roleId: employee.role.id,
      departmentId: employee.department.id,
      managerId: employee.manager?.id || '',
    } : {
      employeeId: '',
      email: '',
      password: '',
      fullName: '',
      phone: '',
      address: '',
      dateOfJoining: '',
      roleId: '',
      departmentId: '',
      managerId: '',
    },
  });

  const watchedDepartment = watch('departmentId');

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [rolesData, departmentsData] = await Promise.all([
          employeeApi.getRoles(),
          employeeApi.getDepartments(),
        ]);
        setRoles(rolesData);
        setDepartments(departmentsData);

        if (employee) {
          setSelectedDepartment(employee.department.id);
        }
      } catch (error) {
        toast.error('Failed to load form data');
      }
    };

    loadData();
  }, [employee]);

  // Load managers when department changes
  useEffect(() => {
    const loadManagers = async () => {
      if (watchedDepartment) {
        try {
          const managersData = await employeeApi.getManagersByDepartment(watchedDepartment);
          setManagers(managersData);
          setSelectedDepartment(watchedDepartment);
        } catch (error) {
          console.error('Failed to load managers:', error);
          setManagers([]);
        }
      }
    };

    if (watchedDepartment && watchedDepartment !== selectedDepartment) {
      loadManagers();
      setValue('managerId', ''); // Reset manager when department changes
    }
  }, [watchedDepartment, selectedDepartment, setValue]);

  const onSubmit = async (data: EmployeeFormData) => {
    setIsLoading(true);
    try {
      const submitData = { ...data };
      if (submitData.managerId === '') {
        delete submitData.managerId;
      }

      if (isEditing) {
        const { password, ...updateData } = submitData;
        await employeeApi.updateEmployee(employee.id, updateData);
        toast.success('Employee updated successfully');
      } else {
        await employeeApi.createEmployee(submitData as any);
        toast.success('Employee created successfully');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save employee');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Employee' : 'Add New Employee'}</CardTitle>
        <CardDescription>
          {isEditing ? 'Update employee information' : 'Create a new employee account'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                placeholder="EMP001"
                {...register('employeeId')}
                className={errors.employeeId ? 'border-red-500' : ''}
              />
              {errors.employeeId && (
                <p className="text-sm text-red-500">{errors.employeeId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@company.com"
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                {...register('password')}
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              {...register('fullName')}
              className={errors.fullName ? 'border-red-500' : ''}
            />
            {errors.fullName && (
              <p className="text-sm text-red-500">{errors.fullName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                placeholder="+1234567890"
                {...register('phone')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfJoining">Date of Joining</Label>
              <Input
                id="dateOfJoining"
                type="date"
                {...register('dateOfJoining')}
                className={errors.dateOfJoining ? 'border-red-500' : ''}
              />
              {errors.dateOfJoining && (
                <p className="text-sm text-red-500">{errors.dateOfJoining.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address (Optional)</Label>
            <Textarea
              id="address"
              placeholder="Enter address"
              {...register('address')}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                onValueChange={(value) => setValue('departmentId', value)}
                defaultValue={employee?.department.id || ''}
              >
                <SelectTrigger className={errors.departmentId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.deptName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.departmentId && (
                <p className="text-sm text-red-500">{errors.departmentId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                onValueChange={(value) => setValue('roleId', value)}
                defaultValue={employee?.role.id || ''}
              >
                <SelectTrigger className={errors.roleId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.roleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.roleId && (
                <p className="text-sm text-red-500">{errors.roleId.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Manager (Optional)</Label>
            <Select
              onValueChange={(value) => setValue('managerId', value === 'none' ? '' : value)}
              defaultValue={employee?.manager?.id || 'none'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Manager</SelectItem>
                {managers.map((manager) => (
                  <SelectItem key={manager.id} value={manager.id}>
                    {manager.fullName} ({manager.employeeId}) - {manager.role.roleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Update Employee' : 'Create Employee'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}