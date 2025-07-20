import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.role.findMany({
      select: {
        id: true,
        roleName: true,
        roleLevel: true,
        description: true,
      },
      orderBy: {
        roleLevel: 'asc',
      },
    });
  }
}