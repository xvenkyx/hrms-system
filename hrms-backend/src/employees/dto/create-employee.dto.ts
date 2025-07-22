import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SalaryDetailInput {
  @IsNumber()
  basicSalary: number;

  @IsOptional()
  @IsString()
  effectiveFrom?: string;
}

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string; // ✅ Add this

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  roleId: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsOptional()
  phone?: string;

  @IsOptional()
  address?: string;

  @ValidateNested()
  @Type(() => SalaryDetailInput)
  salaryDetail: SalaryDetailInput;

  @IsString()
  @IsNotEmpty()
  dateOfJoining: string;

  @IsString()
  createdBy: string; // whoever is creating the employee (e.g., admin)
}
