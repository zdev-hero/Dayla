import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  Absence,
  AbsenceType,
  AbsenceStatus,
  AbsencesResponse,
} from '../models/absence.model';
import { Employee, ContractType } from '../models/employee.model';

@Injectable({
  providedIn: 'root',
})
export class AbsenceService {
  // Données de simulation
  private mockAbsences: Absence[] = [
    {
      id: '1',
      employee: {
        id: 'emp-1',
        firstName: 'Marie',
        lastName: 'Dubois',
        email: 'marie.dubois@company.com',
        position: 'Développeuse Senior',
        department: 'IT',
        contractType: ContractType.CDI,
        hireDate: new Date('2021-03-15'),
        profilePicture: 'assets/images/default-avatar.svg',
        leaveBalance: {
          vacation: 25,
          sick: 10,
          personal: 5,
          totalDaysUsed: 8,
          totalDaysRemaining: 32,
        },
      },
      type: AbsenceType.VACATION,
      startDate: new Date('2025-09-20'),
      endDate: new Date('2025-10-04'),
      totalDays: 10,
      reason: "Vacances d'été",
      status: AbsenceStatus.CURRENT,
      daysRemaining: 8,
      isCurrentlyAbsent: true,
    },
    {
      id: '2',
      employee: {
        id: 'emp-2',
        firstName: 'Jean',
        lastName: 'Martin',
        email: 'jean.martin@company.com',
        position: 'Chef de projet',
        department: 'Management',
        contractType: ContractType.CDI,
        hireDate: new Date('2020-01-10'),
        profilePicture: 'assets/images/default-avatar.svg',
        leaveBalance: {
          vacation: 25,
          sick: 10,
          personal: 5,
          totalDaysUsed: 12,
          totalDaysRemaining: 28,
        },
      },
      type: AbsenceType.SICK_LEAVE,
      startDate: new Date('2025-09-24'),
      endDate: new Date('2025-09-27'),
      totalDays: 4,
      reason: 'Arrêt maladie',
      status: AbsenceStatus.ENDING_SOON,
      daysRemaining: 1,
      isCurrentlyAbsent: true,
    },
    {
      id: '3',
      employee: {
        id: 'emp-3',
        firstName: 'Sophie',
        lastName: 'Leblanc',
        email: 'sophie.leblanc@company.com',
        position: 'Designer UX/UI',
        department: 'Design',
        contractType: ContractType.CDI,
        hireDate: new Date('2022-06-01'),
        profilePicture: 'assets/images/default-avatar.svg',
        leaveBalance: {
          vacation: 25,
          sick: 10,
          personal: 5,
          totalDaysUsed: 5,
          totalDaysRemaining: 35,
        },
      },
      type: AbsenceType.RTT,
      startDate: new Date('2025-09-30'),
      endDate: new Date('2025-10-01'),
      totalDays: 2,
      reason: 'RTT',
      status: AbsenceStatus.STARTING_SOON,
      daysRemaining: 0,
      daysUntilStart: 4,
      isCurrentlyAbsent: false,
    },
    {
      id: '4',
      employee: {
        id: 'emp-4',
        firstName: 'Pierre',
        lastName: 'Dupont',
        email: 'pierre.dupont@company.com',
        position: 'Analyste',
        department: 'Finance',
        contractType: ContractType.CDD,
        hireDate: new Date('2023-02-15'),
        profilePicture: 'assets/images/default-avatar.svg',
        leaveBalance: {
          vacation: 15,
          sick: 8,
          personal: 3,
          totalDaysUsed: 6,
          totalDaysRemaining: 20,
        },
      },
      type: AbsenceType.UNPAID_LEAVE,
      startDate: new Date('2025-09-23'),
      endDate: new Date('2025-10-10'),
      totalDays: 14,
      reason: 'Congé sans solde pour projet personnel',
      status: AbsenceStatus.CURRENT,
      daysRemaining: 14,
      isCurrentlyAbsent: true,
    },
    {
      id: '5',
      employee: {
        id: 'emp-5',
        firstName: 'Camille',
        lastName: 'Rousseau',
        email: 'camille.rousseau@company.com',
        position: 'Responsable RH',
        department: 'Ressources Humaines',
        contractType: ContractType.CDI,
        hireDate: new Date('2019-09-01'),
        profilePicture: 'assets/images/default-avatar.svg',
        leaveBalance: {
          vacation: 25,
          sick: 10,
          personal: 5,
          totalDaysUsed: 15,
          totalDaysRemaining: 25,
        },
      },
      type: AbsenceType.MATERNITY,
      startDate: new Date('2025-08-15'),
      endDate: new Date('2025-12-15'),
      totalDays: 112,
      reason: 'Congé maternité',
      status: AbsenceStatus.CURRENT,
      daysRemaining: 80,
      isCurrentlyAbsent: true,
    },
    {
      id: '6',
      employee: {
        id: 'emp-6',
        firstName: 'Thomas',
        lastName: 'Bernard',
        email: 'thomas.bernard@company.com',
        position: 'Développeur Frontend',
        department: 'IT',
        contractType: ContractType.CDI,
        hireDate: new Date('2022-11-01'),
        profilePicture: 'assets/images/default-avatar.svg',
        leaveBalance: {
          vacation: 25,
          sick: 10,
          personal: 5,
          totalDaysUsed: 3,
          totalDaysRemaining: 37,
        },
      },
      type: AbsenceType.TRAINING,
      startDate: new Date('2025-10-02'),
      endDate: new Date('2025-10-04'),
      totalDays: 3,
      reason: 'Formation Angular avancé',
      status: AbsenceStatus.STARTING_SOON,
      daysRemaining: 0,
      daysUntilStart: 6,
      isCurrentlyAbsent: false,
    },
  ];

