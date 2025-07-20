import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Loader2, Calculator, AlertCircle } from "lucide-react";
import { payrollApi } from "../../lib/payrollApi";
import { employeeApi } from "../../lib/employeeApi";
import type { Department } from "../../types";
import { toast } from "sonner";

const generatePayrollSchema = z.object({
  month: z.string().min(1, "Month is required"),
  departmentId: z.string().optional(),
});

type GeneratePayrollFormData = z.infer<typeof generatePayrollSchema>;

interface GeneratePayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GeneratePayrollDialog({
  open,
  onOpenChange,
}: GeneratePayrollDialogProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<GeneratePayrollFormData>({
    resolver: zodResolver(generatePayrollSchema),
  });

  // Load departments
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const departmentsData = await employeeApi.getDepartments();
        setDepartments(departmentsData);
      } catch (error) {
        console.error("Failed to load departments:", error);
      }
    };

    if (open) {
      loadDepartments();
    }
  }, [open]);

  // Generate payroll mutation
  const generateMutation = useMutation({
    mutationFn: payrollApi.generatePayroll,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payrollRecords"] });
      
      if (data.errors && data.errors.length > 0) {
        toast.warning(
          `Payroll generated with ${data.errors.length} warnings. Check console for details.`
        );
        console.warn("Payroll generation warnings:", data.errors);
      } else {
        toast.success(`Successfully generated payroll for ${data.success} employees!`);
      }
      
      reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to generate payroll"
      );
    },
  });

  const onSubmit = (data: GeneratePayrollFormData) => {
    const submitData = {
      month: data.month,
      ...(data.departmentId && { departmentId: data.departmentId }),
    };

    generateMutation.mutate(submitData);
  };

  // Generate month options for current and next month
  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    // Current month
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Add current month and next few months
    for (let i = 0; i < 6; i++) {
      const date = new Date(currentYear, currentMonth + i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthStr = month.toString().padStart(2, '0');
      const value = `${year}-${monthStr}`;
      const label = date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      });
      options.push({ value, label });
    }
    
    return options;
  };

  const monthOptions = generateMonthOptions();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Generate Payroll
          </DialogTitle>
          <DialogDescription>
            Generate payroll records for employees based on their attendance and salary details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Month</Label>
            <Select
              onValueChange={(value) => setValue("month", value)}
            >
              <SelectTrigger
                className={errors.month ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.month && (
              <p className="text-sm text-red-500">{errors.month.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Department (Optional)</Label>
            <Select
              onValueChange={(value) => 
                setValue("departmentId", value === "all" ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.deptName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Important Notes:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Payroll will be calculated based on attendance records</li>
                  <li>Employees must have valid salary details</li>
                  <li>Performance incentives are calculated automatically</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  Generate Payroll
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}