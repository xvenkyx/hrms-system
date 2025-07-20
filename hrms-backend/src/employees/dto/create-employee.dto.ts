import { IsEmail, IsString, IsOptional, IsDateString, IsUUID, MinLength } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @MinLength(3)
  employeeId: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  fullName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsDateString()
  dateOfJoining: string;

  @IsUUID()
  roleId: string;

  @IsUUID()
  departmentId: string;

  @IsOptional()
  @IsUUID()
  managerId?: string;
}