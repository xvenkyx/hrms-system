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
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @Roles('ADMIN', 'HR')
  create(@Body() createEmployeeDto: CreateEmployeeDto, @Request() req) {
    console.log(req.body)
    return this.employeesService.create(createEmployeeDto, req.user.id);
  }

  @Get()
  @Roles('ADMIN', 'HR', 'DEPARTMENT_HEAD', 'TEAM_LEAD')
  findAll(@Request() req) {
    return this.employeesService.findAll(req.user.id, req.user.role.roleName);
  }

  @Get('managers/:departmentId')
  @Roles('ADMIN', 'HR')
  getManagersByDepartment(@Param('departmentId') departmentId: string) {
    return this.employeesService.getManagersByDepartment(departmentId);
  }

  @Get(':id')
  @Roles('ADMIN', 'HR', 'DEPARTMENT_HEAD', 'TEAM_LEAD', 'TECHNICAL_EXPERT')
  findOne(@Param('id') id: string, @Request() req) {
    return this.employeesService.findOne(id, req.user.id, req.user.role.roleName);
  }

  @Patch(':id')
  @Roles('ADMIN', 'HR', 'DEPARTMENT_HEAD')
  update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @Request() req,
  ) {
    return this.employeesService.update(id, updateEmployeeDto, req.user.id, req.user.role.roleName);
  }

  @Delete(':id')
  @Roles('ADMIN', 'HR')
  remove(@Param('id') id: string, @Request() req) {
    return this.employeesService.remove(id, req.user.id);
  }
}