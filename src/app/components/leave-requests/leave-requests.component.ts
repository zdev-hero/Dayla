import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import {
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  LEAVE_TYPE_LABELS,
  LEAVE_STATUS_LABELS,
} from '../../models/leave-request.model';
import { Employee } from '../../models/employee.model';
import { LeaveManagementService } from '../../services/leave-management.service';
import { EmployeeDashboardComponent } from '../employee-dashboard/employee-dashboard.component';
import { LeaveAnalyticsComponent } from '../leave-analytics/leave-analytics.component';
import { EditEmployeeModalComponent } from '../edit-employee-modal/edit-employee-modal.component';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-leave-requests',
  imports: [CommonModule, EmployeeDashboardComponent, LeaveAnalyticsComponent],
  templateUrl: './leave-requests.component.html',
  styleUrl: './leave-requests.component.scss',
})
export class LeaveRequestsComponent implements OnInit {
  leaveRequests: LeaveRequest[] = [];
  selectedRows: Set<number> = new Set();
  expandedRows: Set<number> = new Set();
  selectedEmployee: Employee | null = null;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 5; // Nombre de demandes par page
  totalRequests: number = 0;
  totalPages: number = 0;
  pages: number[] = [];
  loading: boolean = false;

  // Références pour les templates
  LeaveStatus = LeaveStatus;
  LeaveType = LeaveType;
  LEAVE_TYPE_LABELS = LEAVE_TYPE_LABELS;
  LEAVE_STATUS_LABELS = LEAVE_STATUS_LABELS;

  constructor(
    private leaveManagementService: LeaveManagementService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadLeaveRequests();
  }