  constructor() {}

  /**
   * Récupère les absences avec pagination
   */
  getAbsencesWithPagination(
    page: number = 1,
    pageSize: number = 5
  ): Observable<AbsencesResponse> {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedAbsences = this.mockAbsences.slice(startIndex, endIndex);

    const response: AbsencesResponse = {
      absences: paginatedAbsences,
      total: this.mockAbsences.length,
      page: page,
      pageSize: pageSize,
    };

    // Simuler un délai réseau
    return of(response).pipe(delay(500));
  }

  /**
   * Récupère toutes les absences
   */
  getAllAbsences(): Observable<Absence[]> {
    return of(this.mockAbsences).pipe(delay(300));
  }

  /**
   * Récupère les absences actuelles (employés actuellement absents)
   */
  getCurrentAbsences(): Observable<Absence[]> {
    const currentAbsences = this.mockAbsences.filter(
      (absence) => absence.isCurrentlyAbsent
    );
    return of(currentAbsences).pipe(delay(300));
  }

  /**
   * Récupère les absences qui se terminent bientôt
   */
  getEndingSoonAbsences(): Observable<Absence[]> {
    const endingSoon = this.mockAbsences.filter(
      (absence) => absence.status === AbsenceStatus.ENDING_SOON
    );
    return of(endingSoon).pipe(delay(300));
  }

  /**
   * Récupère les absences qui commencent bientôt
   */
  getStartingSoonAbsences(): Observable<Absence[]> {
    const startingSoon = this.mockAbsences.filter(
      (absence) => absence.status === AbsenceStatus.STARTING_SOON
    );
    return of(startingSoon).pipe(delay(300));
  }

  /**
   * Calcule les jours restants pour une absence
   */
  calculateDaysRemaining(endDate: Date): number {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  /**
   * Calcule les jours avant le début d'une absence
   */
  calculateDaysUntilStart(startDate: Date): number {
    const today = new Date();
    const start = new Date(startDate);
    const diffTime = start.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  /**
   * Met à jour le statut d'une absence
   */
  updateAbsenceStatus(
    absenceId: string,
    newStatus: AbsenceStatus
  ): Observable<Absence> {
    const absence = this.mockAbsences.find((a) => a.id === absenceId);
    if (absence) {
      absence.status = newStatus;
      return of(absence).pipe(delay(200));
    }
    throw new Error('Absence non trouvée');
  }

  /**
   * Supprime une absence
   */
  deleteAbsence(absenceId: string): Observable<boolean> {
    const index = this.mockAbsences.findIndex((a) => a.id === absenceId);
    if (index !== -1) {
      this.mockAbsences.splice(index, 1);
      return of(true).pipe(delay(200));
    }
    return of(false).pipe(delay(200));
  }

  /**
   * Ajoute une nouvelle absence
   */
  addAbsence(absence: Omit<Absence, 'id'>): Observable<Absence> {
    const newAbsence: Absence = {
      ...absence,
      id: `abs-${Date.now()}`,
    };

    this.mockAbsences.push(newAbsence);
    return of(newAbsence).pipe(delay(200));
  }

  /**
   * Filtre les absences par type
   */
  getAbsencesByType(type: AbsenceType): Observable<Absence[]> {
    const filtered = this.mockAbsences.filter(
      (absence) => absence.type === type
    );
    return of(filtered).pipe(delay(300));
  }

  /**
   * Filtre les absences par employé
   */
  getAbsencesByEmployee(employeeId: string): Observable<Absence[]> {
    const filtered = this.mockAbsences.filter(
      (absence) => absence.employee.id === employeeId
    );
    return of(filtered).pipe(delay(300));
  }
}
