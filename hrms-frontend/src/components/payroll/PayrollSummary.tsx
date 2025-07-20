import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { YearlyStats, YearlyStatsData } from "../../types";
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
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  DollarSign,
  Users,
  TrendingUp,
  Download,
  Calendar,
  Building,
  Loader2,
} from "lucide-react";
import { payrollApi } from "../../lib/payrollApi";
import { employeeApi } from "../../lib/employeeApi";
import { useAuthStore } from "../../stores/authStore";
import type { Department } from "../../types";

export function PayrollSummary() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`
  );
  const [selectedYear, setSelectedYear] = useState(
    currentDate.getFullYear().toString()
  );
  const [departments, setDepartments] = useState<Department[]>([]);

  const { employee } = useAuthStore();

  // Fetch payroll summary for selected month
  const { data: monthlySummary, isLoading: summaryLoading } = useQuery({
    queryKey: ["payrollSummary", selectedMonth],
    queryFn: () => payrollApi.getPayrollSummary(selectedMonth),
  });

  // Fetch yearly stats
  const { data: yearlyStats, isLoading: statsLoading } = useQuery<YearlyStats>({
    queryKey: ["payrollStats", selectedYear],
    queryFn: () => payrollApi.getMonthlyStats(selectedYear),
  });

  // Fetch departments
  useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const data = await employeeApi.getDepartments();
      setDepartments(data);
      return data;
    },
  });

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => {
    const year = currentDate.getFullYear() - 2 + i;
    return { value: year.toString(), label: year.toString() };
  });

  // Prepare chart data
  const departmentChartData = monthlySummary?.departmentBreakdown
    ? Object.entries(monthlySummary.departmentBreakdown).map(
        ([name, data]) => ({
          name,
          netPay: data.totalNetPay,
          count: data.count,
        })
      )
    : [];

  const statusChartData = monthlySummary?.statusBreakdown
    ? [
        {
          name: "Draft",
          value: monthlySummary.statusBreakdown.draft,
          color: "#6b7280",
        },
        {
          name: "Generated",
          value: monthlySummary.statusBreakdown.generated,
          color: "#3b82f6",
        },
        {
          name: "Sent",
          value: monthlySummary.statusBreakdown.sent,
          color: "#10b981",
        },
      ]
    : [];

  const monthlyTrendData = yearlyStats
    ? Object.entries(yearlyStats).map(([month, data]) => ({
        month: new Date(month + "-01").toLocaleDateString("en-US", {
          month: "short",
        }),
        totalNetPay: data.totalNetPay,
        totalRecords: data.totalRecords,
      }))
    : [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (summaryLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Loading payroll summary...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Payroll Summary & Analytics
              </CardTitle>
              <CardDescription>
                View payroll statistics and departmental breakdowns
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem
                    key={month.value}
                    value={`${selectedYear}-${month.value.padStart(2, "0")}`}
                  >
                    {month.label} {selectedYear}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year.value} value={year.value}>
                    {year.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Records
                </p>
                <p className="text-2xl font-bold">
                  {monthlySummary?.totalRecords || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Earnings
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(monthlySummary?.totalEarnings || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Deductions
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(monthlySummary?.totalDeductions || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Net Payout</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(monthlySummary?.totalNetPay || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Breakdown Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Department-wise Payroll</CardTitle>
            <CardDescription>
              Net pay distribution across departments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {departmentChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(value as number)}
                  />
                  <Bar dataKey="netPay" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Payroll Status</CardTitle>
            <CardDescription>
              Distribution of payroll records by status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statusChartData.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex justify-center space-x-4">
                  {statusChartData.map((entry) => (
                    <div
                      key={entry.name}
                      className="flex items-center space-x-2"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm">
                        {entry.name}: {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-gray-500">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Payroll Trend</CardTitle>
          <CardDescription>Payroll statistics over the year</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis
                  tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Bar dataKey="totalNetPay" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              No trend data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Department Details */}
      <Card>
        <CardHeader>
          <CardTitle>Department Breakdown</CardTitle>
          <CardDescription>
            Detailed payroll information by department
          </CardDescription>
        </CardHeader>
        <CardContent>
          {monthlySummary?.departmentBreakdown ? (
            <div className="space-y-4">
              {Object.entries(monthlySummary.departmentBreakdown).map(
                ([deptName, data]) => (
                  <div key={deptName} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        {deptName}
                      </h3>
                      <Badge variant="secondary">{data.count} employees</Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Earnings:</span>
                        <div className="font-medium text-green-600">
                          {formatCurrency(data.totalEarnings)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Deductions:</span>
                        <div className="font-medium text-red-600">
                          {formatCurrency(data.totalDeductions)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Net Pay:</span>
                        <div className="font-medium text-blue-600">
                          {formatCurrency(data.totalNetPay)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No department data available for the selected month
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
