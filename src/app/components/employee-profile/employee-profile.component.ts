import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Employee } from '../../models/employee.model';

@Component({
  selector: 'app-employee-profile',
  imports: [CommonModule],
  templateUrl: './employee-profile.component.html',
  styleUrl: './employee-profile.component.scss',
})
export class EmployeeProfileComponent {
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
