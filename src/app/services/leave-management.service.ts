import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import {
  LeaveRequest,
  LeaveType,
  LeaveStatus,
} from '../models/leave-request.model';
import { Employee, ContractType } from '../models/employee.model';

@Injectable({
  providedIn: 'root',
})
export class LeaveManagementService {
  private apiUrl = 'api/leave-requests'; // URL de votre API

  constructor(private http: HttpClient) {}

  // Méthode pour récupérer toutes les demandes de congé
  getLeaveRequests(): Observable<LeaveRequest[]> {
    // Pour le moment, je retourne des données mock
    // Remplacez cette ligne par : return this.http.get<LeaveRequest[]>(this.apiUrl);
    return of(this.getMockLeaveRequests());
  }

  // Méthode pour récupérer les demandes avec pagination
  getLeaveRequestsWithPagination(
    page: number,
    pageSize: number
  ): Observable<{ requests: LeaveRequest[]; total: number }> {
    const allRequests = this.getMockLeaveRequests();
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedRequests = allRequests.slice(startIndex, endIndex);

    return of({
      requests: paginatedRequests,
      total: allRequests.length,
    });
  }

  // Méthode pour approuver une demande
  approveLeaveRequest(requestId: string): Observable<LeaveRequest> {
    // return this.http.put<LeaveRequest>(`${this.apiUrl}/${requestId}/approve`, {});
    const requests = this.getMockLeaveRequests();
    const request = requests.find((r) => r.id === requestId);
    if (request) {
      request.status = LeaveStatus.APPROVED;
    }
    return of(request!);
  }

  // Méthode pour rejeter une demande
  rejectLeaveRequest(
    requestId: string,
    reason: string
  ): Observable<LeaveRequest> {
    // return this.http.put<LeaveRequest>(`${this.apiUrl}/${requestId}/reject`, { reason });
    const requests = this.getMockLeaveRequests();
    const request = requests.find((r) => r.id === requestId);
    if (request) {
      request.status = LeaveStatus.REJECTED;
      request.comments = reason;
    }
    return of(request!);
  }

  // Nouvelle méthode pour créer une demande de congé
  createLeaveRequest(leaveRequest: LeaveRequest): Observable<LeaveRequest> {
    // return this.http.post<LeaveRequest>(this.apiUrl, leaveRequest);
    const newRequest = {
      ...leaveRequest,
      id: Math.random().toString(36).substr(2, 9), // Générer un ID temporaire
    };
    return of(newRequest);
  }

  // Nouvelle méthode pour mettre à jour une demande de congé
  updateLeaveRequest(leaveRequest: LeaveRequest): Observable<LeaveRequest> {
    // return this.http.put<LeaveRequest>(`${this.apiUrl}/${leaveRequest.id}`, leaveRequest);
    const requests = this.getMockLeaveRequests();
    const index = requests.findIndex((r) => r.id === leaveRequest.id);
    if (index !== -1) {
      requests[index] = { ...leaveRequest };
      return of(requests[index]);
    }
    return of(leaveRequest);
  }

  // Nouvelle méthode pour supprimer une demande de congé
  deleteLeaveRequest(requestId: string): Observable<void> {
    // return this.http.delete<void>(`${this.apiUrl}/${requestId}`);
    const requests = this.getMockLeaveRequests();
    const index = requests.findIndex((r) => r.id === requestId);
    if (index !== -1) {
      requests.splice(index, 1);
    }
    return of();
  }

