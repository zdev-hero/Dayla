export interface CraEntry {
  id: string;
  employeeId: string;
  date: Date;
  value: number | CraLeaveType;
  isLeaveType?: boolean;
  notes?: string;
  status: 'draft' | 'submitted' | 'validated' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface CraMonth {
  employeeId: string;
  year: number;
  month: number;
  entries: CraEntry[];
  totalDays: number;
  submittedAt?: Date;
  validatedAt?: Date;
  status: 'draft' | 'submitted' | 'validated' | 'rejected';
}

export enum CraLeaveType {
  VACATION = 'vacation',
  RTT = 'rtt',
  SICK_LEAVE = 'sick_leave',
  UNPAID_LEAVE = 'unpaid_leave',
  MATERNITY_LEAVE = 'maternity_leave',
  PATERNITY_LEAVE = 'paternity_leave',
  TRAINING = 'training',
  OTHER = 'other',
}

export const CRA_LEAVE_TYPE_LABELS: { [key in CraLeaveType]: string } = {
  [CraLeaveType.VACATION]: 'Congé payé',
  [CraLeaveType.RTT]: 'RTT',
  [CraLeaveType.SICK_LEAVE]: 'Maladie',
  [CraLeaveType.UNPAID_LEAVE]: 'Congé sans solde',
  [CraLeaveType.MATERNITY_LEAVE]: 'Congé maternité',
  [CraLeaveType.PATERNITY_LEAVE]: 'Congé paternité',
  [CraLeaveType.TRAINING]: 'Formation',
  [CraLeaveType.OTHER]: 'Autre',
};

export interface CraValidationRule {
  minHoursPerDay: number;
  maxHoursPerDay: number;
  standardWorkingDays: number[]; // 1-7 pour lundi-dimanche
  allowHalfDays: boolean;
  requireNotes: boolean;
}

export interface CraSummary {
  employeeId: string;
  period: {
    year: number;
    month: number;
  };
  totalWorkedDays: number;
  totalPlannedDays: number;
  leavesByType: { [key in CraLeaveType]?: number };
  status: 'draft' | 'submitted' | 'validated' | 'rejected';
}
