import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import {
  Employee,
  ContractType,
  WorkSector,
  EmployeeDocument,
} from '../../models/employee.model';
import {
  EmployeeService,
  EmployeePaginationResponse,
} from '../../services/employee.service';
import { EditEmployeeModalComponent } from '../edit-employee-modal/edit-employee-modal.component';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-employee-dashboard',
  imports: [CommonModule],
  templateUrl: './employee-dashboard.component.html',
  styleUrl: './employee-dashboard.component.scss',
})
export class EmployeeDashboardComponent implements OnInit {
  employees: Employee[] = [];
  selectedRows: Set<number> = new Set();
  expandedRows: Set<number> = new Set();
  selectedEmployee: Employee | null = null;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 5;
  totalEmployees: number = 0;
  totalPages: number = 0;
  pages: number[] = [];
  loading: boolean = false;

  // Références pour les templates
  ContractType = ContractType;
  WorkSector = WorkSector;

  constructor(
    private employeeService: EmployeeService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.loading = true;
    this.employeeService
      .getEmployeesWithPagination(this.currentPage, this.pageSize)
      .subscribe({
        next: (response: EmployeePaginationResponse) => {
          this.employees = response.employees;
          this.totalEmployees = response.total;
          this.totalPages = Math.ceil(this.totalEmployees / this.pageSize);
          this.updatePageNumbers();
          this.loading = false;
          this.selectedRows.clear();
          this.expandedRows.clear();
          this.selectedEmployee = null;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des employés:', error);
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
      this.loadEmployees();
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

  getFullName(employee: Employee): string {
    return `${employee.firstName} ${employee.lastName}`;
  }

  getContractStatusClass(employee: Employee): string {
    if (!employee.isActive) return 'inactive';

    switch (employee.contractType) {
      case ContractType.CDI:
        return 'cdi';
      case ContractType.CDD:
        return 'cdd';
      case ContractType.STAGE:
        return 'stage';
      case ContractType.FREELANCE:
        return 'freelance';
      case ContractType.APPRENTISSAGE:
        return 'apprentissage';
      default:
        return 'unknown';
    }
  }

  getUserAvatarClass(employee: Employee): string {
    return employee.isActive ? 'min-user-present' : 'min-user-absent';
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  getWorkSectorLabel(sector: WorkSector | undefined): string {
    return sector || 'Non défini';
  }

  getContractTypeLabel(contractType: ContractType | undefined): string {
    return contractType || 'Non défini';
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
        this.selectedEmployee = this.employees[index] || null;
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
      this.selectedEmployee = this.employees[index] || null;
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

  // Actions sur les employés
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

  onModalSave(updatedEmployee: Employee): void {
    const index = this.employees.findIndex(
      (emp) => emp.id === updatedEmployee.id
    );
    if (index !== -1) {
      this.employees[index] = updatedEmployee;
    }

    if (this.selectedEmployee?.id === updatedEmployee.id) {
      this.selectedEmployee = updatedEmployee;
    }

    console.log('Employé mis à jour:', updatedEmployee);
  }

  viewDocuments(
    employee: Employee,
    documentType: 'contract' | 'payslip' | 'justification'
  ): void {
    const documents =
      employee.documents?.filter((doc) => doc.type === documentType) || [];

    if (documents.length === 0) {
      alert(
        `Aucun document de type "${documentType}" trouvé pour ${this.getFullName(
          employee
        )}`
      );
      return;
    }

    // Simulation d'ouverture de document
    const document = documents[0];
    console.log(`Ouverture du document: ${document.name}`, document);
    alert(`Ouverture du document: ${document.name}`);
  }

  viewAllDocuments(employee: Employee): void {
    const totalDocs = employee.documents?.length || 0;
    console.log(
      `${this.getFullName(employee)} a ${totalDocs} document(s)`,
      employee.documents
    );
    alert(`${this.getFullName(employee)} a ${totalDocs} document(s)`);
  }

  // Méthodes trackBy pour optimiser les performances
  trackByEmployeeId(index: number, employee: Employee): string {
    return employee.id;
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

  // Ajouter un nouvel employé
  addNewEmployee(): void {
    // Créer un employé vide pour le modal de création
    const newEmployee: Employee = {
      id: '', // L'ID sera généré par le service
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      workSector: WorkSector.IT,
      contractType: ContractType.CDI,
      hireDate: new Date(),
      profilePicture: '',
      salary: 0,
      isActive: true,
      leaveBalance: {
        vacation: 25,
        sick: 10,
        personal: 5,
        totalDaysUsed: 0,
        totalDaysRemaining: 40,
      },
      documents: [],
    };

    const dialogRef = this.dialog.open(EditEmployeeModalComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: {
        employee: newEmployee,
        isNewEmployee: true,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Générer un nouvel ID
        const newId = 'emp-' + Date.now();
        result.id = newId;

        // Ajouter l'employé à la liste locale (simulation)
        this.employees.unshift(result);
        this.totalEmployees++;

        // Recharger la première page pour voir le nouvel employé
        if (this.currentPage !== 1) {
          this.currentPage = 1;
        }
        this.loadEmployees();

        console.log('Nouvel employé ajouté:', result);
      }
    });
  }
}
