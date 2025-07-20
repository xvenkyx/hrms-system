import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Clock, LogIn, LogOut, MapPin, Coffee, Loader2 } from 'lucide-react';
import { attendanceApi } from '../../lib/attendanceApi';
import { RealTimeClock } from './RealTimeClock';
import { toast } from 'sonner';
import type { TodayAttendance } from '../../types';

export function AttendanceWidget() {
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [showCheckOutDialog, setShowCheckOutDialog] = useState(false);
  const [notes, setNotes] = useState('');
  const [currentWorkHours, setCurrentWorkHours] = useState<number>(0);
  const queryClient = useQueryClient();

  // Fetch today's attendance
  const { data: todayAttendance, isLoading } = useQuery({
    queryKey: ['todayAttendance'],
    queryFn: attendanceApi.getTodayAttendance,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Calculate real-time work hours
  useEffect(() => {
    const calculateWorkHours = () => {
      if (todayAttendance?.checkInTime && !todayAttendance?.checkOutTime) {
        // User is currently checked in - calculate real-time hours
        const checkInTime = new Date(todayAttendance.checkInTime).getTime();
        const currentTime = new Date().getTime();
        const hoursWorked = (currentTime - checkInTime) / (1000 * 60 * 60); // Convert to hours
        setCurrentWorkHours(hoursWorked);
      } else if (todayAttendance?.workHours) {
        // User has checked out - use stored work hours
        setCurrentWorkHours(todayAttendance.workHours);
      } else {
        // No check-in yet
        setCurrentWorkHours(0);
      }
    };

    // Calculate immediately
    calculateWorkHours();

    // Update every second for real-time effect
    const interval = setInterval(calculateWorkHours, 1000);

    return () => clearInterval(interval);
  }, [todayAttendance]);

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: attendanceApi.checkIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayAttendance'] });
      toast.success('Checked in successfully!');
      setShowCheckInDialog(false);
      setNotes('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to check in');
    },
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: attendanceApi.checkOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayAttendance'] });
      toast.success('Checked out successfully!');
      setShowCheckOutDialog(false);
      setNotes('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to check out');
    },
  });

  const handleCheckIn = () => {
    checkInMutation.mutate({ notes: notes.trim() || undefined });
  };

  const handleCheckOut = () => {
    checkOutMutation.mutate({ notes: notes.trim() || undefined });
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'ON_TIME':
        return 'bg-green-100 text-green-800';
      case 'LATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'EARLY_OUT':
        return 'bg-orange-100 text-orange-800';
      case 'ABSENT':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string | null) => {
    switch (status) {
      case 'ON_TIME':
        return 'On Time';
      case 'LATE':
        return 'Late';
      case 'EARLY_OUT':
        return 'Early Out';
      case 'ABSENT':
        return 'Absent';
      default:
        return 'Not Checked In';
    }
  };

  const formatWorkHours = (hours: number) => {
    if (!hours || hours === 0) return '0h 0m';
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isCheckedIn = todayAttendance?.checkInTime && !todayAttendance?.checkOutTime;
  const isCheckedOut = todayAttendance?.checkInTime && todayAttendance?.checkOutTime;
  const canCheckIn = !todayAttendance?.checkInTime;
  const canCheckOut = todayAttendance?.checkInTime && !todayAttendance?.checkOutTime;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Loading attendance...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Attendance
          </CardTitle>
          <CardDescription>Track your daily work hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Real-time Clock */}
          <RealTimeClock />

          {/* Status and Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Today's Status:</span>
              <Badge className={getStatusColor(todayAttendance?.status || null)}>
                {getStatusText(todayAttendance?.status || null)}
              </Badge>
            </div>

            {todayAttendance?.checkInTime && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Check In:</span>
                  <div className="font-medium">{formatTime(todayAttendance.checkInTime)}</div>
                </div>
                {todayAttendance.checkOutTime && (
                  <div>
                    <span className="text-gray-600">Check Out:</span>
                    <div className="font-medium">{formatTime(todayAttendance.checkOutTime)}</div>
                  </div>
                )}
              </div>
            )}

            {/* Real-time Work Hours Display */}
            {(isCheckedIn || isCheckedOut) && (
              <div className={`text-center p-4 rounded-lg ${
                isCheckedIn ? 'bg-green-50' : 'bg-blue-50'
              }`}>
                <div className={`text-sm mb-1 ${
                  isCheckedIn ? 'text-green-600' : 'text-blue-600'
                }`}>
                  {isCheckedIn ? 'Work Hours Today (Live)' : 'Total Work Hours'}
                </div>
                <div className={`text-2xl font-bold ${
                  isCheckedIn ? 'text-green-700' : 'text-blue-700'
                }`}>
                  {formatWorkHours(currentWorkHours)}
                </div>
                {isCheckedIn && (
                  <div className="text-xs text-green-500 mt-1">
                    ⏱️ Updating live
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={() => setShowCheckInDialog(true)}
              disabled={!canCheckIn || checkInMutation.isPending}
              className="flex-1"
              size="lg"
            >
              {checkInMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Check In
            </Button>

            <Button
              onClick={() => setShowCheckOutDialog(true)}
              disabled={!canCheckOut || checkOutMutation.isPending}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              {checkOutMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Check Out
            </Button>
          </div>

          {/* Notes Display */}
          {todayAttendance?.notes && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-1">Today's Notes:</div>
              <div className="text-sm text-gray-600">{todayAttendance.notes}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check In Dialog */}
      <Dialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check In</DialogTitle>
            <DialogDescription>
              Record your arrival time and add any notes about your day.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="checkInNotes">Notes (Optional)</Label>
              <Textarea
                id="checkInNotes"
                placeholder="Ready to start the day!"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckInDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCheckIn} disabled={checkInMutation.isPending}>
              {checkInMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking In...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Check In
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check Out Dialog */}
      <Dialog open={showCheckOutDialog} onOpenChange={setShowCheckOutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check Out</DialogTitle>
            <DialogDescription>
              Record your departure time and add any notes about your work today.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600 mb-1">Work Hours Today</div>
              <div className="text-xl font-bold text-blue-700">
                {formatWorkHours(currentWorkHours)}
              </div>
            </div>

            <div>
              <Label htmlFor="checkOutNotes">Notes (Optional)</Label>
              <Textarea
                id="checkOutNotes"
                placeholder="Productive day completed!"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckOutDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCheckOut} disabled={checkOutMutation.isPending}>
              {checkOutMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking Out...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Check Out
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}