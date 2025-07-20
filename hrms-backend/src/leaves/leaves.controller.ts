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
import { LeavesService } from './leaves.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { LeaveQueryDto } from './dto/leave-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('leaves')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Post()
  create(@Body() createLeaveDto: CreateLeaveDto, @Request() req) {
    return this.leavesService.create(createLeaveDto, req.user.id);
  }

  @Get()
  findAll(@Query() queryDto: LeaveQueryDto, @Request() req) {
    return this.leavesService.findAll(queryDto, req.user.id, req.user.role.roleName);
  }

  @Get('balance')
  getLeaveBalance(@Request() req, @Query('year') year?: string) {
    return this.leavesService.getLeaveBalance(req.user.id, year ? parseInt(year) : undefined);
  }

  @Get('balance/:employeeId')
  @Roles('ADMIN', 'HR', 'DEPARTMENT_HEAD')
  getEmployeeLeaveBalance(@Param('employeeId') employeeId: string, @Query('year') year?: string) {
    return this.leavesService.getLeaveBalance(employeeId, year ? parseInt(year) : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.leavesService.findOne(id, req.user.id, req.user.role.roleName);
  }

  @Patch(':id/approve')
  @Roles('ADMIN', 'HR', 'DEPARTMENT_HEAD', 'TEAM_LEAD')
  approve(@Param('id') id: string, @Body() approveLeaveDto: ApproveLeaveDto, @Request() req) {
    return this.leavesService.approve(id, approveLeaveDto, req.user.id, req.user.role.roleName);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLeaveDto: UpdateLeaveDto, @Request() req) {
    return this.leavesService.update(id, updateLeaveDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.leavesService.remove(id, req.user.id);
  }
}