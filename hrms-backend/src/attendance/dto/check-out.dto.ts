import { IsOptional, IsString } from 'class-validator';

export class CheckOutDto {
  @IsOptional()
  @IsString()
  notes?: string;
}