  loadLeaveRequests(): void {
    this.loading = true;
    this.leaveManagementService
      .getLeaveRequestsWithPagination(this.currentPage, this.pageSize)
      .subscribe({
        next: (response) => {
          this.leaveRequests = response.requests;
          this.totalRequests = response.total;
          this.totalPages = Math.ceil(this.totalRequests / this.pageSize);
          this.updatePageNumbers();
          this.loading = false;
          this.selectedRows.clear();
          this.expandedRows.clear();
          this.selectedEmployee = null;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des demandes:', error);
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
      this.loadLeaveRequests();
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

  getFullName(request: LeaveRequest): string {
    return request.employee
      ? `${request.employee.firstName} ${request.employee.lastName}`
      : 'N/A';
  }

  getStatusIcon(status: LeaveStatus): string {
    switch (status) {
      case LeaveStatus.APPROVED:
        return 'assets/icons/icon_validatedmail.svg';
      case LeaveStatus.REJECTED:
        return 'assets/icons/icon_rejectedmail.svg';
      case LeaveStatus.PENDING:
        return 'assets/icons/icon_pendingmail.svg';
      default:
        return 'assets/icons/icon_pendingmail.svg';
    }
  }

  getStatusClass(status: LeaveStatus): string {
    switch (status) {
      case LeaveStatus.APPROVED:
        return 'validated';
      case LeaveStatus.REJECTED:
        return 'rejected';
      case LeaveStatus.PENDING:
        return 'pending';
      default:
        return 'pending';
    }
  }

  getUserAvatarClass(request: LeaveRequest): string {
    if (!request.employee) return 'min-user';

    // // Logique basée sur le statut de la demande pour l'exemple
    // switch (request.status) {
    //   case LeaveStatus.APPROVED:
    //     return 'min-user-present';
    //   case LeaveStatus.REJECTED:
    //     return 'min-user-absent';
    //   default:
    //     return 'min-user';
    // }
    return 'min-user';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }

  getDurationText(days: number): string {
    return days === 1 ? '1 jour' : `${days} jours`;
  }

  // Gestion des sélections (méthodes existantes adaptées)
  onUserClick(index: number, event: Event): void {
    event.preventDefault();

    const row = (event.currentTarget as HTMLElement).closest('tr');
    const checkbox = row?.querySelector('.row-checkbox') as HTMLInputElement;

    if (checkbox) {
      // Si c'est déjà sélectionné, on désélectionne
      if (checkbox.checked) {
        checkbox.checked = false;
        this.selectedRows.delete(index);
        this.expandedRows.delete(index);
        row?.classList.remove('selected');
        this.selectedEmployee = null;
      } else {
        // Désélectionner toutes les autres lignes d'abord
        this.clearAllSelections();

        // Sélectionner la ligne actuelle
        checkbox.checked = true;
        this.selectedRows.add(index);
        this.expandedRows.add(index);
        row?.classList.add('selected');

        // Mettre à jour l'employé sélectionné
        this.selectedEmployee = this.leaveRequests[index]?.employee || null;
      }

      this.updateSelectAllCheckbox();
    }
  }

  onRowSelect(index: number, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const row = checkbox.closest('tr');

    if (checkbox.checked) {
      // Désélectionner toutes les autres lignes d'abord
      this.clearAllSelections();

      this.selectedRows.add(index);
      this.expandedRows.add(index);
      row?.classList.add('selected');

      // Mettre à jour l'employé sélectionné
      this.selectedEmployee = this.leaveRequests[index]?.employee || null;
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
      // Pour la sélection multiple, on peut afficher le premier employé ou laisser null
      this.selectedEmployee = this.leaveRequests[0]?.employee || null;
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

  // Actions sur les demandes
  approveRequest(request: LeaveRequest): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Approuver la demande',
        message: `Êtes-vous sûr de vouloir approuver la demande de congé de ${this.getFullName(
          request
        )} ?`,
        confirmText: 'Approuver',
        cancelText: 'Annuler',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.leaveManagementService.approveLeaveRequest(request.id).subscribe({
          next: () => {
            this.loadLeaveRequests(); // Recharger les données
          },
          error: (error) => {
            console.error("Erreur lors de l'approbation:", error);
          },
        });
      }
    });
  }

  rejectRequest(request: LeaveRequest): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Rejeter la demande',
        message: `Êtes-vous sûr de vouloir rejeter la demande de congé de ${this.getFullName(
          request
        )} ?`,
        confirmText: 'Rejeter',
        cancelText: 'Annuler',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const reason = prompt('Raison du refus:');
        if (reason) {
          this.leaveManagementService
            .rejectLeaveRequest(request.id, reason)
            .subscribe({
              next: () => {
                this.loadLeaveRequests(); // Recharger les données
              },
              error: (error) => {
                console.error('Erreur lors du rejet:', error);
              },
            });
        }
      }
    });
  }

  // Méthodes trackBy pour optimiser les performances
  trackByRequestId(index: number, request: LeaveRequest): string {
    return request.id;
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
    this.leaveRequests.forEach((request) => {
      if (request.employee?.id === updatedEmployee.id) {
        request.employee = updatedEmployee;
      }
    });

    // Si c'est l'employé sélectionné, le mettre à jour aussi
    if (this.selectedEmployee?.id === updatedEmployee.id) {
      this.selectedEmployee = updatedEmployee;
    }

    console.log('Employé mis à jour:', updatedEmployee);
    this.onModalClose();
  }

  // Méthodes de test pour MatDialog
  testMatDialog(): void {
    if (this.leaveRequests.length > 0 && this.leaveRequests[0].employee) {
      this.openEditModal(this.leaveRequests[0].employee);
    } else {
      // Créer un employé de test
      const testEmployee: Employee = {
        id: 'test-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        position: 'Développeur',
        department: 'IT',
        hireDate: new Date(),
        leaveBalance: {
          vacation: 25,
          sick: 10,
          personal: 5,
          totalDaysUsed: 8,
          totalDaysRemaining: 32,
        },
      };
      this.openEditModal(testEmployee);
    }
  }

  testConfirmationDialog(): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Test de confirmation',
        message:
          'Ceci est un test de la boîte de dialogue de confirmation. Voulez-vous continuer ?',
        confirmText: 'Oui',
        cancelText: 'Non',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        alert('Vous avez confirmé !');
      } else {
        alert('Vous avez annulé !');
      }
    });
  }
}
