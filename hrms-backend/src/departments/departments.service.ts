import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.department.findMany({
      where: { isActive: true },
      select: {
        id: true,
        deptName: true,
        description: true,
      },
      orderBy: {
        deptName: 'asc',
      },
    });
  }
}