import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import {
  Absence,
  AbsenceType,
  AbsenceStatus,
  ABSENCE_TYPE_LABELS,
  ABSENCE_STATUS_LABELS,
} from '../../models/absence.model';
import { Employee } from '../../models/employee.model';
import { AbsenceService } from '../../services/absence.service';
import { EmployeeDashboardComponent } from '../employee-dashboard/employee-dashboard.component';
import { LeaveAnalyticsComponent } from '../leave-analytics/leave-analytics.component';
import { EditEmployeeModalComponent } from '../edit-employee-modal/edit-employee-modal.component';

@Component({
  selector: 'app-absence-list',
  imports: [CommonModule, EmployeeDashboardComponent, LeaveAnalyticsComponent],
  templateUrl: './absence-list.component.html',
  styleUrl: './absence-list.component.scss',
})
export class AbsenceListComponent implements OnInit {
  absences: Absence[] = [];
  selectedRows: Set<number> = new Set();
  expandedRows: Set<number> = new Set();
  selectedEmployee: Employee | null = null;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 5;
  totalAbsences: number = 0;
  totalPages: number = 0;
  pages: number[] = [];
  loading: boolean = false;

  // Filtres
  selectedType: AbsenceType | 'all' = 'all';
  selectedStatus: AbsenceStatus | 'all' = 'all';

  // Références pour les templates
  AbsenceType = AbsenceType;
  AbsenceStatus = AbsenceStatus;
  ABSENCE_TYPE_LABELS = ABSENCE_TYPE_LABELS;
  ABSENCE_STATUS_LABELS = ABSENCE_STATUS_LABELS;

  constructor(
    private absenceService: AbsenceService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadAbsences();
  }

  loadAbsences(): void {
    this.loading = true;
    this.absenceService
      .getAbsencesWithPagination(this.currentPage, this.pageSize)
      .subscribe({
        next: (response) => {
          this.absences = response.absences;
          this.totalAbsences = response.total;
          this.totalPages = Math.ceil(this.totalAbsences / this.pageSize);
          this.updatePageNumbers();
          this.loading = false;
          this.selectedRows.clear();
          this.expandedRows.clear();
          this.selectedEmployee = null;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des absences:', error);
          this.loading = false;
        },
      });
  }

