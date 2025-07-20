import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Calendar, Clock, Heart, Baby, Loader2 } from 'lucide-react';
import { leaveApi } from '../../lib/leaveApi';

export function LeaveBalance() {
  const currentYear = new Date().getFullYear();
  
  const { data: leaveBalance, isLoading } = useQuery({
    queryKey: ['leaveBalance', currentYear],
    queryFn: () => leaveApi.getLeaveBalance(currentYear),
  });

  const getProgressColor = (used: number, total: number) => {
    const percentage = (used / total) * 100;
    if (percentage >= 80) return 'bg-red-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const leaveTypes = [
    {
      type: 'Casual Leave',
      icon: Calendar,
      total: leaveBalance?.casualLeaves || 0,
      used: leaveBalance?.usedCasual || 0,
      remaining: leaveBalance?.casualRemaining || 0,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      type: 'Sick Leave',
      icon: Heart,
      total: leaveBalance?.sickLeaves || 0,
      used: leaveBalance?.usedSick || 0,
      remaining: leaveBalance?.sickRemaining || 0,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      type: 'Annual Leave',
      icon: Clock,
      total: leaveBalance?.annualLeaves || 0,
      used: leaveBalance?.usedAnnual || 0,
      remaining: leaveBalance?.annualRemaining || 0,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Loading leave balance...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Leave Balance {currentYear}
        </CardTitle>
        <CardDescription>
          Your available leave days for the current year
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {leaveTypes.map((leave) => {
            const Icon = leave.icon;
            const percentage = leave.total > 0 ? (leave.used / leave.total) * 100 : 0;
            
            return (
              <div key={leave.type} className={`p-4 rounded-lg ${leave.bgColor}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${leave.color}`} />
                    <span className="font-medium text-gray-900">{leave.type}</span>
                  </div>
                  <Badge variant="secondary">
                    {leave.remaining} left
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Used: {leave.used}</span>
                    <span>Total: {leave.total}</span>
                  </div>
                  
                  <Progress 
                    value={percentage} 
                    className="h-2"
                  />
                  
                  <div className="text-center">
                    <span className={`text-lg font-bold ${leave.color}`}>
                      {leave.remaining}
                    </span>
                    <span className="text-sm text-gray-600 ml-1">days remaining</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Special Leave Types */}
        <div className="mt-6 p-4 bg-purple-50 rounded-lg">
          <h4 className="font-medium text-purple-900 mb-2 flex items-center gap-2">
            <Baby className="h-4 w-4" />
            Special Leave Types
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-purple-700">
            <div>• Maternity Leave: Unlimited</div>
            <div>• Paternity Leave: Unlimited</div>
            <div>• Other Leave: Unlimited</div>
          </div>
          <p className="text-xs text-purple-600 mt-2">
            These leave types don't count against your annual balance
          </p>
        </div>
      </CardContent>
    </Card>
  );
}