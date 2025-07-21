import { useEffect, useState } from "react";
import { Input } from "../ui/input";
import { employeeApi } from "../../lib/employeeApi";
import { Card } from "../ui/card";
import type { SalaryDetail } from "../../types";

export function SalaryDetailsTab() {
  const [search, setSearch] = useState("");
  const [data, setData] = useState<SalaryDetail[]>([]);
  const [filtered, setFiltered] = useState<SalaryDetail[]>([]);

  useEffect(() => {
    async function fetchSalaryDetails() {
      const res = await employeeApi.getSalaryDetails(); // implement this in API
      setData(res);
      setFiltered(res);
    }

    fetchSalaryDetails();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      data.filter(
        (emp) =>
          emp.employee.fullName.toLowerCase().includes(q) ||
          emp.employee.employeeId.toLowerCase().includes(q)
      )
    );
  }, [search, data]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Input
          placeholder="Search by name or employee ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-1/3"
        />
      </div>

      <Card className="overflow-auto">
        <table className="w-full table-auto text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Employee ID</th>
              <th className="p-2">Base Pay</th>
              <th className="p-2">HRA</th>
              <th className="p-2">Other Allowances</th>
              <th className="p-2">Effective From</th>
              <th className="p-2">Department</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2">{row.employee.fullName}</td>
                <td className="p-2">{row.employee.employeeId}</td>
                <td className="p-2">{row.basicSalary}</td>
                <td className="p-2">{row.hra}</td>
                <td className="p-2">{row.otherAllowances}</td>
                <td className="p-2">{new Date(row.effectiveFrom).toLocaleDateString()}</td>
                <td className="p-2">{row.employee.department?.deptName || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
