import { useState } from 'react';
import { EmployeeForm } from '../../components/forms/EmployeeForm';
import { EmployeeTable } from '../../components/tables/EmployeeTable';
import type { Employee } from '../../types';

export function EmployeesTest() {
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>();

  const handleAdd = () => {
    setEditingEmployee(undefined);
    setShowForm(true);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingEmployee(undefined);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingEmployee(undefined);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {showForm ? (
        <EmployeeForm
          employee={editingEmployee}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      ) : (
        <EmployeeTable
          onEdit={handleEdit}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
}