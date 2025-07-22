import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Loader2 } from "lucide-react";
import { employeeApi } from "../../lib/employeeApi";
import type { Employee, Role, Department, Manager } from "../../types";
import { toast } from "sonner";

// ✅ Schema with working salary validation
const employeeSchema = z.object({
  employeeId: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfJoining: z.string().min(1),
  roleId: z.string().min(1),
  departmentId: z.string().min(1),
  managerId: z.string().optional(),
  // ✅ Nested salaryDetail
  salaryDetail: z.object({
    basicSalary: z.string(),
    effectiveFrom: z.string().optional(),
  }),
  // basicSalary: z.string(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;
interface EmployeeFormProps {
  employee?: Employee;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EmployeeForm({
  employee,
  onSuccess,
  onCancel,
}: EmployeeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");

  const isEditing = !!employee;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: employee
      ? {
          employeeId: employee.employeeId,
          email: employee.email,
          fullName: employee.fullName,
          phone: employee.phone || "",
          address: employee.address || "",
          dateOfJoining: employee.dateOfJoining.split("T")[0],
          roleId: employee.role.id,
          departmentId: employee.department.id,
          managerId: employee.manager?.id || "",
          salaryDetail: {
            basicSalary: employee.salaryDetails?.[0]?.basicSalary || "",
            effectiveFrom:
              employee.salaryDetails?.[0]?.effectiveFrom?.split("T")[0] || "",
          },
          // basicSalary: employee.salaryDetails?.[0]?.basicSalary || "",
        }
      : {
          employeeId: "",
          email: "",
          password: "",
          fullName: "",
          phone: "",
          address: "",
          dateOfJoining: "",
          roleId: "",
          departmentId: "",
          managerId: "",
          salaryDetail: {
            basicSalary: "",
            effectiveFrom: "",
          },
        },
  });

  const watchedSalary = Number(watch("salaryDetail.basicSalary"));
  const hra = Math.round(watchedSalary * 0.4);
  const travel = Math.round(watchedSalary * 0.1);
  const pf = 3600;
  const pt = 200;
  const total = watchedSalary + hra + travel - pf - pt;

  const watchedDepartment = watch("departmentId");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [rolesData, departmentsData] = await Promise.all([
          employeeApi.getRoles(),
          employeeApi.getDepartments(),
        ]);
        setRoles(rolesData);
        setDepartments(departmentsData);
        if (employee) setSelectedDepartment(employee.department.id);
      } catch {
        toast.error("Failed to load form data");
      }
    };
    loadData();
  }, [employee]);

  useEffect(() => {
    if (watchedDepartment && watchedDepartment !== selectedDepartment) {
      employeeApi
        .getManagersByDepartment(watchedDepartment)
        .then((data) => {
          setManagers(data);
          setSelectedDepartment(watchedDepartment);
        })
        .catch(() => setManagers([]));
      setValue("managerId", "");
    }
  }, [watchedDepartment, selectedDepartment, setValue]);

  const onSubmit = async (data: EmployeeFormData) => {
    setIsLoading(true);
    try {
      if (!data.managerId) delete data.managerId;
      if (isEditing) {
        const { password, ...updateData } = data;
        await employeeApi.updateEmployee(employee!.id, updateData);
        toast.success("Employee updated successfully");
      } else {
        await employeeApi.createEmployee(data);
        toast.success("Employee created successfully");
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save employee");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isEditing ? "Edit Employee" : "Add New Employee"}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? "Update employee information"
            : "Create a new employee account"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input id="employeeId" {...register("employeeId")} />
              {errors.employeeId && (
                <p className="text-red-500">{errors.employeeId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-red-500">{errors.email.message}</p>
              )}
            </div>
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && (
                <p className="text-red-500">{errors.password.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" {...register("fullName")} />
            {errors.fullName && (
              <p className="text-red-500">{errors.fullName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div>
              <Label htmlFor="dateOfJoining">Date of Joining</Label>
              <Input
                id="dateOfJoining"
                type="date"
                {...register("dateOfJoining")}
              />
              {errors.dateOfJoining && (
                <p className="text-red-500">{errors.dateOfJoining.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" rows={3} {...register("address")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="basicSalary">Basic Salary</Label>
            <Input
              id="basicSalary"
              type="number"
              {...register("salaryDetail.basicSalary")}
            />
            {errors.salaryDetail?.basicSalary && (
              <p className="text-red-500">{errors.salaryDetail?.basicSalary.message}</p>
            )}
          </div>

          {/* Salary Preview Card */}
          <Card className="border bg-gray-50 p-4">
            <h3 className="text-lg font-semibold mb-2">Salary Preview</h3>
            <p>Basic: ₹{watchedSalary}</p>
            <p>HRA (40%): ₹{hra}</p>
            <p>Travel Allowance (10%): ₹{travel}</p>
            <p>PF Deduction: ₹{pf}</p>
            <p>PT Deduction: ₹{pt}</p>
            <p className="font-semibold mt-2">Net Take Home: ₹{total}</p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Department</Label>
              <Select
                onValueChange={(val) => setValue("departmentId", val)}
                defaultValue={employee?.department.id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.deptName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select
                onValueChange={(val) => setValue("roleId", val)}
                defaultValue={employee?.role.id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.roleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Manager</Label>
            <Select
              onValueChange={(val) =>
                setValue("managerId", val === "none" ? "" : val)
              }
              defaultValue={employee?.manager?.id || "none"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Manager</SelectItem>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.fullName} ({m.employeeId}) - {m.role.roleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end pt-4 gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : isEditing ? (
                "Update Employee"
              ) : (
                "Create Employee"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
