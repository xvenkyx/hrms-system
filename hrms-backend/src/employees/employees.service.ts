import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async create(createEmployeeDto: CreateEmployeeDto, creatorId: string) {
    // Check if email or employeeId already exists
    const existingEmployee = await this.prisma.employee.findFirst({
      where: {
        OR: [
          { email: createEmployeeDto.email },
          { employeeId: createEmployeeDto.employeeId },
        ],
      },
    });

    if (existingEmployee) {
      throw new ConflictException(
        'Employee with this email or employee ID already exists',
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createEmployeeDto.password, 10);

    // Extract salary data
    const { salaryDetail, ...employeeData } = createEmployeeDto;
    console.log('Salary Details')
    const basic = salaryDetail?.basicSalary || 0;
    console.log('Basic : ', basic);
    const hra = Math.round(basic * 0.3);
    const fuelAllowance = Math.round(basic * 0.1286);
    const pf = 3600;
    const pt = 200;
    const effectiveFromRaw =
      salaryDetail?.effectiveFrom || createEmployeeDto.dateOfJoining;

    if (!effectiveFromRaw) {
      throw new BadRequestException(
        'effectiveFrom or dateOfJoining must be provided.',
      );
    }

    const effectiveFrom = new Date(effectiveFromRaw);

    // Create employee
    const employee = await this.prisma.employee.create({
      data: {
        fullName: employeeData.fullName,
        email: employeeData.email,
        employeeId: employeeData.employeeId,
        password: hashedPassword,
        dateOfJoining: new Date(createEmployeeDto.dateOfJoining),
        departmentId: employeeData.departmentId,
        roleId: employeeData.roleId,
        phone: employeeData.phone,
        address: employeeData.address,
      },
      include: {
        role: true,
        department: true,
        manager: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
          },
        },
      },
    });

    // Create salary detail
    await this.prisma.salaryDetail.create({
      data: {
        employeeId: employee.id,
        basicSalary: basic,
        hra,
        fuelAllowance,
        otherAllowances: 0,
        pfDeduction: pf,
        ptDeduction: pt,
        otherDeductions: 0,
        effectiveFrom,
        createdBy: creatorId,
      },
    });

    // Create leave balance
    const currentYear = new Date().getFullYear();
    await this.prisma.leaveBalance.create({
      data: {
        employeeId: employee.id,
        year: currentYear,
        casualLeaves: 12,
        sickLeaves: 12,
        annualLeaves: 21,
        usedCasual: 0,
        usedSick: 0,
        usedAnnual: 0,
      },
    });

    // Remove password from response
    const { password, ...result } = employee;
    return result;
  }

  private async getCurrentUserDepartment(userId: string): Promise<string> {
    const currentUser = await this.prisma.employee.findUnique({
      where: { id: userId },
      select: { departmentId: true },
    });

    if (!currentUser) {
      throw new NotFoundException('Current user not found');
    }

    return currentUser.departmentId;
  }

  async findAll(currentUserId: string, currentUserRole: string) {
    // Role-based filtering
    let whereClause = {};

    if (currentUserRole === 'DEPARTMENT_HEAD') {
      const departmentId = await this.getCurrentUserDepartment(currentUserId);
      whereClause = { departmentId };
    } else if (currentUserRole === 'TEAM_LEAD') {
      whereClause = { managerId: currentUserId };
    }
    // ADMIN and HR can see all employees

    const employees = await this.prisma.employee.findMany({
      where: whereClause,
      include: {
        role: {
          select: {
            id: true,
            roleName: true,
            roleLevel: true,
          },
        },
        department: {
          select: {
            id: true,
            deptName: true,
          },
        },
        manager: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform the response to remove password and format data
    return employees.map((employee) => {
      const { password, ...employeeData } = employee;
      return {
        id: employeeData.id,
        employeeId: employeeData.employeeId,
        email: employeeData.email,
        fullName: employeeData.fullName,
        phone: employeeData.phone,
        address: employeeData.address,
        dateOfJoining: employeeData.dateOfJoining,
        isActive: employeeData.isActive,
        role: employeeData.role,
        department: employeeData.department,
        manager: employeeData.manager,
        createdAt: employeeData.createdAt,
        updatedAt: employeeData.updatedAt,
      };
    });
  }

  async findOne(id: string, currentUserId: string, currentUserRole: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        role: true,
        department: true,
        manager: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
          },
        },
        salaryDetails: {
          where: { effectiveTo: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check permissions
    if (currentUserRole === 'DEPARTMENT_HEAD') {
      const departmentId = await this.getCurrentUserDepartment(currentUserId);

      if (employee.department.id !== departmentId) {
        throw new ForbiddenException(
          'You can only view employees from your department',
        );
      }
    } else if (currentUserRole === 'TEAM_LEAD') {
      if (
        employee.manager?.id !== currentUserId &&
        employee.id !== currentUserId
      ) {
        throw new ForbiddenException(
          'You can only view your subordinates or your own profile',
        );
      }
    } else if (currentUserRole === 'TECHNICAL_EXPERT') {
      if (employee.id !== currentUserId) {
        throw new ForbiddenException('You can only view your own profile');
      }
    }

    // Remove password and return formatted response
    const { password, ...employeeData } = employee;
    return {
      id: employeeData.id,
      employeeId: employeeData.employeeId,
      email: employeeData.email,
      fullName: employeeData.fullName,
      phone: employeeData.phone,
      address: employeeData.address,
      dateOfJoining: employeeData.dateOfJoining,
      isActive: employeeData.isActive,
      role: employeeData.role,
      department: employeeData.department,
      manager: employeeData.manager,
      salaryDetails: employeeData.salaryDetails,
      createdAt: employeeData.createdAt,
      updatedAt: employeeData.updatedAt,
    };
  }

  async update(
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
    currentUserId: string,
    currentUserRole: string,
  ) {
    // Check if employee exists
    const existingEmployee = await this.findOne(
      id,
      currentUserId,
      currentUserRole,
    );

    // Check for email/employeeId conflicts
    if (updateEmployeeDto.email || updateEmployeeDto.employeeId) {
      const conflictEmployee = await this.prisma.employee.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                updateEmployeeDto.email
                  ? { email: updateEmployeeDto.email }
                  : {},
                updateEmployeeDto.employeeId
                  ? { employeeId: updateEmployeeDto.employeeId }
                  : {},
              ].filter((condition) => Object.keys(condition).length > 0),
            },
          ],
        },
      });

      if (conflictEmployee) {
        throw new ConflictException(
          'Employee with this email or employee ID already exists',
        );
      }
    }

    const updateData: any = { ...updateEmployeeDto };
    if (updateEmployeeDto.dateOfJoining) {
      updateData.dateOfJoining = new Date(updateEmployeeDto.dateOfJoining);
    }

    const updatedEmployee = await this.prisma.employee.update({
      where: { id },
      data: updateData,
      include: {
        role: true,
        department: true,
        manager: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
          },
        },
      },
    });

    // Remove password and return formatted response
    const { password, ...employeeData } = updatedEmployee;
    return {
      id: employeeData.id,
      employeeId: employeeData.employeeId,
      email: employeeData.email,
      fullName: employeeData.fullName,
      phone: employeeData.phone,
      address: employeeData.address,
      dateOfJoining: employeeData.dateOfJoining,
      isActive: employeeData.isActive,
      role: employeeData.role,
      department: employeeData.department,
      manager: employeeData.manager,
      createdAt: employeeData.createdAt,
      updatedAt: employeeData.updatedAt,
    };
  }

  async remove(id: string, currentUserId: string) {
    // Check if employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: { id: true, fullName: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Prevent self-deletion
    if (id === currentUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    // Soft delete - just deactivate the employee
    const deactivatedEmployee = await this.prisma.employee.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        isActive: true,
      },
    });

    return deactivatedEmployee;
  }

  async getManagersByDepartment(departmentId: string) {
    const managers = await this.prisma.employee.findMany({
      where: {
        departmentId,
        isActive: true,
        role: {
          roleName: {
            in: ['DEPARTMENT_HEAD', 'TEAM_LEAD', 'HR', 'ADMIN'],
          },
        },
      },
      select: {
        id: true,
        fullName: true,
        employeeId: true,
        role: {
          select: {
            roleName: true,
          },
        },
      },
      orderBy: {
        fullName: 'asc',
      },
    });

    return managers;
  }
}
