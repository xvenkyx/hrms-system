import { IsString, IsArray, IsOptional, IsUUID } from 'class-validator';

export class GeneratePayrollDto {
  @IsString()
  month: string; // Format: "2024-05"

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  employeeIds?: string[]; // If not provided, generate for all active employees

  @IsOptional()
  @IsString()
  departmentId?: string;
}