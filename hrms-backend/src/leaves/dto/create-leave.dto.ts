import { IsString, IsDateString, IsEnum, Length } from 'class-validator';
import { LeaveType } from '@prisma/client';

export class CreateLeaveDto {
  @IsEnum(LeaveType, { message: 'Invalid leave type' })
  leaveType: LeaveType;

  @IsDateString({}, { message: 'Invalid start date format' })
  startDate: string;

  @IsDateString({}, { message: 'Invalid end date format' })
  endDate: string;

  @IsString()
  @Length(10, 500, { message: 'Reason must be between 10 and 500 characters' })
  reason: string;
}