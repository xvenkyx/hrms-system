import { IsArray, IsUUID, IsEnum } from 'class-validator';
import { PayrollStatus } from '@prisma/client';

export class BulkActionDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  payrollIds: string[];

  @IsEnum(PayrollStatus)
  action: PayrollStatus;
}