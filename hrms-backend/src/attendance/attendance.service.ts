import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { AttendanceStatus } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async checkIn(employeeId: string, checkInDto: CheckInDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingAttendance = await this.prisma.attendanceRecord.findFirst({
      where: {
        employeeId,
        date: today,
      },
    });

    if (existingAttendance && existingAttendance.checkInTime) {
      throw new BadRequestException('Already checked in today');
    }

    const now = new Date();

    // Get employee's department attendance settings
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: {
          include: {
            attendanceSettings: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const attendanceSettings = employee.department.attendanceSettings[0];
    let status: AttendanceStatus = AttendanceStatus.ON_TIME;

    if (attendanceSettings) {
      const expectedCheckIn = new Date(attendanceSettings.checkInTime);
      const gracePeriod = attendanceSettings.gracePeriodMins;

      // Set today's date for comparison
      const todayExpectedCheckIn = new Date(today);
      todayExpectedCheckIn.setHours(
        expectedCheckIn.getHours(),
        expectedCheckIn.getMinutes(),
        0,
        0,
      );

      // Add grace period
      const graceTime = new Date(
        todayExpectedCheckIn.getTime() + gracePeriod * 60000,
      );

      if (now > graceTime) {
        status = AttendanceStatus.LATE;
      }
    }

    // Create or update attendance record
    const attendanceRecord = await this.prisma.attendanceRecord.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
      update: {
        checkInTime: now,
        status,
        notes: checkInDto.notes,
      },
      create: {
        employeeId,
        date: today,
        checkInTime: now,
        status,
        notes: checkInDto.notes,
      },
      include: {
        employee: {
          select: {
            fullName: true,
            employeeId: true,
          },
        },
      },
    });

    return attendanceRecord;
  }

  async checkOut(employeeId: string, checkOutDto: CheckOutDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's attendance record
    const attendanceRecord = await this.prisma.attendanceRecord.findFirst({
      where: {
        employeeId,
        date: today,
      },
      include: {
        employee: {
          include: {
            department: {
              include: {
                attendanceSettings: true,
              },
            },
          },
        },
      },
    });

    if (!attendanceRecord) {
      throw new BadRequestException('No check-in record found for today');
    }

    if (attendanceRecord.checkOutTime) {
      throw new BadRequestException('Already checked out today');
    }

    const now = new Date();
    const checkInTime = attendanceRecord.checkInTime;

    // Calculate work hours
    let workHours = 0;
    let status = attendanceRecord.status;

    if (checkInTime) {
      workHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60); // Convert to hours

      // Check if early checkout
      const attendanceSettings =
        attendanceRecord.employee.department.attendanceSettings[0];
      if (attendanceSettings) {
        const expectedCheckOut = new Date(attendanceSettings.checkOutTime);
        const todayExpectedCheckOut = new Date(today);
        todayExpectedCheckOut.setHours(
          expectedCheckOut.getHours(),
          expectedCheckOut.getMinutes(),
          0,
          0,
        );

        if (
          now < todayExpectedCheckOut &&
          workHours < attendanceSettings.standardWorkHours.toNumber()
        ) {
          status = AttendanceStatus.EARLY_OUT;
        }
      }
    }

    // Update attendance record
    const updatedRecord = await this.prisma.attendanceRecord.update({
      where: { id: attendanceRecord.id },
      data: {
        checkOutTime: now,
        workHours,
        status,
        notes: checkOutDto.notes || attendanceRecord.notes,
      },
      include: {
        employee: {
          select: {
            fullName: true,
            employeeId: true,
          },
        },
      },
    });

    return updatedRecord;
  }

  async getTodayAttendance(employeeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendanceRecord = await this.prisma.attendanceRecord.findFirst({
      where: {
        employeeId,
        date: today,
      },
      include: {
        employee: {
          select: {
            fullName: true,
            employeeId: true,
            department: {
              include: {
                attendanceSettings: true,
              },
            },
          },
        },
      },
    });

    return attendanceRecord;
  }

  async getAttendanceRecords(
    queryDto: AttendanceQueryDto,
    currentUserId: string,
    currentUserRole: string,
  ) {
    const { startDate, endDate, employeeId, departmentId } = queryDto;

    // Build where clause based on permissions
    let whereClause: any = {};

    if (currentUserRole === 'TECHNICAL_EXPERT') {
      // Can only see own records
      whereClause.employeeId = currentUserId;
    } else if (currentUserRole === 'TEAM_LEAD') {
      // Can see subordinates' records
      whereClause.OR = [
        { employeeId: currentUserId },
        { employee: { managerId: currentUserId } },
      ];
    } else if (currentUserRole === 'DEPARTMENT_HEAD') {
      // Can see department records
      const currentUser = await this.prisma.employee.findUnique({
        where: { id: currentUserId },
        select: { departmentId: true },
      });

      if (!currentUser) {
        throw new NotFoundException('Current user not found');
      }

      whereClause.employee = { departmentId: currentUser.departmentId };
    }
    // ADMIN and HR can see all records

    // Apply additional filters
    if (
      employeeId &&
      ['ADMIN', 'HR', 'DEPARTMENT_HEAD'].includes(currentUserRole)
    ) {
      whereClause.employeeId = employeeId;
    }

    if (departmentId && ['ADMIN', 'HR'].includes(currentUserRole)) {
      whereClause.employee = { departmentId };
    }

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate);
      if (endDate) whereClause.date.lte = new Date(endDate);
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            department: {
              select: {
                deptName: true,
              },
            },
          },
        },
      },
      orderBy: [{ date: 'desc' }, { employee: { fullName: 'asc' } }],
    });

    return records;
  }

  async getMonthlyReport(
    month: string,
    year: string,
    currentUserId: string,
    currentUserRole: string,
  ) {
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

    // Apply role-based filtering
    let whereClause: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (currentUserRole === 'TECHNICAL_EXPERT') {
      whereClause.employeeId = currentUserId;
    } else if (currentUserRole === 'TEAM_LEAD') {
      whereClause.OR = [
        { employeeId: currentUserId },
        { employee: { managerId: currentUserId } },
      ];
    } else if (currentUserRole === 'DEPARTMENT_HEAD') {
      const currentUser = await this.prisma.employee.findUnique({
        where: { id: currentUserId },
        select: { departmentId: true },
      });

      if (!currentUser) {
        throw new NotFoundException('Current user not found');
      }

      whereClause.employee = { departmentId: currentUser.departmentId };
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            department: {
              select: {
                deptName: true,
              },
            },
          },
        },
      },
      orderBy: [{ employee: { fullName: 'asc' } }, { date: 'asc' }],
    });

    // Group by employee and calculate statistics
    const employeeStats = records.reduce((acc, record) => {
      const empId = record.employee.id;
      if (!acc[empId]) {
        acc[empId] = {
          employee: record.employee,
          totalDays: 0,
          presentDays: 0,
          lateDays: 0,
          earlyOutDays: 0,
          totalWorkHours: 0,
          records: [],
        };
      }

      acc[empId].records.push(record);
      acc[empId].totalDays++;

      if (record.checkInTime) {
        acc[empId].presentDays++;
      }

      if (record.status === AttendanceStatus.LATE) {
        acc[empId].lateDays++;
      }

      if (record.status === AttendanceStatus.EARLY_OUT) {
        acc[empId].earlyOutDays++;
      }

      if (record.workHours) {
        acc[empId].totalWorkHours += record.workHours.toNumber();
      }

      return acc;
    }, {});

    return Object.values(employeeStats);
  }

  async create(createAttendanceDto: CreateAttendanceDto) {
    return this.prisma.attendanceRecord.create({
      data: {
        employeeId: createAttendanceDto.employeeId,
        date: new Date(createAttendanceDto.date),
        status: AttendanceStatus.ON_TIME, // Default status
        notes: createAttendanceDto.notes,
      },
      include: {
        employee: {
          select: {
            fullName: true,
            employeeId: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.attendanceRecord.findMany({
      include: {
        employee: {
          select: {
            fullName: true,
            employeeId: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            fullName: true,
            employeeId: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }

    return record;
  }

  async update(id: string, updateAttendanceDto: UpdateAttendanceDto) {
    return this.prisma.attendanceRecord.update({
      where: { id },
      data: updateAttendanceDto,
    });
  }

  async remove(id: string) {
    return this.prisma.attendanceRecord.delete({
      where: { id },
    });
  }
}
