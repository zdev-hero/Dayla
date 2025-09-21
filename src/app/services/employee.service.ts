import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Employee, ContractType } from '../models/employee.model';

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  constructor() {}

  getEmployees(): Observable<Employee[]> {
    return of(this.getMockEmployees());
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

  private getMockEmployees(): Employee[] {
    return [
      {
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
      {
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
      {
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
      {
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
      {
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
      {
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
      {
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
      {
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
    ];
  }
}