  // Données mock pour les tests
  private getMockLeaveRequests(): LeaveRequest[] {
    return [
      {
        id: '1',
        employeeId: '1',
        employee: {
          id: '1',
          firstName: 'John',
          lastName: 'Moreau',
          email: 'jmoreau@email.com',
          position: 'Développeur Senior',
          department: 'IT',
          contractType: ContractType.CDI,
          hireDate: new Date('2020-01-15'),
          profilePicture:
            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=72&h=72&fit=crop&crop=face',
          leaveBalance: {
            vacation: 15,
            sick: 5,
            personal: 3,
            totalDaysUsed: 10,
            totalDaysRemaining: 13,
          },
        },
        leaveType: LeaveType.VACATION,
        startDate: new Date('2025-07-18'),
        endDate: new Date('2025-07-20'),
        totalDays: 3,
        reason: "Vacances d'été en famille",
        status: LeaveStatus.APPROVED,
        submittedDate: new Date('2025-07-01'),
        approvedBy: 'manager1',
        approvedDate: new Date('2025-07-05'),
      },
      {
        id: '2',
        employeeId: '2',
        employee: {
          id: '2',
          firstName: 'Emma',
          lastName: 'Martin',
          email: 'emma.martin@email.com',
          position: 'Designer UI/UX',
          department: 'Design',
          contractType: ContractType.CDI,
          hireDate: new Date('2021-06-10'),
          profilePicture:
            'https://images.unsplash.com/photo-1494790108755-2616b612c5c0?w=72&h=72&fit=crop&crop=face',
          leaveBalance: {
            vacation: 12,
            sick: 8,
            personal: 4,
            totalDaysUsed: 12,
            totalDaysRemaining: 12,
          },
        },
        leaveType: LeaveType.PERSONAL,
        startDate: new Date('2025-07-14'),
        endDate: new Date('2025-07-18'),
        totalDays: 5,
        reason: 'RTT - Récupération temps de travail',
        status: LeaveStatus.REJECTED,
        submittedDate: new Date('2025-06-28'),
        comments: 'Période trop chargée, reporté au mois suivant',
      },
      {
        id: '3',
        employeeId: '3',
        employee: {
          id: '3',
          firstName: 'Jade',
          lastName: 'Bernard',
          email: 'jade.bernard@email.com',
          position: 'Développeur Junior',
          department: 'IT',
          contractType: ContractType.CDI,
          hireDate: new Date('2022-09-01'),
          profilePicture:
            'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=72&h=72&fit=crop&crop=face',
          leaveBalance: {
            vacation: 8,
            sick: 2,
            personal: 1,
            totalDaysUsed: 3,
            totalDaysRemaining: 8,
          },
        },
        leaveType: LeaveType.SICK,
        startDate: new Date('2025-07-20'),
        endDate: new Date('2025-08-03'),
        totalDays: 15,
        reason: 'Congé maladie - Certificat médical joint',
        status: LeaveStatus.PENDING,
        submittedDate: new Date('2025-07-15'),
      },
      {
        id: '4',
        employeeId: '4',
        employee: {
          id: '4',
          firstName: 'Léo',
          lastName: 'Robert',
          email: 'leo.robert@email.com',
          position: 'Responsable RH',
          department: 'HR',
          contractType: ContractType.CDI,
          hireDate: new Date('2018-04-15'),
          profilePicture:
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=72&h=72&fit=crop&crop=face',
          leaveBalance: {
            vacation: 25,
            sick: 1,
            personal: 3,
            totalDaysUsed: 8,
            totalDaysRemaining: 21,
          },
        },
        leaveType: LeaveType.UNPAID,
        startDate: new Date('2025-08-01'),
        endDate: new Date('2025-08-10'),
        totalDays: 10,
        reason: 'Congé sans solde pour voyage personnel',
        status: LeaveStatus.APPROVED,
        submittedDate: new Date('2025-07-08'),
        approvedBy: 'manager2',
        approvedDate: new Date('2025-07-10'),
      },
      {
        id: '5',
        employeeId: '5',
        employee: {
          id: '5',
          firstName: 'Hugo',
          lastName: 'Fontaine',
          email: 'hugo.fontaine@email.com',
          position: 'Développeur Full Stack',
          department: 'IT',
          contractType: ContractType.CDI,
          hireDate: new Date('2021-02-28'),
          profilePicture:
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=72&h=72&fit=crop&crop=face',
          leaveBalance: {
            vacation: 14,
            sick: 3,
            personal: 2,
            totalDaysUsed: 7,
            totalDaysRemaining: 12,
          },
        },
        leaveType: LeaveType.SICK,
        startDate: new Date('2025-07-27'),
        endDate: new Date('2025-08-05'),
        totalDays: 10,
        reason: 'Arrêt maladie - Opération programmée',
        status: LeaveStatus.APPROVED,
        submittedDate: new Date('2025-07-20'),
        approvedBy: 'manager1',
        approvedDate: new Date('2025-07-22'),
      },
      {
        id: '6',
        employeeId: '6',
        employee: {
          id: '6',
          firstName: 'Marie',
          lastName: 'Dupont',
          email: 'marie.dupont@email.com',
          position: 'Chef de Projet',
          department: 'Management',
          hireDate: new Date('2019-03-20'),
          profilePicture:
            'https://images.unsplash.com/photo-1494790108755-2616b612c5c0?w=72&h=72&fit=crop&crop=face',
          leaveBalance: {
            vacation: 20,
            sick: 3,
            personal: 2,
            totalDaysUsed: 5,
            totalDaysRemaining: 20,
          },
        },
        leaveType: LeaveType.VACATION,
        startDate: new Date('2025-08-15'),
        endDate: new Date('2025-08-29'),
        totalDays: 15,
        reason: "Vacances d'été - Voyage en famille",
        status: LeaveStatus.PENDING,
        submittedDate: new Date('2025-07-25'),
      },
      {
        id: '7',
        employeeId: '7',
        employee: {
          id: '7',
          firstName: 'Thomas',
          lastName: 'Petit',
          email: 'thomas.petit@email.com',
          position: 'Analyste Business',
          department: 'Business',
          hireDate: new Date('2020-11-30'),
          profilePicture:
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=72&h=72&fit=crop&crop=face',
          leaveBalance: {
            vacation: 18,
            sick: 4,
            personal: 6,
            totalDaysUsed: 15,
            totalDaysRemaining: 13,
          },
        },
        leaveType: LeaveType.PERSONAL,
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-09-03'),
        totalDays: 3,
        reason: 'Congés personnels - Événement familial',
        status: LeaveStatus.REJECTED,
        submittedDate: new Date('2025-08-15'),
        comments: 'Période de forte activité, veuillez reporter',
      },
      {
        id: '8',
        employeeId: '8',
        employee: {
          id: '8',
          firstName: 'Camille',
          lastName: 'Leroy',
          email: 'camille.leroy@email.com',
          position: 'Responsable Marketing',
          department: 'Marketing',
          hireDate: new Date('2019-08-12'),
          profilePicture:
            'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=72&h=72&fit=crop&crop=face',
          leaveBalance: {
            vacation: 22,
            sick: 2,
            personal: 5,
            totalDaysUsed: 20,
            totalDaysRemaining: 9,
          },
        },
        leaveType: LeaveType.MATERNITY,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-12-31'),
        totalDays: 92,
        reason: 'Congé maternité',
        status: LeaveStatus.APPROVED,
        submittedDate: new Date('2025-08-01'),
        approvedBy: 'manager2',
        approvedDate: new Date('2025-08-02'),
      },
    ];
  }
}
