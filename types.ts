export enum UserRole {
  EMPLOYEE = 'Employee',
  MANAGER = 'Manager',
  HR = 'HR'
}

export enum TimesheetStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  MANAGER_APPROVED = 'Manager Approved',
  HR_APPROVED = 'HR Approved',
  REJECTED = 'Rejected'
}

export enum EntryType {
  REGULAR = 'Regular',
  SATURDAY = 'Saturday',
  SUNDAY = 'Sunday',
  PUBLIC_HOLIDAY = 'Public Holiday',
  LEAVE = 'Leave',
  SHIFT_ALLOWANCE = 'Shift Allowance (>6pm)'
}

export interface TimesheetEntry {
  id: string;
  date: string;
  type: EntryType;
  hours: number;
}

export interface Timesheet {
  id: string;
  employeeId: string;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  status: TimesheetStatus;
  entries: TimesheetEntry[];
  rejectionReason?: string;
  submittedAt?: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  managerId?: string; // ID of the user they report to
}