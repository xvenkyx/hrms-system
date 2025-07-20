import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { LeaveQueryDto } from './dto/leave-query.dto';
import { LeaveStatus, LeaveType } from '@prisma/client';

@Injectable()
export class LeavesService {
  constructor(private prisma: PrismaService) {}

  async create(createLeaveDto: CreateLeaveDto, employeeId: string) {
    const { startDate, endDate, leaveType, reason } = createLeaveDto;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      throw new BadRequestException('Leave start date cannot be in the past');
    }

    if (end < start) {
      throw new BadRequestException(
        'Leave end date cannot be before start date',
      );
    }

    // Calculate total days
    const timeDiff = end.getTime() - start.getTime();
    const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    // Check for overlapping leave requests
    const overlappingLeave = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        OR: [
          {
            AND: [{ startDate: { lte: start } }, { endDate: { gte: start } }],
          },
          {
            AND: [{ startDate: { lte: end } }, { endDate: { gte: end } }],
          },
          {
            AND: [{ startDate: { gte: start } }, { endDate: { lte: end } }],
          },
        ],
      },
    });

    if (overlappingLeave) {
      throw new BadRequestException(
        'You already have a leave request for this period',
      );
    }

    // Check leave balance
    const currentYear = new Date().getFullYear();
    let leaveBalance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_year: {
          employeeId,
          year: currentYear,
        },
      },
    });

    if (!leaveBalance) {
      // Create leave balance for current year if it doesn't exist
      leaveBalance = await this.prisma.leaveBalance.create({
        data: {
          employeeId,
          year: currentYear,
          casualLeaves: 12,
          sickLeaves: 12,
          annualLeaves: 21,
          usedCasual: 0,
          usedSick: 0,
          usedAnnual: 0,
        },
      });
    }

    // Check if sufficient balance exists
    const getAvailableLeaves = (type: LeaveType): number => {
      switch (type) {
        case LeaveType.CASUAL:
          return leaveBalance.casualLeaves - leaveBalance.usedCasual;
        case LeaveType.SICK:
          return leaveBalance.sickLeaves - leaveBalance.usedSick;
        case LeaveType.ANNUAL:
          return leaveBalance.annualLeaves - leaveBalance.usedAnnual;
        case LeaveType.MATERNITY:
        case LeaveType.PATERNITY:
        case LeaveType.OTHER:
        default:
          return 999; // Unlimited balance for these types
      }
    };

    const availableLeaves = getAvailableLeaves(leaveType);

    // Only check balance for types that have balance limits
    const shouldCheckBalance = (type: LeaveType): boolean => {
      return (
        type === LeaveType.CASUAL ||
        type === LeaveType.SICK ||
        type === LeaveType.ANNUAL
      );
    };

    if (shouldCheckBalance(leaveType) && availableLeaves < totalDays) {
      throw new BadRequestException(
        `Insufficient leave balance. Available: ${availableLeaves} days, Requested: ${totalDays} days`,
      );
    }

    // Create leave request
    const leaveRequest = await this.prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveType,
        startDate: start,
        endDate: end,
        totalDays,
        reason,
        status: LeaveStatus.PENDING,
      },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            email: true,
            department: {
              select: {
                deptName: true,
              },
            },
          },
        },
      },
    });

    return leaveRequest;
  }

  async findAll(
    queryDto: LeaveQueryDto,
    currentUserId: string,
    currentUserRole: string,
  ) {
    const { status, leaveType, startDate, endDate, employeeId, departmentId } =
      queryDto;

    let whereClause: any = {};

    // Apply role-based filtering
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
    // ADMIN and HR can see all requests

    // Apply filters
    if (status) whereClause.status = status;
    if (leaveType) whereClause.leaveType = leaveType;
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
      whereClause.startDate = {};
      if (startDate) whereClause.startDate.gte = new Date(startDate);
      if (endDate) whereClause.startDate.lte = new Date(endDate);
    }

    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            email: true,
            department: {
              select: {
                deptName: true,
              },
            },
          },
        },
        approver: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
          },
        },
      },
      orderBy: [{ appliedAt: 'desc' }],
    });

    return leaveRequests;
  }

  async findOne(id: string, currentUserId: string, currentUserRole: string) {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            email: true,
            departmentId: true,
            department: {
              select: {
                deptName: true,
              },
            },
          },
        },
        approver: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
          },
        },
      },
    });

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    // Check permissions
    if (
      currentUserRole === 'TECHNICAL_EXPERT' &&
      leaveRequest.employeeId !== currentUserId
    ) {
      throw new ForbiddenException('You can only view your own leave requests');
    }

    if (currentUserRole === 'TEAM_LEAD') {
      const isSubordinate = await this.prisma.employee.findFirst({
        where: {
          id: leaveRequest.employeeId,
          managerId: currentUserId,
        },
      });

      if (leaveRequest.employeeId !== currentUserId && !isSubordinate) {
        throw new ForbiddenException(
          "You can only view your own or your subordinates' leave requests",
        );
      }
    }

    if (currentUserRole === 'DEPARTMENT_HEAD') {
      const currentUser = await this.prisma.employee.findUnique({
        where: { id: currentUserId },
        select: { departmentId: true },
      });

      if (!currentUser) {
        throw new NotFoundException('Current user not found');
      }

      if (leaveRequest.employee.departmentId !== currentUser.departmentId) {
        throw new ForbiddenException(
          'You can only view leave requests from your department',
        );
      }
    }

    return leaveRequest;
  }

  async approve(
    id: string,
    approveLeaveDto: ApproveLeaveDto,
    approverId: string,
    approverRole: string,
  ) {
    const { status, approvalNotes } = approveLeaveDto;

    // Check if approver has permission
    if (
      !['ADMIN', 'HR', 'DEPARTMENT_HEAD', 'TEAM_LEAD'].includes(approverRole)
    ) {
      throw new ForbiddenException(
        'You do not have permission to approve leave requests',
      );
    }

    const leaveRequest = await this.findOne(id, approverId, approverRole);

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        'Only pending leave requests can be approved or rejected',
      );
    }

    // Update leave request
    const updatedLeaveRequest = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        approvedBy: approverId,
        approvalDate: new Date(),
        approvalNotes,
      },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
          },
        },
      },
    });

    // Update leave balance if approved
    if (status === LeaveStatus.APPROVED) {
      await this.updateLeaveBalance(
        leaveRequest.employeeId,
        leaveRequest.leaveType,
        leaveRequest.totalDays,
      );
    }

    // TODO: Send email notification
    // await this.sendLeaveNotification(updatedLeaveRequest);

    return updatedLeaveRequest;
  }

  private async updateLeaveBalance(
    employeeId: string,
    leaveType: LeaveType,
    days: number,
  ) {
    const currentYear = new Date().getFullYear();

    let updateData: any = {};

    // Only update balance for leave types that have balance tracking
    switch (leaveType) {
      case LeaveType.CASUAL:
        updateData.usedCasual = { increment: days };
        break;
      case LeaveType.SICK:
        updateData.usedSick = { increment: days };
        break;
      case LeaveType.ANNUAL:
        updateData.usedAnnual = { increment: days };
        break;
      case LeaveType.MATERNITY:
      case LeaveType.PATERNITY:
      case LeaveType.OTHER:
      default:
        // These types don't affect tracked balances, so no update needed
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.leaveBalance.update({
        where: {
          employeeId_year: {
            employeeId,
            year: currentYear,
          },
        },
        data: updateData,
      });
    }
  }

  async getLeaveBalance(employeeId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();

    let leaveBalance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_year: {
          employeeId,
          year: targetYear,
        },
      },
    });

    if (!leaveBalance) {
      // Create leave balance for the year if it doesn't exist
      leaveBalance = await this.prisma.leaveBalance.create({
        data: {
          employeeId,
          year: targetYear,
          casualLeaves: 12,
          sickLeaves: 12,
          annualLeaves: 21,
          usedCasual: 0,
          usedSick: 0,
          usedAnnual: 0,
        },
      });
    }

    return {
      ...leaveBalance,
      casualRemaining: leaveBalance.casualLeaves - leaveBalance.usedCasual,
      sickRemaining: leaveBalance.sickLeaves - leaveBalance.usedSick,
      annualRemaining: leaveBalance.annualLeaves - leaveBalance.usedAnnual,
    };
  }

  async update(
    id: string,
    updateLeaveDto: UpdateLeaveDto,
    currentUserId: string,
  ) {
    // Check if leave request exists and user has permission
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (leaveRequest.employeeId !== currentUserId) {
      throw new ForbiddenException(
        'You can only update your own leave requests',
      );
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        'Only pending leave requests can be updated',
      );
    }

    // If dates are being updated, recalculate total days
    let updateData: any = { ...updateLeaveDto };

    if (updateLeaveDto.startDate || updateLeaveDto.endDate) {
      const startDate = new Date(
        updateLeaveDto.startDate || leaveRequest.startDate,
      );
      const endDate = new Date(updateLeaveDto.endDate || leaveRequest.endDate);

      // Validate dates
      if (startDate < new Date()) {
        throw new BadRequestException('Leave start date cannot be in the past');
      }

      if (endDate < startDate) {
        throw new BadRequestException(
          'Leave end date cannot be before start date',
        );
      }

      // Calculate new total days
      const timeDiff = endDate.getTime() - startDate.getTime();
      const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

      updateData.totalDays = totalDays;
      updateData.startDate = startDate;
      updateData.endDate = endDate;
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: string, currentUserId: string) {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (leaveRequest.employeeId !== currentUserId) {
      throw new ForbiddenException(
        'You can only delete your own leave requests',
      );
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        'Only pending leave requests can be deleted',
      );
    }

    return this.prisma.leaveRequest.delete({
      where: { id },
    });
  }
}
