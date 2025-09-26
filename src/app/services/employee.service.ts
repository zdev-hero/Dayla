import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  Employee,
  ContractType,
  WorkSector,
  EmployeeDocument,
} from '../models/employee.model';

export interface EmployeePaginationResponse {
  employees: Employee[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  constructor() {}

  getEmployees(): Observable<Employee[]> {
    return of(this.getMockEmployees());
  }

  getEmployeesWithPagination(
    page: number,
    pageSize: number
  ): Observable<EmployeePaginationResponse> {
    const allEmployees = this.getMockEmployees();
    const total = allEmployees.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const employees = allEmployees.slice(startIndex, endIndex);

    return of({
      employees,
      total,
      page,
      pageSize,
    });
  }

  getEmployeeById(id: string): Observable<Employee | undefined> {
    return of(this.getMockEmployees().find((emp) => emp.id === id));
  }

  getCurrentEmployee(): Observable<Employee | null> {
    // Pour la démo, retourner toujours le premier employé
    // En production, cela devrait être récupéré depuis l'authentification
    const currentEmployee = this.getMockEmployees().find(
      (emp) => emp.id === '1'
    );
    return of(currentEmployee || null);
  }

  updateEmployee(employee: Employee): Observable<Employee> {
    // Simulation d'une mise à jour
    return of(employee);
  }

  private getMockEmployees(): Employee[] {
    return [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Moreau',
        email: 'jmoreau@email.com',
        phone: '06.12.34.56.78',
        position: 'Développeur Senior',
        department: 'IT',
        workSector: WorkSector.IT,
        contractType: ContractType.CDI,
        hireDate: new Date('2020-01-15'),
        profilePicture:
          'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=72&h=72&fit=crop&crop=face',
        salary: 55000,
        isActive: true,
        leaveBalance: {
          vacation: 15,
          sick: 5,
          personal: 3,
          totalDaysUsed: 10,
          totalDaysRemaining: 13,
        },
        documents: [
          {
            id: '1-1',
            type: 'contract',
            name: 'Contrat CDI - John Moreau.pdf',
            uploadDate: new Date('2020-01-15'),
            fileUrl: '/documents/contracts/john-moreau-contract.pdf',
          },
          {
            id: '1-2',
            type: 'payslip',
            name: 'Fiche de paie - Septembre 2025.pdf',
            uploadDate: new Date('2025-09-01'),
            fileUrl: '/documents/payslips/john-moreau-092025.pdf',
          },
        ],
      },
      {
        id: '2',
        firstName: 'Emma',
        lastName: 'Martin',
        email: 'emma.martin@email.com',
        phone: '06.23.45.67.89',
        position: 'Designer UI/UX',
        department: 'Design',
        workSector: WorkSector.MARKETING,
        contractType: ContractType.CDI,
        hireDate: new Date('2021-06-10'),
        profilePicture:
          'https://images.unsplash.com/photo-1494790108755-2616b612c5c0?w=72&h=72&fit=crop&crop=face',
        salary: 45000,
        isActive: true,
        leaveBalance: {
          vacation: 12,
          sick: 8,
          personal: 4,
          totalDaysUsed: 12,
          totalDaysRemaining: 12,
        },
        documents: [
          {
            id: '2-1',
            type: 'contract',
            name: 'Contrat CDI - Emma Martin.pdf',
            uploadDate: new Date('2021-06-10'),
            fileUrl: '/documents/contracts/emma-martin-contract.pdf',
          },
        ],
      },
      {
        id: '3',
        firstName: 'Jade',
        lastName: 'Bernard',
        email: 'jade.bernard@email.com',
        phone: '06.34.56.78.90',
        position: 'Développeur Junior',
        department: 'IT',
        workSector: WorkSector.IT,
        contractType: ContractType.CDD,
        hireDate: new Date('2022-09-01'),
        contractEndDate: new Date('2025-12-31'),
        profilePicture:
          'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=72&h=72&fit=crop&crop=face',
        salary: 38000,
        isActive: true,
        leaveBalance: {
          vacation: 8,
          sick: 2,
          personal: 1,
          totalDaysUsed: 3,
          totalDaysRemaining: 8,
        },
        documents: [
          {
            id: '3-1',
            type: 'contract',
            name: 'Contrat CDD - Jade Bernard.pdf',
            uploadDate: new Date('2022-09-01'),
            fileUrl: '/documents/contracts/jade-bernard-contract.pdf',
          },
        ],
      },
      {
        id: '4',
        firstName: 'Léo',
        lastName: 'Robert',
        email: 'leo.robert@email.com',
        phone: '06.45.67.89.01',
        position: 'Responsable RH',
        department: 'HR',
        workSector: WorkSector.RH,
        contractType: ContractType.CDI,
        hireDate: new Date('2018-04-15'),
        profilePicture:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=72&h=72&fit=crop&crop=face',
        salary: 52000,
        isActive: true,
        leaveBalance: {
          vacation: 25,
          sick: 1,
          personal: 3,
          totalDaysUsed: 8,
          totalDaysRemaining: 21,
        },
        documents: [
          {
            id: '4-1',
            type: 'contract',
            name: 'Contrat CDI - Léo Robert.pdf',
            uploadDate: new Date('2018-04-15'),
            fileUrl: '/documents/contracts/leo-robert-contract.pdf',
          },
          {
            id: '4-2',
            type: 'other',
            name: 'Formation RH - Certification.pdf',
            uploadDate: new Date('2024-03-20'),
            fileUrl: '/documents/certifications/leo-robert-rh-cert.pdf',
          },
        ],
      },
      {
        id: '5',
        firstName: 'Hugo',
        lastName: 'Fontaine',
        email: 'hugo.fontaine@email.com',
        phone: '06.56.78.90.12',
        position: 'Développeur Full Stack',
        department: 'IT',
        workSector: WorkSector.IT,
        contractType: ContractType.CDI,
        hireDate: new Date('2021-02-28'),
        profilePicture:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=72&h=72&fit=crop&crop=face',
        salary: 48000,
        isActive: true,
        leaveBalance: {
          vacation: 14,
          sick: 3,
          personal: 2,
          totalDaysUsed: 7,
          totalDaysRemaining: 12,
        },
        documents: [
          {
            id: '5-1',
            type: 'contract',
            name: 'Contrat CDI - Hugo Fontaine.pdf',
            uploadDate: new Date('2021-02-28'),
            fileUrl: '/documents/contracts/hugo-fontaine-contract.pdf',
          },
        ],
      },
      {
        id: '6',
        firstName: 'Marie',
        lastName: 'Dupont',
        email: 'marie.dupont@email.com',
        phone: '06.67.89.01.23',
        position: 'Chef de Projet',
        department: 'Management',
        workSector: WorkSector.DIRECTION,
        contractType: ContractType.CDI,
        hireDate: new Date('2019-03-20'),
        profilePicture:
          'https://images.unsplash.com/photo-1494790108755-2616b612c5c0?w=72&h=72&fit=crop&crop=face',
        salary: 58000,
        isActive: true,
        leaveBalance: {
          vacation: 20,
          sick: 3,
          personal: 2,
          totalDaysUsed: 5,
          totalDaysRemaining: 20,
        },
        documents: [
          {
            id: '6-1',
            type: 'contract',
            name: 'Contrat CDI - Marie Dupont.pdf',
            uploadDate: new Date('2019-03-20'),
            fileUrl: '/documents/contracts/marie-dupont-contract.pdf',
          },
        ],
      },
      {
        id: '7',
        firstName: 'Thomas',
        lastName: 'Petit',
        email: 'thomas.petit@email.com',
        phone: '06.78.90.12.34',
        position: 'Analyste Business',
        department: 'Business',
        workSector: WorkSector.FINANCE,
        contractType: ContractType.CDI,
        hireDate: new Date('2020-11-30'),
        profilePicture:
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=72&h=72&fit=crop&crop=face',
        salary: 44000,
        isActive: true,
        leaveBalance: {
          vacation: 18,
          sick: 4,
          personal: 6,
          totalDaysUsed: 15,
          totalDaysRemaining: 13,
        },
        documents: [
          {
            id: '7-1',
            type: 'contract',
            name: 'Contrat CDI - Thomas Petit.pdf',
            uploadDate: new Date('2020-11-30'),
            fileUrl: '/documents/contracts/thomas-petit-contract.pdf',
          },
        ],
      },
      {
        id: '8',
        firstName: 'Camille',
        lastName: 'Leroy',
        email: 'camille.leroy@email.com',
        phone: '06.89.01.23.45',
        position: 'Responsable Marketing',
        department: 'Marketing',
        workSector: WorkSector.MARKETING,
        contractType: ContractType.CDI,
        hireDate: new Date('2019-08-12'),
        profilePicture:
          'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=72&h=72&fit=crop&crop=face',
        salary: 50000,
        isActive: true,
        leaveBalance: {
          vacation: 22,
          sick: 2,
          personal: 5,
          totalDaysUsed: 20,
          totalDaysRemaining: 9,
        },
        documents: [
          {
            id: '8-1',
            type: 'contract',
            name: 'Contrat CDI - Camille Leroy.pdf',
            uploadDate: new Date('2019-08-12'),
            fileUrl: '/documents/contracts/camille-leroy-contract.pdf',
          },
          {
            id: '8-2',
            type: 'justification',
            name: 'Arrêt maladie - Août 2025.pdf',
            uploadDate: new Date('2025-08-15'),
            fileUrl: '/documents/justifications/camille-leroy-sick-08-2025.pdf',
          },
        ],
      },
      {
        id: '9',
        firstName: 'Pierre',
        lastName: 'Durand',
        email: 'pierre.durand@email.com',
        phone: '06.90.12.34.56',
        position: 'Stagiaire Développement',
        department: 'IT',
        workSector: WorkSector.IT,
        contractType: ContractType.STAGE,
        hireDate: new Date('2025-02-01'),
        contractEndDate: new Date('2025-12-31'),
        profilePicture:
          'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=72&h=72&fit=crop&crop=face',
        salary: 600,
        isActive: true,
        leaveBalance: {
          vacation: 0,
          sick: 0,
          personal: 0,
          totalDaysUsed: 0,
          totalDaysRemaining: 0,
        },
        documents: [
          {
            id: '9-1',
            type: 'contract',
            name: 'Convention de stage - Pierre Durand.pdf',
            uploadDate: new Date('2025-02-01'),
            fileUrl: '/documents/contracts/pierre-durand-internship.pdf',
          },
        ],
      },
      {
        id: '10',
        firstName: 'Sophie',
        lastName: 'Laurent',
        email: 'sophie.laurent@email.com',
        phone: '06.01.23.45.67',
        position: 'Comptable',
        department: 'Finance',
        workSector: WorkSector.FINANCE,
        contractType: ContractType.CDI,
        hireDate: new Date('2020-05-18'),
        profilePicture:
          'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=72&h=72&fit=crop&crop=face',
        salary: 42000,
        isActive: true,
        leaveBalance: {
          vacation: 16,
          sick: 5,
          personal: 3,
          totalDaysUsed: 12,
          totalDaysRemaining: 12,
        },
        documents: [
          {
            id: '10-1',
            type: 'contract',
            name: 'Contrat CDI - Sophie Laurent.pdf',
            uploadDate: new Date('2020-05-18'),
            fileUrl: '/documents/contracts/sophie-laurent-contract.pdf',
          },
          {
            id: '10-2',
            type: 'payslip',
            name: 'Fiche de paie - Septembre 2025.pdf',
            uploadDate: new Date('2025-09-01'),
            fileUrl: '/documents/payslips/sophie-laurent-092025.pdf',
          },
        ],
      },
    ];
  }
}
