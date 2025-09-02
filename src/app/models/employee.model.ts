export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  hireDate: Date;
  profilePicture?: string;
  manager?: Employee;
  leaveBalance: LeaveBalance;
}

export interface LeaveBalance {
  vacation: number;
  sick: number;
  personal: number;
  totalDaysUsed: number;
  totalDaysRemaining: number;
}
