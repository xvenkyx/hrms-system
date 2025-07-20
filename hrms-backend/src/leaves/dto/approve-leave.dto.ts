import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LeaveStatus } from '@prisma/client';

export class ApproveLeaveDto {
  @IsEnum(LeaveStatus, { message: 'Invalid leave status' })
  status: LeaveStatus;

  @IsOptional()
  @IsString()
  approvalNotes?: string;
}