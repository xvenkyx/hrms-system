import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PayrollStatus } from '@prisma/client';

export class PayrollQueryDto {
  @IsOptional()
  @IsString()
  month?: string; // 2024-05

  @IsOptional()
  @IsString()
  year?: string; // 2024

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsEnum(PayrollStatus)
  status?: PayrollStatus;
}