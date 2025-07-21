import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';
import { PayrollQueryDto } from './dto/payroll-query.dto';
import { GeneratePayrollDto } from './dto/generate-payroll.dto';
import { BulkActionDto } from './dto/bulk-action.dto';
import { PayrollStatus, AttendanceStatus } from '@prisma/client';

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  async generatePayrollForMonth(
    generatePayrollDto: GeneratePayrollDto,
    generatedBy: string,
  ) {
    const { month, employeeIds, departmentId } = generatePayrollDto;

    // Validate month format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('Month must be in format YYYY-MM');
    }

    // Check if payroll already exists for this month
    const existingPayroll = await this.prisma.payrollRecord.findFirst({
      where: {
        month,
        ...(employeeIds && { employeeId: { in: employeeIds } }),
        ...(departmentId && { employee: { departmentId } }),
      },
    });

    if (existingPayroll) {
      throw new BadRequestException(
        `Payroll already exists for month ${month}`,
      );
    }

    // Build employee filter
    let employeeFilter: any = {
      isActive: true,
    };

    if (employeeIds) {
      employeeFilter.id = { in: employeeIds };
    }

    if (departmentId) {
      employeeFilter.departmentId = departmentId;
    }

    // Get employees with their latest salary details
    const employees = await this.prisma.employee.findMany({
      where: employeeFilter,
      include: {
        salaryDetails: {
          where: {
            effectiveFrom: {
              lte: new Date(`${month}-01`),
            },
            OR: [
              { effectiveTo: null },
              {
                effectiveTo: {
                  gte: new Date(`${month}-01`),
                },
              },
            ],
          },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        },
        department: {
          select: {
            id: true,
            deptName: true,
          },
        },
        role: {
          select: {
            roleName: true,
          },
        },
      },
    });

    const payrollRecords: any[] = [];
    const errors: string[] = [];

    for (const employee of employees) {
      try {
        const salaryDetail = employee.salaryDetails[0];

        if (!salaryDetail) {
          errors.push(
            `No salary details found for employee ${employee.employeeId}`,
          );
          continue;
        }

        // Calculate attendance for the month
        const attendanceStats = await this.calculateMonthlyAttendance(
          employee.id,
          month,
        );

        // Calculate payroll components
        const payrollData = this.calculatePayroll(
          salaryDetail,
          attendanceStats,
          employee,
        );

        // Create payroll record
        const payrollRecord = await this.prisma.payrollRecord.create({
          data: {
            employeeId: employee.id,
            month,
            ...payrollData,
            generatedBy,
            generatedAt: new Date(),
            status: PayrollStatus.GENERATED,
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

        payrollRecords.push(payrollRecord);
      } catch (error) {
        errors.push(
          `Error generating payroll for ${employee.employeeId}: ${error.message}`,
        );
      }
    }

    return {
      success: payrollRecords.length,
      errors,
      records: payrollRecords,
    };
  }

  private async calculateMonthlyAttendance(employeeId: string, month: string) {
    const [year, monthNum] = month.split('-');
    const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0);

    const attendanceRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalDays = endDate.getDate();
    const presentDays = attendanceRecords.filter((r) => r.checkInTime).length;
    const absentDays = totalDays - presentDays;
    const lateDays = attendanceRecords.filter(
      (r) => r.status === AttendanceStatus.LATE,
    ).length;
    const totalWorkHours = attendanceRecords.reduce(
      (sum, record) => sum + (record.workHours?.toNumber() || 0),
      0,
    );

    return {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      totalWorkHours,
    };
  }

  private calculatePayroll(
    salaryDetail: any,
    attendanceStats: any,
    employee: any,
  ) {
    // Get salary components
    const basicSalary = salaryDetail.basicSalary?.toNumber() || 0;
    const hra = salaryDetail.hra?.toNumber() || basicSalary * 0.3; // 30% of basic
    const fuelAllowance = salaryDetail.fuelAllowance?.toNumber() || 3000; // Default

    // Calculate performance incentive based on attendance
    const attendancePercentage =
      (attendanceStats.presentDays / attendanceStats.totalDays) * 100;
    let performanceIncentive = 0;

    if (attendancePercentage >= 95) {
      performanceIncentive = 10000; // Excellent attendance
    } else if (attendancePercentage >= 90) {
      performanceIncentive = 5000; // Good attendance
    }

    // Calculate deductions
    const pfDeduction =
      salaryDetail.pfDeduction?.toNumber() || basicSalary * 0.12; // 12% of basic
    const ptDeduction = salaryDetail.ptDeduction?.toNumber() || 200; // Fixed professional tax

    // Calculate absent day deductions
    const workingDaysInMonth = 22; // Standard working days
    const perDaySalary = basicSalary / workingDaysInMonth;
    const absentDeduction = attendanceStats.absentDays * perDaySalary;

    // Calculate totals
    const totalEarnings =
      basicSalary + hra + fuelAllowance + performanceIncentive;
    const totalDeductions = pfDeduction + ptDeduction + absentDeduction;
    const netPay = totalEarnings - totalDeductions;

    return {
      basicSalary,
      hra,
      fuelAllowance,
      performanceIncentive,
      otherEarnings: 0,
      pfDeduction,
      ptDeduction,
      otherDeductions: absentDeduction,
      totalEarnings,
      totalDeductions,
      netPay: Math.max(0, netPay),
      totalDays: attendanceStats.totalDays,
      daysPresent: attendanceStats.presentDays,
      arrearDays: 0,
      lwpDays: attendanceStats.absentDays,
    };
  }

  async findAll(
    queryDto: PayrollQueryDto,
    currentUserId: string,
    currentUserRole: string,
  ) {
    const { month, year, employeeId, departmentId, status } = queryDto;

    // Build where clause based on permissions
    let whereClause: any = {};

    if (currentUserRole === 'TECHNICAL_EXPERT') {
      // Can only see own payroll
      whereClause.employeeId = currentUserId;
    } else if (currentUserRole === 'TEAM_LEAD') {
      // Can see subordinates' payroll
      whereClause.OR = [
        { employeeId: currentUserId },
        { employee: { managerId: currentUserId } },
      ];
    } else if (currentUserRole === 'DEPARTMENT_HEAD') {
      // Can see department payroll
      const currentUser = await this.prisma.employee.findUnique({
        where: { id: currentUserId },
        select: { departmentId: true },
      });

      if (!currentUser) {
        throw new NotFoundException('Current user not found');
      }

      whereClause.employee = { departmentId: currentUser.departmentId };
    }
    // ADMIN and HR can see all payroll records

    // Apply additional filters
    if (month) {
      whereClause.month = month;
    } else if (year) {
      whereClause.month = {
        startsWith: year,
      };
    }

    if (
      employeeId &&
      ['ADMIN', 'HR', 'DEPARTMENT_HEAD'].includes(currentUserRole)
    ) {
      whereClause.employeeId = employeeId;
    }

    if (departmentId && ['ADMIN', 'HR'].includes(currentUserRole)) {
      whereClause.employee = { departmentId };
    }

    if (status) {
      whereClause.status = status;
    }

    const payrollRecords = await this.prisma.payrollRecord.findMany({
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
      },
      orderBy: [{ month: 'desc' }, { employee: { fullName: 'asc' } }],
    });

    return payrollRecords;
  }

  async findOne(id: string, currentUserId: string, currentUserRole: string) {
    const payrollRecord = await this.prisma.payrollRecord.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            email: true,
            phone: true,
            dateOfJoining: true,
            department: {
              select: {
                deptName: true,
              },
            },
            role: {
              select: {
                roleName: true,
              },
            },
            salaryDetails: {
              where: { effectiveTo: null },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!payrollRecord) {
      throw new NotFoundException('Payroll record not found');
    }

    // Check permissions
    if (currentUserRole === 'TECHNICAL_EXPERT') {
      if (payrollRecord.employeeId !== currentUserId) {
        throw new ForbiddenException('You can only view your own payroll');
      }
    } else if (currentUserRole === 'TEAM_LEAD') {
      const isSubordinate = await this.prisma.employee.findFirst({
        where: {
          id: payrollRecord.employeeId,
          managerId: currentUserId,
        },
      });

      if (payrollRecord.employeeId !== currentUserId && !isSubordinate) {
        throw new ForbiddenException(
          'You can only view your own or your subordinates payroll',
        );
      }
    } else if (currentUserRole === 'DEPARTMENT_HEAD') {
      const currentUser = await this.prisma.employee.findUnique({
        where: { id: currentUserId },
        select: { departmentId: true },
      });

      if (!currentUser) {
        throw new NotFoundException('Current user not found');
      }

      const employeeDept = await this.prisma.employee.findUnique({
        where: { id: payrollRecord.employeeId },
        select: { departmentId: true },
      });

      if (employeeDept?.departmentId !== currentUser.departmentId) {
        throw new ForbiddenException(
          'You can only view payroll from your department',
        );
      }
    }

    return payrollRecord;
  }

  async generatePayslip(
    id: string,
    currentUserId: string,
    currentUserRole: string,
  ) {
    const payrollRecord = await this.findOne(
      id,
      currentUserId,
      currentUserRole,
    );

    // Generate HTML payslip
    const payslipHtml = this.generatePayslipHtml(payrollRecord);

    return {
      payslipHtml,
      payslipUrl: `/api/payroll/${id}/payslip.pdf`, // Placeholder for PDF URL
      payrollRecord,
    };
  }

  private generatePayslipHtml(payrollRecord: any): string {
    const employee = payrollRecord.employee;
    const salaryDetail = employee.salaryDetails?.[0];
    const monthYear = new Date(payrollRecord.month + '-01').toLocaleDateString(
      'en-US',
      {
        month: 'long',
        year: 'numeric',
      },
    );

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payslip - ${employee.fullName}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            font-size: 12px;
            background-color: #f5f5f5;
          }
          .payslip-container {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #000;
            background-color: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .header { 
            text-align: center; 
            padding: 15px; 
            border-bottom: 1px solid #000;
            background-color: #f8f9fa;
          }
          .company-name { 
            font-size: 20px; 
            font-weight: bold; 
            margin-bottom: 5px; 
            color: #333;
          }
          .company-address { 
            font-size: 11px; 
            margin-bottom: 10px; 
            color: #666;
          }
          .payslip-title { 
            font-size: 16px; 
            font-weight: bold; 
            color: #333;
            text-decoration: underline;
          }
          .employee-info { 
            display: flex; 
            padding: 15px;
            border-bottom: 1px solid #000;
            background-color: #fafafa;
          }
          .info-left, .info-right { 
            flex: 1; 
            font-size: 11px;
            line-height: 1.6;
          }
          .info-right {
            text-align: left;
            margin-left: 40px;
          }
          .info-label {
            font-weight: bold;
            color: #333;
            display: inline-block;
            width: 80px;
          }
          .attendance-info {
            display: flex;
            justify-content: space-between;
            padding: 10px 15px;
            border-bottom: 1px solid #000;
            font-size: 11px;
            background-color: #f8f9fa;
          }
          .attendance-item {
            font-weight: bold;
          }
          .earnings-section {
            padding: 15px;
          }
          .earnings-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 10px;
          }
          .earnings-table td { 
            padding: 6px 10px; 
            border-bottom: 1px solid #ddd;
            font-size: 11px;
          }
          .earnings-table .label {
            text-align: left;
            font-weight: 500;
          }
          .earnings-table .amount { 
            text-align: right; 
            width: 120px;
            font-weight: bold;
          }
          .earnings-header {
            background-color: #e9ecef;
            font-weight: bold;
            border-bottom: 2px solid #333 !important;
          }
          .total-row { 
            font-weight: bold; 
            border-top: 2px solid #333;
            border-bottom: 2px solid #333;
            background-color: #f8f9fa;
          }
          .net-pay { 
            font-size: 16px; 
            font-weight: bold; 
            text-align: center; 
            padding: 15px;
            border-bottom: 1px solid #000;
            background-color: #e8f5e8;
            color: #2d5a2d;
          }
          .amount-words {
            padding: 15px;
            font-size: 11px;
            border-bottom: 1px solid #000;
            background-color: #f8f9fa;
          }
          .footer { 
            text-align: center; 
            padding: 15px;
            font-style: italic; 
            font-size: 10px;
            color: #666;
            background-color: #f8f9fa;
          }
          .negative-amount {
            color: #d63384;
          }
          .positive-amount {
            color: #198754;
          }
        </style>
      </head>
      <body>
        <div class="payslip-container">
          <div class="header">
            <div class="company-name">JHEx Consulting LLP</div>
            <div class="company-address">
              FF-Block-A-103, Ganesh Meridian, Opp High Court, SG<br>
              Highway, Ghatlodiya Ahmedabad – (380061)
            </div>
            <div class="payslip-title">Pay slip for the month of ${monthYear}</div>
          </div>

          <div class="employee-info">
            <div class="info-left">
              <div><span class="info-label">EMP Code:</span> ${employee.employeeId}</div>
              <div><span class="info-label">Name:</span> ${employee.fullName}</div>
              <div><span class="info-label">DOJ:</span> ${new Date(employee.dateOfJoining).toLocaleDateString('en-GB')}</div>
              <div><span class="info-label">Bank:</span> ${salaryDetail?.bankName || 'State Bank of India'}</div>
              <div><span class="info-label">Designation:</span> ${employee.role.roleName}</div>
              <div><span class="info-label">UAN No:</span> ${salaryDetail?.uanNumber || 'N/A'}</div>
            </div>
            <div class="info-right">
              <div><span class="info-label">A/C No:</span> ${salaryDetail?.accountNumber || 'N/A'}</div>
              <div><span class="info-label">IFSC Code:</span> ${salaryDetail?.ifscCode || 'N/A'}</div>
              <div><span class="info-label">Department:</span> ${employee.department.deptName}</div>
              <div><span class="info-label">Total Salary:</span> ${payrollRecord.netPay.toLocaleString()}</div>
              <div><span class="info-label">PAN No:</span> ${salaryDetail?.panNumber || 'N/A'}</div>
            </div>
          </div>

          <div class="attendance-info">
            <span class="attendance-item">Total Days: ${payrollRecord.totalDays}</span>
            <span class="attendance-item">Days Present: ${payrollRecord.daysPresent}</span>
            <span class="attendance-item">Arrear Days: ${payrollRecord.arrearDays}</span>
            <span class="attendance-item">LWP/Absent: ${payrollRecord.lwpDays}</span>
          </div>

          <div class="earnings-section">
            <table class="earnings-table">
              <tr class="earnings-header">
                <td class="label">Earning</td>
                <td class="amount">Amount</td>
              </tr>
              <tr>
                <td class="label">Basic</td>
                <td class="amount positive-amount">${payrollRecord.basicSalary.toLocaleString()}</td>
              </tr>
              <tr>
                <td class="label">HRA</td>
                <td class="amount positive-amount">${payrollRecord.hra.toLocaleString()}</td>
              </tr>
              <tr>
                <td class="label">Fuel Allowance</td>
                <td class="amount positive-amount">${payrollRecord.fuelAllowance.toLocaleString()}</td>
              </tr>
              <tr>
                <td class="label">PF</td>
                <td class="amount negative-amount">-${payrollRecord.pfDeduction.toLocaleString()}</td>
              </tr>
              <tr>
                <td class="label">PT</td>
                <td class="amount negative-amount">-${payrollRecord.ptDeduction.toLocaleString()}</td>
              </tr>
              ${
                payrollRecord.performanceIncentive > 0
                  ? `
              <tr>
                <td class="label">Performance Incentive</td>
                <td class="amount positive-amount">${payrollRecord.performanceIncentive.toLocaleString()}</td>
              </tr>
              `
                  : ''
              }
              ${
                payrollRecord.otherDeductions > 0
                  ? `
              <tr>
                <td class="label">Other Deductions</td>
                <td class="amount negative-amount">-${payrollRecord.otherDeductions.toLocaleString()}</td>
              </tr>
              `
                  : ''
              }
              <tr class="total-row">
                <td class="label"><strong>Total Earning</strong></td>
                <td class="amount"><strong>${payrollRecord.totalEarnings.toLocaleString()}</strong></td>
              </tr>
            </table>
          </div>

          <div class="net-pay">
            <strong>Net Pay</strong><br>
            <span style="font-size: 18px;">${payrollRecord.netPay.toLocaleString()}</span>
          </div>

          <div class="amount-words">
            <strong>In words:</strong> ${this.numberToWords(payrollRecord.netPay.toNumber())} ONLY
          </div>

          <div class="footer">
            This is the system generated pay slip, Signature not required
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private numberToWords(amount: number): string {
    if (amount === 0) return 'ZERO';

    const ones = [
      '',
      'ONE',
      'TWO',
      'THREE',
      'FOUR',
      'FIVE',
      'SIX',
      'SEVEN',
      'EIGHT',
      'NINE',
    ];
    const teens = [
      'TEN',
      'ELEVEN',
      'TWELVE',
      'THIRTEEN',
      'FOURTEEN',
      'FIFTEEN',
      'SIXTEEN',
      'SEVENTEEN',
      'EIGHTEEN',
      'NINETEEN',
    ];
    const tens = [
      '',
      '',
      'TWENTY',
      'THIRTY',
      'FORTY',
      'FIFTY',
      'SIXTY',
      'SEVENTY',
      'EIGHTY',
      'NINETY',
    ];

    if (amount >= 10000000) {
      // 1 crore
      const crores = Math.floor(amount / 10000000);
      const remainder = amount % 10000000;
      if (remainder === 0) {
        return `${this.convertHundreds(crores)} CRORE`;
      }
      return `${this.convertHundreds(crores)} CRORE ${this.numberToWords(remainder)}`;
    } else if (amount >= 100000) {
      // 1 lakh
      const lakhs = Math.floor(amount / 100000);
      const remainder = amount % 100000;
      if (remainder === 0) {
        return `${this.convertHundreds(lakhs)} LAKH`;
      }
      return `${this.convertHundreds(lakhs)} LAKH ${this.numberToWords(remainder)}`;
    } else if (amount >= 1000) {
      const thousands = Math.floor(amount / 1000);
      const remainder = amount % 1000;
      if (remainder === 0) {
        return `${this.convertHundreds(thousands)} THOUSAND`;
      }
      return `${this.convertHundreds(thousands)} THOUSAND ${this.numberToWords(remainder)}`;
    } else if (amount >= 100) {
      const hundreds = Math.floor(amount / 100);
      const remainder = amount % 100;
      if (remainder === 0) {
        return `${ones[hundreds]} HUNDRED`;
      }
      return `${ones[hundreds]} HUNDRED ${this.numberToWords(remainder)}`;
    } else if (amount >= 20) {
      const tensDigit = Math.floor(amount / 10);
      const onesDigit = amount % 10;
      return `${tens[tensDigit]}${onesDigit > 0 ? ' ' + ones[onesDigit] : ''}`;
    } else if (amount >= 10) {
      return teens[amount - 10];
    } else {
      return ones[amount];
    }
  }

  private convertHundreds(num: number): string {
    if (num === 0) return '';

    const ones = [
      '',
      'ONE',
      'TWO',
      'THREE',
      'FOUR',
      'FIVE',
      'SIX',
      'SEVEN',
      'EIGHT',
      'NINE',
    ];
    const teens = [
      'TEN',
      'ELEVEN',
      'TWELVE',
      'THIRTEEN',
      'FOURTEEN',
      'FIFTEEN',
      'SIXTEEN',
      'SEVENTEEN',
      'EIGHTEEN',
      'NINETEEN',
    ];
    const tens = [
      '',
      '',
      'TWENTY',
      'THIRTY',
      'FORTY',
      'FIFTY',
      'SIXTY',
      'SEVENTY',
      'EIGHTY',
      'NINETY',
    ];

    let result = '';

    if (num >= 100) {
      result += ones[Math.floor(num / 100)] + ' HUNDRED ';
      num %= 100;
    }

    if (num >= 20) {
      result += tens[Math.floor(num / 10)];
      if (num % 10 > 0) {
        result += ' ' + ones[num % 10];
      }
    } else if (num >= 10) {
      result += teens[num - 10];
    } else if (num > 0) {
      result += ones[num];
    }

    return result.trim();
  }

  async update(id: string, updatePayrollDto: UpdatePayrollDto) {
    const payrollRecord = await this.prisma.payrollRecord.findUnique({
      where: { id },
    });

    if (!payrollRecord) {
      throw new NotFoundException('Payroll record not found');
    }

    if (payrollRecord.status === PayrollStatus.SENT) {
      throw new BadRequestException('Cannot update sent payroll records');
    }

    return this.prisma.payrollRecord.update({
      where: { id },
      data: updatePayrollDto,
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
  }

  async bulkAction(bulkActionDto: BulkActionDto) {
    const { payrollIds, action } = bulkActionDto;

    const updatedRecords = await this.prisma.payrollRecord.updateMany({
      where: {
        id: { in: payrollIds },
        status: { not: PayrollStatus.SENT }, // Don't update already sent records
      },
      data: {
        status: action,
      },
    });

    return {
      updated: updatedRecords.count,
      total: payrollIds.length,
    };
  }

  async markAsSent(id: string) {
    const payrollRecord = await this.prisma.payrollRecord.findUnique({
      where: { id },
    });

    if (!payrollRecord) {
      throw new NotFoundException('Payroll record not found');
    }

    return this.prisma.payrollRecord.update({
      where: { id },
      data: {
        status: PayrollStatus.SENT,
      },
    });
  }

  async remove(id: string) {
    const payrollRecord = await this.prisma.payrollRecord.findUnique({
      where: { id },
    });

    if (!payrollRecord) {
      throw new NotFoundException('Payroll record not found');
    }

    if (payrollRecord.status === PayrollStatus.SENT) {
      throw new BadRequestException('Cannot delete sent payroll records');
    }

    return this.prisma.payrollRecord.delete({
      where: { id },
    });
  }

  async getPayrollSummary(month: string, departmentId?: string) {
    const whereClause: any = { month };

    if (departmentId) {
      whereClause.employee = { departmentId };
    }

    const payrollRecords = await this.prisma.payrollRecord.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            department: {
              select: {
                deptName: true,
              },
            },
          },
        },
      },
    });

    const summary = {
      totalRecords: payrollRecords.length,
      totalBasicSalary: payrollRecords.reduce(
        (sum, record) => sum + record.basicSalary.toNumber(),
        0,
      ),
      totalEarnings: payrollRecords.reduce(
        (sum, record) => sum + record.totalEarnings.toNumber(),
        0,
      ),
      totalDeductions: payrollRecords.reduce(
        (sum, record) => sum + record.totalDeductions.toNumber(),
        0,
      ),
      totalNetPay: payrollRecords.reduce(
        (sum, record) => sum + record.netPay.toNumber(),
        0,
      ),
      statusBreakdown: {
        draft: payrollRecords.filter((r) => r.status === PayrollStatus.DRAFT)
          .length,
        generated: payrollRecords.filter(
          (r) => r.status === PayrollStatus.GENERATED,
        ).length,
        sent: payrollRecords.filter((r) => r.status === PayrollStatus.SENT)
          .length,
      },
      departmentBreakdown: this.getDepartmentBreakdown(payrollRecords),
    };

    return summary;
  }

  private getDepartmentBreakdown(payrollRecords: any[]) {
    const breakdown = {};

    payrollRecords.forEach((record) => {
      const deptName = record.employee.department.deptName;
      if (!breakdown[deptName]) {
        breakdown[deptName] = {
          count: 0,
          totalNetPay: 0,
          totalEarnings: 0,
          totalDeductions: 0,
        };
      }
      breakdown[deptName].count++;
      breakdown[deptName].totalNetPay += record.netPay.toNumber();
      breakdown[deptName].totalEarnings += record.totalEarnings.toNumber();
      breakdown[deptName].totalDeductions += record.totalDeductions.toNumber();
    });

    return breakdown;
  }

  async getMonthlyPayrollStats(year: string, departmentId?: string) {
    const whereClause: any = {
      month: {
        startsWith: year,
      },
    };

    if (departmentId) {
      whereClause.employee = { departmentId };
    }

    const payrollRecords = await this.prisma.payrollRecord.findMany({
      where: whereClause,
      select: {
        month: true,
        netPay: true,
        totalEarnings: true,
        totalDeductions: true,
        status: true,
        employee: {
          select: {
            department: {
              select: {
                deptName: true,
              },
            },
          },
        },
      },
    });

    // Group by month
    const monthlyStats = {};
    payrollRecords.forEach((record) => {
      const month = record.month;
      if (!monthlyStats[month]) {
        monthlyStats[month] = {
          totalRecords: 0,
          totalNetPay: 0,
          totalEarnings: 0,
          totalDeductions: 0,
          statusCounts: {
            draft: 0,
            generated: 0,
            sent: 0,
          },
        };
      }
      monthlyStats[month].totalRecords++;
      monthlyStats[month].totalNetPay += record.netPay.toNumber();
      monthlyStats[month].totalEarnings += record.totalEarnings.toNumber();
      monthlyStats[month].totalDeductions += record.totalDeductions.toNumber();
      monthlyStats[month].statusCounts[record.status.toLowerCase()]++;
    });

    return monthlyStats;
  }

  async create(createPayrollDto: CreatePayrollDto) {
    // Check if payroll already exists for employee and month
    const existingPayroll = await this.prisma.payrollRecord.findFirst({
      where: {
        employeeId: createPayrollDto.employeeId,
        month: createPayrollDto.month,
      },
    });

    if (existingPayroll) {
      throw new BadRequestException(
        'Payroll already exists for this employee and month',
      );
    }

    return this.prisma.payrollRecord.create({
      data: createPayrollDto,
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
  }

  async getEmployeePayrollHistory(
    employeeId: string,
    currentUserId: string,
    currentUserRole: string,
  ) {
    // Check permissions
    if (
      currentUserRole === 'TECHNICAL_EXPERT' &&
      employeeId !== currentUserId
    ) {
      throw new ForbiddenException(
        'You can only view your own payroll history',
      );
    }

    if (currentUserRole === 'TEAM_LEAD') {
      const isSubordinate = await this.prisma.employee.findFirst({
        where: {
          id: employeeId,
          managerId: currentUserId,
        },
      });

      if (employeeId !== currentUserId && !isSubordinate) {
        throw new ForbiddenException(
          'You can only view your own or your subordinates payroll history',
        );
      }
    }

    if (currentUserRole === 'DEPARTMENT_HEAD') {
      const currentUser = await this.prisma.employee.findUnique({
        where: { id: currentUserId },
        select: { departmentId: true },
      });

      const targetEmployee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: { departmentId: true },
      });

      if (currentUser?.departmentId !== targetEmployee?.departmentId) {
        throw new ForbiddenException(
          'You can only view payroll history from your department',
        );
      }
    }

    const payrollHistory = await this.prisma.payrollRecord.findMany({
      where: { employeeId },
      include: {
        employee: {
          select: {
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
      orderBy: { month: 'desc' },
    });

    // Calculate summary statistics
    const totalRecords = payrollHistory.length;
    const totalEarnings = payrollHistory.reduce(
      (sum, record) => sum + record.totalEarnings.toNumber(),
      0,
    );
    const totalDeductions = payrollHistory.reduce(
      (sum, record) => sum + record.totalDeductions.toNumber(),
      0,
    );
    const totalNetPay = payrollHistory.reduce(
      (sum, record) => sum + record.netPay.toNumber(),
      0,
    );
    const averageNetPay = totalRecords > 0 ? totalNetPay / totalRecords : 0;

    return {
      records: payrollHistory,
      summary: {
        totalRecords,
        totalEarnings,
        totalDeductions,
        totalNetPay,
        averageNetPay,
        highestPay:
          totalRecords > 0
            ? Math.max(...payrollHistory.map((r) => r.netPay.toNumber()))
            : 0,
        lowestPay:
          totalRecords > 0
            ? Math.min(...payrollHistory.map((r) => r.netPay.toNumber()))
            : 0,
      },
    };
  }

  async regeneratePayroll(id: string, generatedBy: string) {
    const payrollRecord = await this.prisma.payrollRecord.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            salaryDetails: {
              where: { effectiveTo: null },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            department: true,
            role: true,
          },
        },
      },
    });

    if (!payrollRecord) {
      throw new NotFoundException('Payroll record not found');
    }

    if (payrollRecord.status === PayrollStatus.SENT) {
      throw new BadRequestException('Cannot regenerate sent payroll records');
    }

    const salaryDetail = payrollRecord.employee.salaryDetails[0];
    if (!salaryDetail) {
      throw new BadRequestException('No salary details found for employee');
    }

    // Recalculate attendance and payroll
    const attendanceStats = await this.calculateMonthlyAttendance(
      payrollRecord.employeeId,
      payrollRecord.month,
    );

    const payrollData = this.calculatePayroll(
      salaryDetail,
      attendanceStats,
      payrollRecord.employee,
    );

    // Update the payroll record
    return this.prisma.payrollRecord.update({
      where: { id },
      data: {
        ...payrollData,
        generatedBy,
        generatedAt: new Date(),
        status: PayrollStatus.GENERATED,
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
  }

  async getPayrollAnalytics(year: string, departmentId?: string) {
    const whereClause: any = {
      month: {
        startsWith: year,
      },
    };

    if (departmentId) {
      whereClause.employee = { departmentId };
    }

    const payrollRecords = await this.prisma.payrollRecord.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            department: {
              select: {
                deptName: true,
              },
            },
            role: {
              select: {
                roleName: true,
              },
            },
          },
        },
      },
    });

    // Department-wise analytics
    const departmentAnalytics = {};
    const roleAnalytics = {};

    payrollRecords.forEach((record) => {
      const deptName = record.employee.department.deptName;
      const roleName = record.employee.role.roleName;

      // Department analytics
      if (!departmentAnalytics[deptName]) {
        departmentAnalytics[deptName] = {
          count: 0,
          totalPay: 0,
          averagePay: 0,
          highestPay: 0,
          lowestPay: Number.MAX_VALUE,
        };
      }

      const netPay = record.netPay.toNumber();
      departmentAnalytics[deptName].count++;
      departmentAnalytics[deptName].totalPay += netPay;
      departmentAnalytics[deptName].highestPay = Math.max(
        departmentAnalytics[deptName].highestPay,
        netPay,
      );
      departmentAnalytics[deptName].lowestPay = Math.min(
        departmentAnalytics[deptName].lowestPay,
        netPay,
      );

      // Role analytics
      if (!roleAnalytics[roleName]) {
        roleAnalytics[roleName] = {
          count: 0,
          totalPay: 0,
          averagePay: 0,
          highestPay: 0,
          lowestPay: Number.MAX_VALUE,
        };
      }

      roleAnalytics[roleName].count++;
      roleAnalytics[roleName].totalPay += netPay;
      roleAnalytics[roleName].highestPay = Math.max(
        roleAnalytics[roleName].highestPay,
        netPay,
      );
      roleAnalytics[roleName].lowestPay = Math.min(
        roleAnalytics[roleName].lowestPay,
        netPay,
      );
    });

    // Calculate averages
    Object.keys(departmentAnalytics).forEach((dept) => {
      departmentAnalytics[dept].averagePay =
        departmentAnalytics[dept].totalPay / departmentAnalytics[dept].count;
    });

    Object.keys(roleAnalytics).forEach((role) => {
      roleAnalytics[role].averagePay =
        roleAnalytics[role].totalPay / roleAnalytics[role].count;
    });

    return {
      departmentAnalytics,
      roleAnalytics,
      overallStats: {
        totalRecords: payrollRecords.length,
        totalPayout: payrollRecords.reduce(
          (sum, r) => sum + r.netPay.toNumber(),
          0,
        ),
        averagePayout:
          payrollRecords.length > 0
            ? payrollRecords.reduce((sum, r) => sum + r.netPay.toNumber(), 0) /
              payrollRecords.length
            : 0,
        highestPayout:
          payrollRecords.length > 0
            ? Math.max(...payrollRecords.map((r) => r.netPay.toNumber()))
            : 0,
        lowestPayout:
          payrollRecords.length > 0
            ? Math.min(...payrollRecords.map((r) => r.netPay.toNumber()))
            : 0,
      },
    };
  }

  async validatePayrollData(month: string, departmentId?: string) {
    const whereClause: any = { month };

    if (departmentId) {
      whereClause.employee = { departmentId };
    }

    const payrollRecords = await this.prisma.payrollRecord.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            fullName: true,
            employeeId: true,
          },
        },
      },
    });

    const validationErrors: any[] = [];
    const warnings:any[] = [];

    payrollRecords.forEach((record) => {
      // Check for negative net pay
      if (record.netPay.toNumber() < 0) {
        validationErrors.push({
          employeeId: record.employee.employeeId,
          employeeName: record.employee.fullName,
          error: 'Negative net pay',
          value: record.netPay.toNumber(),
        });
      }

      // Check for zero net pay
      if (record.netPay.toNumber() === 0) {
        warnings.push({
          employeeId: record.employee.employeeId,
          employeeName: record.employee.fullName,
          warning: 'Zero net pay',
          value: record.netPay.toNumber(),
        });
      }

      // Check if deductions exceed earnings
      if (record.totalDeductions.toNumber() > record.totalEarnings.toNumber()) {
        validationErrors.push({
          employeeId: record.employee.employeeId,
          employeeName: record.employee.fullName,
          error: 'Deductions exceed earnings',
          earnings: record.totalEarnings.toNumber(),
          deductions: record.totalDeductions.toNumber(),
        });
      }

      // Check for unusually high deductions (more than 50% of earnings)
      const deductionPercentage =
        (record.totalDeductions.toNumber() / record.totalEarnings.toNumber()) *
        100;
      if (deductionPercentage > 50) {
        warnings.push({
          employeeId: record.employee.employeeId,
          employeeName: record.employee.fullName,
          warning: 'High deduction percentage',
          percentage: deductionPercentage.toFixed(2),
        });
      }
    });

    return {
      isValid: validationErrors.length === 0,
      errors: validationErrors,
      warnings,
      summary: {
        totalRecords: payrollRecords.length,
        errorCount: validationErrors.length,
        warningCount: warnings.length,
      },
    };
  }

  async getAllSalaryDetails() {
    return this.prisma.salaryDetail.findMany({
      orderBy: { effectiveFrom: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            department: {
              select: {
                id: true,
                deptName: true,
              },
            },
            role: {
              select: {
                id: true,
                roleName: true,
              },
            },
          },
        },
      },
    });
  }
}
