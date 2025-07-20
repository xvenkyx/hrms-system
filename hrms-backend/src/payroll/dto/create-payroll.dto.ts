import { IsString, IsNumber, IsOptional, IsDecimal, IsUUID, Min, IsInt } from 'class-validator';

export class CreatePayrollDto {
  @IsUUID()
  employeeId: string;

  @IsString()
  month: string; // Format: "2024-05"

  // Earnings
  @IsDecimal()
  @Min(0)
  basicSalary: number;

  @IsOptional()
  @IsDecimal()
  @Min(0)
  hra?: number;

  @IsOptional()
  @IsDecimal()
  @Min(0)
  fuelAllowance?: number;

  @IsOptional()
  @IsDecimal()
  @Min(0)
  performanceIncentive?: number;

  @IsOptional()
  @IsDecimal()
  @Min(0)
  otherEarnings?: number;

  // Deductions
  @IsOptional()
  @IsDecimal()
  @Min(0)
  pfDeduction?: number;

  @IsOptional()
  @IsDecimal()
  @Min(0)
  ptDeduction?: number;

  @IsOptional()
  @IsDecimal()
  @Min(0)
  otherDeductions?: number;

  // Calculated fields
  @IsDecimal()
  @Min(0)
  totalEarnings: number;

  @IsDecimal()
  @Min(0)
  totalDeductions: number;

  @IsDecimal()
  @Min(0)
  netPay: number;

  // Attendance info
  @IsInt()
  @Min(1)
  totalDays: number;

  @IsInt()
  @Min(0)
  daysPresent: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  arrearDays?: number;

  @IsOptional()
  @IsDecimal()
  @Min(0)
  lwpDays?: number;

  @IsOptional()
  @IsString()
  payslipUrl?: string;
}