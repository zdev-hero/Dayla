import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Employee } from '../../models/employee.model';

@Component({
  selector: 'app-employee-dashboard',
  imports: [CommonModule],
  templateUrl: './employee-dashboard.component.html',
  styleUrl: './employee-dashboard.component.scss',
})
export class EmployeeDashboardComponent {
  @Input() employee: Employee | null = null;

  returnDate: string = '21/07/2025';

  getFullName(): string {
    if (!this.employee) return 'Employé non sélectionné';
    return `${this.employee.firstName} ${this.employee.lastName}`;
  }

  getProfilePicture(): string {
    return this.employee?.profilePicture || 'assets/images/default-avatar.svg';
  }
}
