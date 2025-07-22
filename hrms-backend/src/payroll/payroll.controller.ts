import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { PayrollService } from './payroll.service';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';
import { PayrollQueryDto } from './dto/payroll-query.dto';
import { GeneratePayrollDto } from './dto/generate-payroll.dto';
import { BulkActionDto } from './dto/bulk-action.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('generate')
  @Roles('ADMIN', 'HR')
  generatePayroll(
    @Body() generatePayrollDto: GeneratePayrollDto,
    @Request() req,
  ) {
    return this.payrollService.generatePayrollForMonth(
      generatePayrollDto,
      req.user.id,
    );
  }

  @Get('summary/:month')
  @Roles('ADMIN', 'HR', 'DEPARTMENT_HEAD')
  getPayrollSummary(
    @Param('month') month: string,
    @Query('departmentId') departmentId?: string,
    @Request() req?,
  ) {
    // If user is department head, filter by their department
    if (req.user.role.roleName === 'DEPARTMENT_HEAD') {
      departmentId = req.user.department.id;
    }
    return this.payrollService.getPayrollSummary(month, departmentId);
  }

  @Get('stats/:year')
  @Roles('ADMIN', 'HR', 'DEPARTMENT_HEAD')
  getMonthlyStats(
    @Param('year') year: string,
    @Query('departmentId') departmentId?: string,
    @Request() req?,
  ) {
    if (req.user.role.roleName === 'DEPARTMENT_HEAD') {
      departmentId = req.user.department.id;
    }
    return this.payrollService.getMonthlyPayrollStats(year, departmentId);
  }

  @Post('bulk-action')
  @Roles('ADMIN', 'HR')
  bulkAction(@Body() bulkActionDto: BulkActionDto) {
    return this.payrollService.bulkAction(bulkActionDto);
  }

  @Get()
  findAll(@Query() queryDto: PayrollQueryDto, @Request() req) {
    return this.payrollService.findAll(
      queryDto,
      req.user.id,
      req.user.role.roleName,
    );
  }

  @Post()
  @Roles('ADMIN', 'HR')
  create(@Body() createPayrollDto: CreatePayrollDto) {
    return this.payrollService.create(createPayrollDto);
  }

  @Get(':id/payslip')
  async generatePayslip(
    @Param('id') id: string,
    @Request() req,
    @Res() res: Response,
    @Query('format') format: string = 'html',
  ) {
    const payslipData = await this.payrollService.generatePayslip(
      id,
      req.user.id,
      req.user.role.roleName,
    );

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      res.send(payslipData.payslipHtml);
    } else {
      // For JSON format, return the data
      res.json(payslipData);
    }
  }

  @Patch(':id')
  @Roles('ADMIN', 'HR')
  update(@Param('id') id: string, @Body() updatePayrollDto: UpdatePayrollDto) {
    return this.payrollService.update(id, updatePayrollDto);
  }

  @Patch(':id/send')
  @Roles('ADMIN', 'HR')
  markAsSent(@Param('id') id: string) {
    return this.payrollService.markAsSent(id);
  }

  @Delete(':id')
  @Roles('ADMIN', 'HR')
  remove(@Param('id') id: string) {
    return this.payrollService.remove(id);
  }

  @Get('salary-details')
  @Roles('HR') // ✅ restrict this route to HR role only
  async getSalaryDetails() {
    console.log('Hit');
    return this.payrollService.getAllSalaryDetails();
  }
  
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.payrollService.findOne(id, req.user.id, req.user.role.roleName);
  }
}
