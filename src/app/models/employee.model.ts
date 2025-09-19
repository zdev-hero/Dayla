export enum ContractType {
  CDI = 'CDI',
  CDD = 'CDD',
  STAGE = 'Stage',
  FREELANCE = 'Freelance',
  APPRENTISSAGE = 'Apprentissage',
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position: string;
  department: string;
  contractType?: ContractType;
  hireDate: Date;
  profilePicture?: string;
  manager?: Employee;
  leaveBalance: LeaveBalance;
}

export interface LeaveBalance {
  vacation: number;
  sick: number;
  personal: number;
  rtt?: number;
  totalDaysUsed: number;
  totalDaysRemaining: number;
}
