/*
  Warnings:

  - You are about to drop the column `allowances` on the `payroll_records` table. All the data in the column will be lost.
  - You are about to drop the column `base_salary` on the `payroll_records` table. All the data in the column will be lost.
  - You are about to drop the column `bonus` on the `payroll_records` table. All the data in the column will be lost.
  - You are about to drop the column `deductions` on the `payroll_records` table. All the data in the column will be lost.
  - You are about to drop the column `gross_salary` on the `payroll_records` table. All the data in the column will be lost.
  - You are about to drop the column `net_salary` on the `payroll_records` table. All the data in the column will be lost.
  - You are about to drop the column `allowances` on the `salary_details` table. All the data in the column will be lost.
  - You are about to drop the column `base_salary` on the `salary_details` table. All the data in the column will be lost.
  - You are about to drop the column `other_benefits` on the `salary_details` table. All the data in the column will be lost.
  - Added the required column `basic_salary` to the `payroll_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `days_present` to the `payroll_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `net_pay` to the `payroll_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_days` to the `payroll_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_deductions` to the `payroll_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_earnings` to the `payroll_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `basic_salary` to the `salary_details` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payroll_records" DROP COLUMN "allowances",
DROP COLUMN "base_salary",
DROP COLUMN "bonus",
DROP COLUMN "deductions",
DROP COLUMN "gross_salary",
DROP COLUMN "net_salary",
ADD COLUMN     "arrear_days" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "basic_salary" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "days_present" INTEGER NOT NULL,
ADD COLUMN     "fuel_allowance" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "hra" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "lwp_days" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "net_pay" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "other_deductions" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "other_earnings" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "performance_incentive" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "pf_deduction" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "pt_deduction" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "total_days" INTEGER NOT NULL,
ADD COLUMN     "total_deductions" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "total_earnings" DECIMAL(65,30) NOT NULL;

-- AlterTable
ALTER TABLE "salary_details" DROP COLUMN "allowances",
DROP COLUMN "base_salary",
DROP COLUMN "other_benefits",
ADD COLUMN     "account_number" TEXT,
ADD COLUMN     "bank_name" TEXT,
ADD COLUMN     "basic_salary" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "fuel_allowance" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "hra" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "ifsc_code" TEXT,
ADD COLUMN     "other_allowances" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "other_deductions" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "pan_number" TEXT,
ADD COLUMN     "pf_deduction" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "pt_deduction" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "uan_number" TEXT;
