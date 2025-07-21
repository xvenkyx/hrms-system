import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Button } from "../../components/ui/button";
import { Plus, Calculator } from "lucide-react";
import { PayrollTable } from "../../components/payroll/PayrollTable";
import { PayrollSummary } from "../../components/payroll/PayrollSummary";
import { GeneratePayrollDialog } from "../../components/payroll/GeneratePayrollDialog";
import { SalaryDetailsTab } from "../../components/payroll/SalaryDetailsTab";
import { useAuthStore } from "../../stores/authStore";

export function PayrollPage() {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("records");
  const { employee } = useAuthStore();

  const canGeneratePayroll = ["ADMIN", "HR"].includes(
    employee?.role.roleName || ""
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Payroll Management
          </h1>
          <p className="mt-2 text-gray-600">
            Manage employee payroll, generate payslips, and view summaries
          </p>
        </div>

        {canGeneratePayroll && (
          <Button onClick={() => setShowGenerateDialog(true)}>
            <Calculator className="mr-2 h-4 w-4" />
            Generate Payroll
          </Button>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="records">Payroll Records</TabsTrigger>
          <TabsTrigger value="summary">Summary & Analytics</TabsTrigger>
          <TabsTrigger value="reports">Monthly Reports</TabsTrigger>
          <TabsTrigger value="salary">Salary Details</TabsTrigger>
        </TabsList>

        <TabsContent value="records">
          <PayrollTable />
        </TabsContent>

        <TabsContent value="summary">
          <PayrollSummary />
        </TabsContent>

        <TabsContent value="salary">
          <SalaryDetailsTab />
        </TabsContent>

        <TabsContent value="reports">
          <div className="text-center py-12 text-gray-500">
            <p>Monthly reports feature coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>

      <GeneratePayrollDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
      />
    </div>
  );
}
