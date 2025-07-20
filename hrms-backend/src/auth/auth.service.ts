import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  employee: {
    id: string;
    employeeId: string;
    email: string;
    fullName: string;
    role: {
      id: string;
      roleName: string;
      roleLevel: number;
      permissions: any;
    };
    department: {
      id: string;
      deptName: string;
    };
  };
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateEmployee(email: string, password: string): Promise<any> {
    const employee = await this.prisma.employee.findUnique({
      where: { email },
      include: {
        role: true,
        department: true,
      },
    });

    if (!employee || !employee.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, employee.password);
    if (!isPasswordValid) {
      return null;
    }

    // Remove password from returned object
    const { password: _, ...result } = employee;
    return result;
  }

  async login(employee: any): Promise<LoginResponse> {
    const payload = { email: employee.email, sub: employee.id };
    
    return {
      access_token: this.jwtService.sign(payload),
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        email: employee.email,
        fullName: employee.fullName,
        role: employee.role,
        department: employee.department,
      },
    };
  }

  async getProfile(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
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

    if (!employee) {
      throw new UnauthorizedException('Employee not found');
    }

    // Return only the fields we want, excluding password
    return {
      id: employee.id,
      employeeId: employee.employeeId,
      email: employee.email,
      fullName: employee.fullName,
      phone: employee.phone,
      address: employee.address,
      dateOfJoining: employee.dateOfJoining,
      role: employee.role,
      department: employee.department,
      manager: employee.manager,
    };
  }
}