  updatePageNumbers(): void {
    this.pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      this.pages.push(i);
    }
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadAbsences();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.changePage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.changePage(this.currentPage + 1);
    }
  }

  getFullName(absence: Absence): string {
    return absence.employee
      ? `${absence.employee.firstName} ${absence.employee.lastName}`
      : 'N/A';
  }

  getStatusIcon(status: AbsenceStatus): string {
    switch (status) {
      case AbsenceStatus.CURRENT:
        return 'assets/icons/icon_rejectedmail.svg'; // Rouge pour en cours
      case AbsenceStatus.ENDING_SOON:
        return 'assets/icons/icon_pendingmail.svg'; // Orange pour fin prochaine
      case AbsenceStatus.STARTING_SOON:
        return 'assets/icons/icon_validatedmail.svg'; // Vert pour début prochain
      default:
        return 'assets/icons/icon_pendingmail.svg';
    }
  }

  getStatusClass(status: AbsenceStatus): string {
    switch (status) {
      case AbsenceStatus.CURRENT:
        return 'current-absence';
      case AbsenceStatus.ENDING_SOON:
        return 'ending-soon';
      case AbsenceStatus.STARTING_SOON:
        return 'starting-soon';
      default:
        return 'pending';
    }
  }

  getTypeIcon(type: AbsenceType): string {
    switch (type) {
      case AbsenceType.VACATION:
        return 'assets/icons/calendar.svg';
      case AbsenceType.SICK_LEAVE:
        return 'assets/icons/leave_request.svg';
      case AbsenceType.RTT:
        return 'assets/icons/calendar.svg';
      case AbsenceType.UNPAID_LEAVE:
        return 'assets/icons/leave_request.svg';
      case AbsenceType.MATERNITY:
      case AbsenceType.PATERNITY:
        return 'assets/icons/leave_request.svg';
      case AbsenceType.TRAINING:
        return 'assets/icons/settings.svg';
      default:
        return 'assets/icons/calendar.svg';
    }
  }

  getTypeClass(type: AbsenceType): string {
    switch (type) {
      case AbsenceType.VACATION:
        return 'type-vacation';
      case AbsenceType.SICK_LEAVE:
        return 'type-sick';
      case AbsenceType.RTT:
        return 'type-rtt';
      case AbsenceType.UNPAID_LEAVE:
        return 'type-unpaid';
      case AbsenceType.MATERNITY:
      case AbsenceType.PATERNITY:
        return 'type-family';
      case AbsenceType.TRAINING:
        return 'type-training';
      default:
        return 'type-other';
    }
  }

  getUserAvatarClass(absence: Absence): string {
    if (!absence.employee) return 'min-user';

    // Classe basée sur le statut d'absence
    switch (absence.status) {
      case AbsenceStatus.CURRENT:
        return 'min-user-absent';
      case AbsenceStatus.ENDING_SOON:
        return 'min-user-ending';
      case AbsenceStatus.STARTING_SOON:
        return 'min-user-starting';
      default:
        return 'min-user';
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }

  getDurationText(days: number): string {
    return days === 1 ? '1 jour' : `${days} jours`;
  }

  getRemainingDaysText(absence: Absence): string {
    if (!absence.isCurrentlyAbsent && absence.daysUntilStart !== undefined) {
      // Absence pas encore commencée
      return absence.daysUntilStart === 0
        ? "Commence aujourd'hui"
        : absence.daysUntilStart === 1
        ? 'Commence demain'
        : `Dans ${absence.daysUntilStart} jours`;
    }

    // Absence en cours
    if (absence.daysRemaining === 0) {
      return "Se termine aujourd'hui";
    } else if (absence.daysRemaining === 1) {
      return 'Se termine demain';
    } else {
      return `${absence.daysRemaining} jours restants`;
    }
  }

  getRemainingDaysClass(absence: Absence): string {
    if (!absence.isCurrentlyAbsent) {
      return 'days-upcoming';
    }

    if (absence.daysRemaining <= 1) {
      return 'days-ending';
    } else if (absence.daysRemaining <= 7) {
      return 'days-soon';
    } else {
      return 'days-normal';
    }
  }

  // Gestion des sélections
  onUserClick(index: number, event: Event): void {
    event.preventDefault();

    const row = (event.currentTarget as HTMLElement).closest('tr');
    const checkbox = row?.querySelector('.row-checkbox') as HTMLInputElement;

    if (checkbox) {
      if (checkbox.checked) {
        checkbox.checked = false;
        this.selectedRows.delete(index);
        this.expandedRows.delete(index);
        row?.classList.remove('selected');
        this.selectedEmployee = null;
      } else {
        this.clearAllSelections();

        checkbox.checked = true;
        this.selectedRows.add(index);
        this.expandedRows.add(index);
        row?.classList.add('selected');

        this.selectedEmployee = this.absences[index]?.employee || null;
      }

      this.updateSelectAllCheckbox();
    }
  }

  onRowSelect(index: number, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const row = checkbox.closest('tr');

    if (checkbox.checked) {
      this.clearAllSelections();

      this.selectedRows.add(index);
      this.expandedRows.add(index);
      row?.classList.add('selected');

      this.selectedEmployee = this.absences[index]?.employee || null;
    } else {
      this.selectedRows.delete(index);
      this.expandedRows.delete(index);
      row?.classList.remove('selected');
      this.selectedEmployee = null;
    }

    this.updateSelectAllCheckbox();
  }

  private clearAllSelections(): void {
    const allCheckboxes = document.querySelectorAll(
      '.row-checkbox'
    ) as NodeListOf<HTMLInputElement>;
    const allRows = document.querySelectorAll('.table-row');

    this.selectedRows.clear();
    this.expandedRows.clear();

    allCheckboxes.forEach((cb, index) => {
      cb.checked = false;
      allRows[index]?.classList.remove('selected');
    });
  }

  onSelectAll(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const allCheckboxes = document.querySelectorAll(
      '.row-checkbox'
    ) as NodeListOf<HTMLInputElement>;
    const allRows = document.querySelectorAll('.table-row');

    if (checkbox.checked) {
      this.selectedRows.clear();
      this.expandedRows.clear();
      allCheckboxes.forEach((cb, index) => {
        cb.checked = true;
        this.selectedRows.add(index);
        this.expandedRows.add(index);
        allRows[index]?.classList.add('selected');
      });
      this.selectedEmployee = this.absences[0]?.employee || null;
    } else {
      this.selectedRows.clear();
      this.expandedRows.clear();
      allCheckboxes.forEach((cb, index) => {
        cb.checked = false;
        allRows[index]?.classList.remove('selected');
      });
      this.selectedEmployee = null;
    }
  }

  private updateSelectAllCheckbox(): void {
    const selectAllCheckbox = document.querySelector(
      '.select-all-checkbox'
    ) as HTMLInputElement;
    const totalRows = document.querySelectorAll('.row-checkbox').length;

    if (!selectAllCheckbox) return;

    if (this.selectedRows.size === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else if (this.selectedRows.size === totalRows) {
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
    } else {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = true;
    }
  }

  // Méthodes trackBy pour optimiser les performances
  trackByAbsenceId(index: number, absence: Absence): string {
    return absence.id;
  }

  trackByPageNumber(index: number, page: number): number {
    return page;
  }

  // Expose Math pour l'utiliser dans le template
  Math = Math;

  // Méthode pour gérer l'erreur de chargement d'image
  handleImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'assets/images/default-avatar.svg';
    }
  }

  // Méthode pour vérifier si une ligne est étendue
  isRowExpanded(index: number): boolean {
    return this.expandedRows.has(index);
  }

  // Méthodes pour le modal d'édition d'employé
  openEditModal(employee: Employee): void {
    const dialogRef = this.dialog.open(EditEmployeeModalComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { employee: employee },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.onModalSave(result);
      }
    });
  }

  onModalClose(): void {}

  onModalSave(updatedEmployee: Employee): void {
    // Mettre à jour l'employé dans la liste locale
    this.absences.forEach((absence) => {
      if (absence.employee?.id === updatedEmployee.id) {
        absence.employee = updatedEmployee;
      }
    });

    // Si c'est l'employé sélectionné, le mettre à jour aussi
    if (this.selectedEmployee?.id === updatedEmployee.id) {
      this.selectedEmployee = updatedEmployee;
    }

    console.log('Employé mis à jour:', updatedEmployee);
    this.onModalClose();
  }

  // Méthodes de filtrage
  onTypeFilterChange(type: AbsenceType | 'all'): void {
    this.selectedType = type;
    this.currentPage = 1;
    // TODO: Implémenter le filtrage côté service
    this.loadAbsences();
  }

  onStatusFilterChange(status: AbsenceStatus | 'all'): void {
    this.selectedStatus = status;
    this.currentPage = 1;
    // TODO: Implémenter le filtrage côté service
    this.loadAbsences();
  }
}
