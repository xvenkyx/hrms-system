import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  MoreHorizontal,
  Search,
  Filter,
  Eye,
  FileText,
  Send,
  Trash2,
  Loader2,
  DollarSign,
  CheckCircle,
} from "lucide-react";
import { payrollApi } from "../../lib/payrollApi";
import { useAuthStore } from "../../stores/authStore";
import type { PayrollRecord } from "../../types";
import { toast } from "sonner";
import { formatDate } from "../../lib/utils";

type PayrollStatus = "DRAFT" | "GENERATED" | "SENT";

export function PayrollTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(
    null
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPayslipDialog, setShowPayslipDialog] = useState(false);
  const [payslipHtml, setPayslipHtml] = useState("");

  const queryClient = useQueryClient();
  const { employee } = useAuthStore();

  // Fetch payroll records
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["payrollRecords", monthFilter, statusFilter],
    queryFn: () =>
      payrollApi.getPayrollRecords({
        month: monthFilter === "all" ? undefined : monthFilter,
        status: statusFilter === "all" ? undefined : (statusFilter as PayrollStatus),
      }),
  });

  // Mark as sent mutation
  const markAsSentMutation = useMutation({
    mutationFn: payrollApi.markAsSent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrollRecords"] });
      toast.success("Payroll marked as sent successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to mark as sent");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: payrollApi.deletePayroll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrollRecords"] });
      toast.success("Payroll record deleted successfully");
      setShowDeleteDialog(false);
      setSelectedRecord(null);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to delete payroll record"
      );
    },
  });

  // Filter records based on search term
  const filteredRecords = records.filter(
    (record) =>
      record.employee.fullName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      record.employee.employeeId
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      record.employee.department.deptName
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const handleViewPayslip = async (record: PayrollRecord) => {
    try {
      const response = await payrollApi.getPayslipHtml(record.id);
      setPayslipHtml(response);
      setSelectedRecord(record);
      setShowPayslipDialog(true);
    } catch (error: any) {
      toast.error("Failed to load payslip");
    }
  };

  const handleMarkAsSent = (record: PayrollRecord) => {
    markAsSentMutation.mutate(record.id);
  };

  const handleDelete = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedRecord) {
      deleteMutation.mutate(selectedRecord.id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-100 text-gray-800";
      case "GENERATED":
        return "bg-blue-100 text-blue-800";
      case "SENT":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const canEdit = (record: PayrollRecord) => {
    const userRole = employee?.role.roleName;
    return ["ADMIN", "HR"].includes(userRole || "") && record.status !== "SENT";
  };

  const canDelete = (record: PayrollRecord) => {
    const userRole = employee?.role.roleName;
    return ["ADMIN", "HR"].includes(userRole || "") && record.status !== "SENT";
  };

  const canMarkAsSent = (record: PayrollRecord) => {
    const userRole = employee?.role.roleName;
    return (
      ["ADMIN", "HR"].includes(userRole || "") && record.status === "GENERATED"
    );
  };

  // Generate month options for the current year and last year
  const generateMonthOptions = () => {
    const options = [];
    const currentYear = new Date().getFullYear();

    for (let year = currentYear; year >= currentYear - 1; year--) {
      for (let month = 12; month >= 1; month--) {
        const monthStr = month.toString().padStart(2, "0");
        const value = `${year}-${monthStr}`;
        const label = new Date(year, month - 1).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
        options.push({ value, label });
      }
    }
    return options.slice(0, 24); // Last 2 years
  };

  const monthOptions = generateMonthOptions();

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payroll Records
              </CardTitle>
              <CardDescription>
                View and manage employee payroll records
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
                  placeholder="Search by name, ID, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="GENERATED">Generated</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Records Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-gray-600">Loading payroll records...</p>
              </div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No payroll records found.</p>
              {searchTerm && (
                <p className="text-sm mt-2">
                  Try adjusting your search or filters.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Basic Salary</TableHead>
                    <TableHead>Total Earnings</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {record.employee.fullName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {record.employee.employeeId} •{" "}
                            {record.employee.department.deptName}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-medium">
                          {new Date(record.month + "-01").toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-medium">
                          ₹{record.basicSalary.toLocaleString()}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-medium text-green-600">
                          ₹{record.totalEarnings.toLocaleString()}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-medium text-red-600">
                          ₹{record.totalDeductions.toLocaleString()}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-bold text-blue-600">
                          ₹{record.netPay.toLocaleString()}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge className={getStatusColor(record.status)}>
                          {record.status}
                        </Badge>
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
                              onClick={() => handleViewPayslip(record)}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              View Payslip
                            </DropdownMenuItem>

                            {canMarkAsSent(record) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleMarkAsSent(record)}
                                  className="text-green-600"
                                >
                                  <Send className="mr-2 h-4 w-4" />
                                  Mark as Sent
                                </DropdownMenuItem>
                              </>
                            )}

                            {canDelete(record) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(record)}
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
              Showing {filteredRecords.length} of {records.length} records
            </div>
            <div className="flex gap-4">
              <span>
                Draft: {records.filter((r) => r.status === "DRAFT").length}
              </span>
              <span>
                Generated:{" "}
                {records.filter((r) => r.status === "GENERATED").length}
              </span>
              <span>
                Sent: {records.filter((r) => r.status === "SENT").length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payslip Viewer Dialog */}
      <Dialog open={showPayslipDialog} onOpenChange={setShowPayslipDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Payslip - {selectedRecord?.employee.fullName}
            </DialogTitle>
            <DialogDescription>
              {selectedRecord &&
                new Date(selectedRecord.month + "-01").toLocaleDateString(
                  "en-US",
                  {
                    month: "long",
                    year: "numeric",
                  }
                )}
            </DialogDescription>
          </DialogHeader>

          <div
            className="payslip-content"
            dangerouslySetInnerHTML={{ __html: payslipHtml }}
          />

          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowPayslipDialog(false)}
            >
              Close
            </Button>
            <Button onClick={() => window.print()}>
              <FileText className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payroll Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the payroll record for{" "}
              <strong>{selectedRecord?.employee.fullName}</strong>? This action
              cannot be undone.
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
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}