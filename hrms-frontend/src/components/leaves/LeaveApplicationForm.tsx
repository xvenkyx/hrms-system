import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { CalendarDays, Send, Loader2 } from 'lucide-react';
import { leaveApi } from '../../lib/leaveApi';
import { toast } from 'sonner';

const leaveSchema = z.object({
  leaveType: z.enum(['CASUAL', 'SICK', 'ANNUAL', 'MATERNITY', 'PATERNITY', 'OTHER'], {
    message: 'Please select a leave type', // Changed from required_error to message
  }),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500, 'Reason must be less than 500 characters'),
});

type LeaveFormData = z.infer<typeof leaveSchema>;

interface LeaveApplicationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeaveApplicationForm({ open, onOpenChange }: LeaveApplicationFormProps) {
  const queryClient = useQueryClient();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<LeaveFormData>({
    resolver: zodResolver(leaveSchema),
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');

  // Calculate total days
  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    const timeDiff = endDateObj.getTime() - startDateObj.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  };

  const totalDays = calculateDays(startDate, endDate);

  // Apply for leave mutation
  const applyMutation = useMutation({
    mutationFn: leaveApi.applyForLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] });
      toast.success('Leave application submitted successfully!');
      reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit leave application');
    },
  });

  const onSubmit = (data: LeaveFormData) => {
    // Validate dates
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      toast.error('Start date cannot be in the past');
      return;
    }

    if (end < start) {
      toast.error('End date cannot be before start date');
      return;
    }

    applyMutation.mutate(data);
  };

  const leaveTypes = [
    { value: 'CASUAL', label: 'Casual Leave', description: 'For personal activities' },
    { value: 'SICK', label: 'Sick Leave', description: 'For health-related absences' },
    { value: 'ANNUAL', label: 'Annual Leave', description: 'For vacations and planned time off' },
    { value: 'MATERNITY', label: 'Maternity Leave', description: 'For childbirth and recovery' },
    { value: 'PATERNITY', label: 'Paternity Leave', description: 'For new fathers' },
    { value: 'OTHER', label: 'Other Leave', description: 'For other approved reasons' },
  ];

  // Set minimum date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Apply for Leave
          </DialogTitle>
          <DialogDescription>
            Submit a new leave application for approval
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select onValueChange={(value) => setValue('leaveType', value as any)}>
                <SelectTrigger className={errors.leaveType ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-gray-500">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.leaveType && (
                <p className="text-sm text-red-500">{errors.leaveType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Total Days</Label>
              <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 flex items-center">
                <span className="text-lg font-semibold text-blue-600">
                  {totalDays > 0 ? `${totalDays} day${totalDays > 1 ? 's' : ''}` : '--'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                min={minDate}
                {...register('startDate')}
                className={errors.startDate ? 'border-red-500' : ''}
              />
              {errors.startDate && (
                <p className="text-sm text-red-500">{errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                min={startDate || minDate}
                {...register('endDate')}
                className={errors.endDate ? 'border-red-500' : ''}
              />
              {errors.endDate && (
                <p className="text-sm text-red-500">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Leave</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a detailed reason for your leave request..."
              rows={4}
              {...register('reason')}
              className={errors.reason ? 'border-red-500' : ''}
            />
            {errors.reason && (
              <p className="text-sm text-red-500">{errors.reason.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Minimum 10 characters, maximum 500 characters
            </p>
          </div>

          {totalDays > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Leave Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-600">Start Date:</span>
                  <div className="font-medium">
                    {startDate ? new Date(startDate).toLocaleDateString() : '--'}
                  </div>
                </div>
                <div>
                  <span className="text-blue-600">End Date:</span>
                  <div className="font-medium">
                    {endDate ? new Date(endDate).toLocaleDateString() : '--'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={applyMutation.isPending || totalDays <= 0}>
              {applyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Application
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}