import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.payrollRecord.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.salaryDetail.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.attendanceSettings.deleteMany(); // ← must come before department
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.role.deleteMany();

  console.log('🌱 Starting database seed...');

  // Create Roles
  console.log('Creating roles...');

  const adminRole = await prisma.role.create({
    data: {
      roleName: 'ADMIN',
      roleLevel: 1,
      permissions: {
        canManageEmployees: true,
        canManagePayroll: true,
        canApproveLeaves: true,
        canManageTasks: true,
        canViewAllData: true,
      },
      description: 'System Administrator with full access',
    },
  });

  const hrRole = await prisma.role.create({
    data: {
      roleName: 'HR',
      roleLevel: 2,
      permissions: {
        canManageEmployees: true,
        canManagePayroll: true,
        canApproveLeaves: true,
        canManageTasks: false,
        canViewAllData: true,
      },
      description: 'Human Resources with employee and payroll management',
    },
  });

  const deptHeadRole = await prisma.role.create({
    data: {
      roleName: 'DEPARTMENT_HEAD',
      roleLevel: 3,
      permissions: {
        canManageEmployees: false,
        canManagePayroll: false,
        canApproveLeaves: true,
        canManageTasks: true,
        canViewAllData: false,
      },
      description: 'Department Head with team management capabilities',
    },
  });

  const teamLeadRole = await prisma.role.create({
    data: {
      roleName: 'TEAM_LEAD',
      roleLevel: 4,
      permissions: {
        canManageEmployees: false,
        canManagePayroll: false,
        canApproveLeaves: true,
        canManageTasks: true,
        canViewAllData: false,
      },
      description: 'Team Lead with task assignment capabilities',
    },
  });

  const techExpertRole = await prisma.role.create({
    data: {
      roleName: 'TECHNICAL_EXPERT',
      roleLevel: 5,
      permissions: {
        canManageEmployees: false,
        canManagePayroll: false,
        canApproveLeaves: false,
        canManageTasks: false,
        canViewAllData: false,
      },
      description: 'Technical Expert with task execution capabilities',
    },
  });

  console.log('✅ Roles created');

  // Create Departments
  console.log('Creating departments...');

  const techDept = await prisma.department.create({
    data: {
      deptName: 'TECHNICAL',
      description: 'Software Development and Technical Operations',
    },
  });

  const hrDept = await prisma.department.create({
    data: {
      deptName: 'HR',
      description: 'Human Resources and Employee Management',
    },
  });

  const salesDept = await prisma.department.create({
    data: {
      deptName: 'SALES',
      description: 'Sales and Business Development',
    },
  });

  const marketingDept = await prisma.department.create({
    data: {
      deptName: 'MARKETING',
      description: 'Marketing and Brand Management',
    },
  });

  console.log('✅ Departments created');

  // Create default employees
  console.log('Creating default employees...');

  const hashedPassword = await bcrypt.hash('admin123', 10);

  const adminUser = await prisma.employee.create({
    data: {
      employeeId: 'ADMIN001',
      email: 'admin@company.com',
      password: hashedPassword,
      fullName: 'System Administrator',
      phone: '+1234567890',
      dateOfJoining: new Date('2024-01-01'),
      roleId: adminRole.id,
      departmentId: hrDept.id,
    },
  });

  const hrUser = await prisma.employee.create({
    data: {
      employeeId: 'HR001',
      email: 'hr@company.com',
      password: hashedPassword,
      fullName: 'HR Manager',
      phone: '+1234567891',
      dateOfJoining: new Date('2024-01-15'),
      roleId: hrRole.id,
      departmentId: hrDept.id,
    },
  });

  const techHead = await prisma.employee.create({
    data: {
      employeeId: 'TECH001',
      email: 'techhead@company.com',
      password: hashedPassword,
      fullName: 'Technical Head',
      phone: '+1234567892',
      dateOfJoining: new Date('2024-01-10'),
      roleId: deptHeadRole.id,
      departmentId: techDept.id,
    },
  });

  console.log('✅ Default employees created');

  // Add salary details
  console.log('Adding salary details for default employees...');

  await prisma.salaryDetail.createMany({
    data: [
      {
        employeeId: adminUser.id,
        basicSalary: new Prisma.Decimal(70000),
        hra: new Prisma.Decimal(15000),
        fuelAllowance: new Prisma.Decimal(3000),
        otherAllowances: new Prisma.Decimal(2000),
        pfDeduction: new Prisma.Decimal(1800),
        ptDeduction: new Prisma.Decimal(200),
        otherDeductions: new Prisma.Decimal(500),
        bankName: 'HDFC Bank',
        accountNumber: '1234567890',
        ifscCode: 'HDFC0001234',
        uanNumber: '100200300400',
        panNumber: 'ABCDE1234F',
        effectiveFrom: new Date('2024-01-01'),
        createdBy: 'seed-script',
      },
      {
        employeeId: hrUser.id,
        basicSalary: new Prisma.Decimal(60000),
        hra: new Prisma.Decimal(12000),
        fuelAllowance: new Prisma.Decimal(2500),
        otherAllowances: new Prisma.Decimal(1500),
        pfDeduction: new Prisma.Decimal(1600),
        ptDeduction: new Prisma.Decimal(200),
        otherDeductions: new Prisma.Decimal(400),
        bankName: 'ICICI Bank',
        accountNumber: '9876543210',
        ifscCode: 'ICIC0005678',
        uanNumber: '200300400500',
        panNumber: 'XYZAB1234C',
        effectiveFrom: new Date('2024-01-15'),
        createdBy: 'seed-script',
      },
      {
        employeeId: techHead.id,
        basicSalary: new Prisma.Decimal(80000),
        hra: new Prisma.Decimal(16000),
        fuelAllowance: new Prisma.Decimal(4000),
        otherAllowances: new Prisma.Decimal(2500),
        pfDeduction: new Prisma.Decimal(2000),
        ptDeduction: new Prisma.Decimal(250),
        otherDeductions: new Prisma.Decimal(600),
        bankName: 'SBI',
        accountNumber: '111222333444',
        ifscCode: 'SBIN0001111',
        uanNumber: '300400500600',
        panNumber: 'LMNOP1234D',
        effectiveFrom: new Date('2024-01-10'),
        createdBy: 'seed-script',
      },
    ],
  });

  console.log('✅ Salary details added');

  // Update department heads
  console.log('Setting department heads...');

  await prisma.department.update({
    where: { id: techDept.id },
    data: { deptHeadId: techHead.id },
  });

  await prisma.department.update({
    where: { id: hrDept.id },
    data: { deptHeadId: hrUser.id },
  });

  console.log('✅ Department heads assigned');

  // Create Attendance Settings
  console.log('Creating attendance settings...');

  await prisma.attendanceSettings.create({
    data: {
      departmentId: techDept.id,
      standardWorkHours: 8.0,
      checkInTime: new Date('1970-01-01T09:00:00Z'),
      checkOutTime: new Date('1970-01-01T17:00:00Z'),
      gracePeriodMins: 15,
    },
  });

  await prisma.attendanceSettings.create({
    data: {
      departmentId: hrDept.id,
      standardWorkHours: 8.0,
      checkInTime: new Date('1970-01-01T09:00:00Z'),
      checkOutTime: new Date('1970-01-01T17:00:00Z'),
      gracePeriodMins: 10,
    },
  });

  console.log('✅ Attendance settings created');

  // Create initial leave balances
  console.log('Creating leave balances...');

  const currentYear = new Date().getFullYear();

  for (const employee of [adminUser, hrUser, techHead]) {
    await prisma.leaveBalance.create({
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
  }

  console.log('✅ Leave balances created');

  console.log('\\n🎉 Seed completed successfully!');
  console.log('\\n📋 Login Credentials:');
  console.log('🔐 Admin: admin@company.com / admin123');
  console.log('👥 HR Manager: hr@company.com / admin123');
  console.log('💻 Tech Head: techhead@company.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
