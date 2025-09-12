import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Employee } from '../../models/employee.model';

@Component({
  selector: 'app-leave-analytics',
  imports: [CommonModule],
  templateUrl: './leave-analytics.component.html',
  styleUrl: './leave-analytics.component.scss',
})
export class LeaveAnalyticsComponent {
  @Input() employee: Employee | null = null;

  getTotalDaysUsed(): number {
    return this.employee?.leaveBalance?.totalDaysUsed || 0;
  }

  getTotalDaysRemaining(): number {
    return this.employee?.leaveBalance?.totalDaysRemaining || 0;
  }

  getVacationBalance(): number {
    return this.employee?.leaveBalance?.vacation || 0;
  }

  getSickBalance(): number {
    return this.employee?.leaveBalance?.sick || 0;
  }

  getPersonalBalance(): number {
    return this.employee?.leaveBalance?.personal || 0;
  }

  getEmployeeName(): string {
    if (!this.employee) return 'Aucun employé sélectionné';
    return `${this.employee.firstName} ${this.employee.lastName}`;
  }

  getCurrentMonth(): string {
    const date = new Date();
    const month = date.toLocaleString('fr-FR', { month: '2-digit' });
    const year = date.getFullYear();
    return `${month}/${year}`;
  }
}
