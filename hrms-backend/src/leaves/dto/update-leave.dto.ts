import { IsString, IsDateString, IsEnum, IsOptional, Length } from 'class-validator';
import { LeaveType } from '@prisma/client';

export class UpdateLeaveDto {
  @IsOptional()
  @IsEnum(LeaveType, { message: 'Invalid leave type' })
  leaveType?: LeaveType;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid start date format' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid end date format' })
  endDate?: string;

  @IsOptional()
  @IsString()
  @Length(10, 500, { message: 'Reason must be between 10 and 500 characters' })
  reason?: string;
}