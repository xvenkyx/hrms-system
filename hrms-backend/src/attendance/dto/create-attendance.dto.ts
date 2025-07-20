import { IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CreateAttendanceDto {
  @IsUUID()
  employeeId: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  notes?: string;
}