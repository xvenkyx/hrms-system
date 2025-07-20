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
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  checkIn(@Body() checkInDto: CheckInDto, @Request() req) {
    return this.attendanceService.checkIn(req.user.id, checkInDto);
  }

  @Post('check-out')
  checkOut(@Body() checkOutDto: CheckOutDto, @Request() req) {
    return this.attendanceService.checkOut(req.user.id, checkOutDto);
  }

  @Get('today')
  getTodayAttendance(@Request() req) {
    return this.attendanceService.getTodayAttendance(req.user.id);
  }

  @Get('records')
  @Roles('ADMIN', 'HR', 'DEPARTMENT_HEAD', 'TEAM_LEAD', 'TECHNICAL_EXPERT')
  getAttendanceRecords(@Query() queryDto: AttendanceQueryDto, @Request() req) {
    return this.attendanceService.getAttendanceRecords(
      queryDto,
      req.user.id,
      req.user.role.roleName,
    );
  }

  @Get('report/:month/:year')
  @Roles('ADMIN', 'HR', 'DEPARTMENT_HEAD', 'TEAM_LEAD')
  getMonthlyReport(
    @Param('month') month: string,
    @Param('year') year: string,
    @Request() req,
  ) {
    return this.attendanceService.getMonthlyReport(
      month,
      year,
      req.user.id,
      req.user.role.roleName,
    );
  }

  @Post()
  @Roles('ADMIN', 'HR')
  create(@Body() createAttendanceDto: CreateAttendanceDto) {
    return this.attendanceService.create(createAttendanceDto);
  }

  @Get()
  @Roles('ADMIN', 'HR')
  findAll() {
    return this.attendanceService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'HR', 'DEPARTMENT_HEAD', 'TEAM_LEAD')
  findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'HR')
  update(@Param('id') id: string, @Body() updateAttendanceDto: UpdateAttendanceDto) {
    return this.attendanceService.update(id, updateAttendanceDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'HR')
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(id);
  }
}