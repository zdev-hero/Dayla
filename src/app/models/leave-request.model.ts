export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee?: Employee;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  submittedDate: Date;
  approvedBy?: string;
  approvedDate?: Date;
  comments?: string;
}

export enum LeaveType {
  VACATION = 'vacation',
  SICK = 'sick',
  PERSONAL = 'personal',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
  BEREAVEMENT = 'bereavement',
  UNPAID = 'unpaid',
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

import { Employee } from './employee.model';
