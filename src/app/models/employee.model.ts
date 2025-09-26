export enum ContractType {
  CDI = 'CDI',
  CDD = 'CDD',
  STAGE = 'Stage',
  FREELANCE = 'Freelance',
  APPRENTISSAGE = 'Apprentissage',
}

export enum WorkSector {
  IT = 'IT',
  RH = 'Ressources Humaines',
  FINANCE = 'Finance',
  MARKETING = 'Marketing',
  VENTE = 'Vente',
  PRODUCTION = 'Production',
  QUALITE = 'Qualité',
  LOGISTIQUE = 'Logistique',
  JURIDIQUE = 'Juridique',
  DIRECTION = 'Direction',
}

export interface EmployeeDocument {
  id: string;
  type: 'contract' | 'payslip' | 'justification' | 'other';
  name: string;
  uploadDate: Date;
  fileUrl: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position: string;
  department: string;
  workSector?: WorkSector;
  contractType?: ContractType;
  hireDate: Date;
  contractEndDate?: Date; // Pour CDD, Stage, etc.
  profilePicture?: string;
  manager?: Employee;
  leaveBalance: LeaveBalance;
  documents?: EmployeeDocument[];
  salary?: number;
  isActive?: boolean;
}

export interface LeaveBalance {
  vacation: number;
  sick: number;
  personal: number;
  rtt?: number;
  totalDaysUsed: number;
  totalDaysRemaining: number;
}
