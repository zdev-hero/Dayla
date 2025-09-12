import { Employee } from './employee.model';

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

// Utilitaires pour l'affichage
export const LEAVE_TYPE_LABELS = {
  [LeaveType.VACATION]: 'Congés payés',
  [LeaveType.SICK]: 'Maladie',
  [LeaveType.PERSONAL]: 'RTT',
  [LeaveType.MATERNITY]: 'Congé maternité',
  [LeaveType.PATERNITY]: 'Congé paternité',
  [LeaveType.BEREAVEMENT]: 'Congé décès',
  [LeaveType.UNPAID]: 'Sans solde',
};

export const LEAVE_STATUS_LABELS = {
  [LeaveStatus.PENDING]: 'En attente',
  [LeaveStatus.APPROVED]: 'Validé',
  [LeaveStatus.REJECTED]: 'Refusé',
  [LeaveStatus.CANCELLED]: 'Annulé',
};
