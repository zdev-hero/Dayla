import { Employee } from './employee.model';

export enum AbsenceType {
  VACATION = 'vacation', // Congé payé
  SICK_LEAVE = 'sick_leave', // Congé maladie
  RTT = 'rtt', // Récupération du temps de travail
  UNPAID_LEAVE = 'unpaid_leave', // Congé sans solde
  MATERNITY = 'maternity', // Congé maternité
  PATERNITY = 'paternity', // Congé paternité
  TRAINING = 'training', // Formation
  OTHER = 'other', // Autre
}

export enum AbsenceStatus {
  CURRENT = 'current', // En cours d'absence
  ENDING_SOON = 'ending_soon', // Se termine bientôt (dans les 7 jours)
  STARTING_SOON = 'starting_soon', // Commence bientôt (dans les 7 jours)
}

export interface Absence {
  id: string;
  employee: Employee;
  type: AbsenceType;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason?: string;
  status: AbsenceStatus;
  daysRemaining: number; // Jours restants avant la fin
  daysUntilStart?: number; // Jours avant le début (si pas encore commencé)
  isCurrentlyAbsent: boolean; // Si l'employé est actuellement absent
}

// Labels en français pour l'affichage
export const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  [AbsenceType.VACATION]: 'Congé payé',
  [AbsenceType.SICK_LEAVE]: 'Arrêt maladie',
  [AbsenceType.RTT]: 'RTT',
  [AbsenceType.UNPAID_LEAVE]: 'Congé sans solde',
  [AbsenceType.MATERNITY]: 'Congé maternité',
  [AbsenceType.PATERNITY]: 'Congé paternité',
  [AbsenceType.TRAINING]: 'Formation',
  [AbsenceType.OTHER]: 'Autre',
};

export const ABSENCE_STATUS_LABELS: Record<AbsenceStatus, string> = {
  [AbsenceStatus.CURRENT]: 'En cours',
  [AbsenceStatus.ENDING_SOON]: 'Fin prochaine',
  [AbsenceStatus.STARTING_SOON]: 'Début prochain',
};

// Interface pour la réponse paginée du service
export interface AbsencesResponse {
  absences: Absence[];
  total: number;
  page: number;
  pageSize: number;
}
