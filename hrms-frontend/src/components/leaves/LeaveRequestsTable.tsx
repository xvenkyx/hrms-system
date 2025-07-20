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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { 
  MoreHorizontal, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Eye,
  Edit,
  Trash2,
  Calendar,
  Loader2,
  Clock
} from 'lucide-react';
import { leaveApi } from '../../lib/leaveApi';
import { useAuthStore } from '../../stores/authStore';
import type { LeaveRequest } from '../../types';
import { toast } from 'sonner';
import { formatDate } from '../../lib/utils';

// Define proper types for filters
type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type LeaveType = 'CASUAL' | 'SICK' | 'ANNUAL' | 'MATERNITY' | 'PATERNITY' | 'OTHER';

export function LeaveRequestsTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'ALL'>('ALL'); // Changed to 'ALL'
  const [typeFilter, setTypeFilter] = useState<LeaveType | 'ALL'>('ALL'); // Changed to 'ALL'
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [approvalNotes, setApprovalNotes] = useState('');
  
  const queryClient = useQueryClient();
  const { employee } = useAuthStore();

  // Fetch leave requests with properly typed parameters
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['leaveRequests', statusFilter, typeFilter],
    queryFn: () => leaveApi.getLeaveRequests({
      status: statusFilter === 'ALL' ? undefined : statusFilter, // Convert 'ALL' to undefined
      leaveType: typeFilter === 'ALL' ? undefined : typeFilter, // Convert 'ALL' to undefined
    }),
  });

  // Approval mutation
  const approvalMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      leaveApi.approveLeave(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] });
      toast.success(`Leave request ${data.status.toLowerCase()} successfully!`);
      setShowApprovalDialog(false);
      setSelectedRequest(null);
      setApprovalNotes('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to process leave request');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: leaveApi.deleteLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      toast.success('Leave request deleted successfully');
      setShowDeleteDialog(false);
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete leave request');
    },
  });

  // Filter requests based on search term
  const filteredRequests = requests.filter(request =>
    request.employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApproval = (request: LeaveRequest, action: 'APPROVED' | 'REJECTED') => {
    setSelectedRequest(request);
    setApprovalAction(action);
    setShowApprovalDialog(true);
  };

  const handleDelete = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowDeleteDialog(true);
  };

  const confirmApproval = () => {
    if (!selectedRequest) return;

    approvalMutation.mutate({
      id: selectedRequest.id,
      data: {
        status: approvalAction,
        approvalNotes: approvalNotes.trim() || undefined,
      },
    });
  };

  const confirmDelete = () => {
    if (!selectedRequest) return;
    deleteMutation.mutate(selectedRequest.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'CASUAL':
        return 'bg-blue-100 text-blue-800';
      case 'SICK':
        return 'bg-red-100 text-red-800';
      case 'ANNUAL':
        return 'bg-green-100 text-green-800';
      case 'MATERNITY':
      case 'PATERNITY':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canApprove = (request: LeaveRequest) => {
    const userRole = employee?.role.roleName;
    return ['ADMIN', 'HR', 'DEPARTMENT_HEAD', 'TEAM_LEAD'].includes(userRole || '') &&
           request.status === 'PENDING' &&
           request.employeeId !== employee?.id;
  };

  const canEdit = (request: LeaveRequest) => {
    return request.employeeId === employee?.id && request.status === 'PENDING';
  };

  const canDelete = (request: LeaveRequest) => {
    return request.employeeId === employee?.id && request.status === 'PENDING';
  };

  const canViewAllRequests = ['ADMIN', 'HR', 'DEPARTMENT_HEAD', 'TEAM_LEAD'].includes(employee?.role.roleName || '');

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Leave Requests
              </CardTitle>
              <CardDescription>
                {canViewAllRequests ? 'Manage leave requests and approvals' : 'View your leave request history'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, ID, or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as LeaveStatus | 'ALL')}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as LeaveType | 'ALL')}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="CASUAL">Casual</SelectItem>
                  <SelectItem value="SICK">Sick</SelectItem>
                  <SelectItem value="ANNUAL">Annual</SelectItem>
                  <SelectItem value="MATERNITY">Maternity</SelectItem>
                  <SelectItem value="PATERNITY">Paternity</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Requests Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-gray-600">Loading leave requests...</p>
              </div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No leave requests found.</p>
              {searchTerm && (
                <p className="text-sm mt-2">Try adjusting your search or filters.</p>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request Details</TableHead>
                    {canViewAllRequests && <TableHead>Employee</TableHead>}
                    <TableHead>Leave Period</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.totalDays} days</div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {request.reason}
                          </div>
                        </div>
                      </TableCell>

                      {canViewAllRequests && (
                        <TableCell>
                          <div>
                            <div className="font-medium">{request.employee.fullName}</div>
                            <div className="text-sm text-gray-500">
                              {request.employee.employeeId}
                              {request.employee.department && (
                                <> • {request.employee.department.deptName}</>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      )}

                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge className={getLeaveTypeColor(request.leaveType)}>
                          {request.leaveType}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                        {request.approver && (
                          <div className="text-xs text-gray-500 mt-1">
                            by {request.approver.fullName}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          {formatDate(request.appliedAt)}
                        </div>
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
                            
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>

                            {canApprove(request) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleApproval(request, 'APPROVED')}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleApproval(request, 'REJECTED')}
                                  className="text-red-600"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}

                            {canEdit(request) && (
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}

                            {canDelete(request) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(request)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
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
              Showing {filteredRequests.length} of {requests.length} requests
            </div>
            <div className="flex gap-4">
              <span>Pending: {requests.filter(r => r.status === 'PENDING').length}</span>
              <span>Approved: {requests.filter(r => r.status === 'APPROVED').length}</span>
              <span>Rejected: {requests.filter(r => r.status === 'REJECTED').length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'APPROVED' ? 'Approve' : 'Reject'} Leave Request
            </DialogTitle>
            <DialogDescription>
              {approvalAction === 'APPROVED' 
                ? 'Are you sure you want to approve this leave request?'
                : 'Are you sure you want to reject this leave request?'
              }
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Request Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Employee: {selectedRequest.employee.fullName}</div>
                  <div>Type: {selectedRequest.leaveType}</div>
                  <div>Duration: {selectedRequest.totalDays} days</div>
                  <div>Dates: {formatDate(selectedRequest.startDate)} - {formatDate(selectedRequest.endDate)}</div>
                </div>
                <div className="mt-2">
                  <div className="text-sm font-medium">Reason:</div>
                  <div className="text-sm text-gray-600">{selectedRequest.reason}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approvalNotes">
                  {approvalAction === 'APPROVED' ? 'Approval' : 'Rejection'} Notes (Optional)
                </Label>
                <Textarea
                  id="approvalNotes"
                  placeholder={`Add notes for this ${approvalAction.toLowerCase()}...`}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmApproval}
              disabled={approvalMutation.isPending}
              className={approvalAction === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {approvalMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {approvalAction === 'APPROVED' ? (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  {approvalAction === 'APPROVED' ? 'Approve' : 'Reject'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Leave Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this leave request? This action cannot be undone.
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
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}