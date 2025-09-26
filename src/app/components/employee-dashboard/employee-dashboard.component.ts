import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-dashboard.component.html',
  styleUrl: './employee-dashboard.component.scss',
})
export class EmployeeDashboardComponent implements OnInit {
  employees: Employee[] = [];
  originalEmployees: Employee[] = []; // Liste complète non filtrée
  selectedRows: Set<number> = new Set();
  expandedRows: Set<number> = new Set();
  expandedActionRows: Set<number> = new Set();
  selectedEmployee: Employee | null = null;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 5;
  totalEmployees: number = 0;
  totalPages: number = 0;
  pages: number[] = [];
  loading: boolean = false;
  availablePageSizes: number[] = [];
  defaultPageSizes: number[] = [5, 10, 15, 20];

  // Recherche et auto-complétion
  searchQuery: string = '';
  showSearchSuggestions: boolean = false;
  searchSuggestions: Employee[] = [];

  // Filtres
  showFilters: boolean = false;
  selectedFilters = {
    departments: [] as string[],
    contractTypes: [] as ContractType[],
    workSectors: [] as WorkSector[],
    activeOnly: false,
    contractExpiringSoon: false,
  };

  // Options de filtrage disponibles
  availableDepartments: string[] = [];
  availableContractTypes: ContractType[] = Object.values(ContractType);
  availableWorkSectors: WorkSector[] = Object.values(WorkSector);

  // Compteurs
  activeFiltersCount: number = 0;
  filteredEmployeesCount: number = 0;

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

    // Charger tous les employés pour les filtres et la recherche
    this.employeeService.getEmployeesWithPagination(1, 1000).subscribe({
      next: (allEmployeesResponse: EmployeePaginationResponse) => {
        this.originalEmployees = allEmployeesResponse.employees;
        this.loadAvailableFilterOptions();

        // Charger la page courante
        this.employeeService
          .getEmployeesWithPagination(this.currentPage, this.pageSize)
          .subscribe({
            next: (response: EmployeePaginationResponse) => {
              this.employees = response.employees;
              this.totalEmployees = response.total;
              this.totalPages = Math.ceil(this.totalEmployees / this.pageSize);
              this.filteredEmployeesCount = this.totalEmployees;
              this.calculateAvailablePageSizes();
              this.updatePageNumbers();
              this.loading = false;
              this.selectedRows.clear();
              this.expandedRows.clear();
              this.expandedActionRows.clear();
              this.selectedEmployee = null;
            },
            error: (error) => {
              console.error('Erreur lors du chargement des employés:', error);
              this.loading = false;
            },
          });
      },
      error: (error) => {
        console.error('Erreur lors du chargement de tous les employés:', error);
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

  calculateAvailablePageSizes(): void {
    this.availablePageSizes = [];

    // Toujours inclure la taille actuelle si elle n'est pas dans les défauts
    const sizesToCheck = [...this.defaultPageSizes];
    if (!sizesToCheck.includes(this.pageSize)) {
      sizesToCheck.push(this.pageSize);
      sizesToCheck.sort((a, b) => a - b);
    }

    for (const size of sizesToCheck) {
      // Inclure la taille si :
      // 1. Il y a au moins 'size' employés, OU
      // 2. C'est la taille actuelle (pour éviter de la supprimer en cours d'utilisation), OU
      // 3. Il y a au moins 1 employé et la taille est la plus petite disponible
      if (
        this.totalEmployees >= size ||
        size === this.pageSize ||
        (this.totalEmployees > 0 && size === Math.min(...sizesToCheck))
      ) {
        this.availablePageSizes.push(size);
      }
    }

    // Si nous avons exactement le nombre total d'employés, l'ajouter comme option
    if (
      this.totalEmployees > 0 &&
      this.totalEmployees <= 50 && // Limiter pour éviter des pages trop grandes
      !this.availablePageSizes.includes(this.totalEmployees) &&
      this.totalEmployees !== this.pageSize
    ) {
      this.availablePageSizes.push(this.totalEmployees);
      this.availablePageSizes.sort((a, b) => a - b);
    }

    // S'assurer qu'il y a au moins une option
    if (this.availablePageSizes.length === 0) {
      this.availablePageSizes = [Math.min(5, this.totalEmployees || 5)];
    }
  }

  onPageSizeChange(): void {
    // Calculer la nouvelle page pour garder approximativement le même élément visible
    const firstItemIndex = (this.currentPage - 1) * this.pageSize;
    this.currentPage = Math.floor(firstItemIndex / this.pageSize) + 1;

    // Recalculer la pagination
    this.totalPages = Math.ceil(this.totalEmployees / this.pageSize);

    // S'assurer que la page courante est valide
    if (this.currentPage > this.totalPages) {
      this.currentPage = Math.max(1, this.totalPages);
    }

    this.updatePageNumbers();

    // Recharger les données avec la nouvelle taille de page
    if (this.searchQuery || this.activeFiltersCount > 0) {
      this.applySearchAndFilters();
    } else {
      this.loadEmployees();
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
    this.expandedActionRows.clear();

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

  toggleActionMenu(index: number, event: Event): void {
    event.stopPropagation();

    if (this.expandedActionRows.has(index)) {
      this.expandedActionRows.delete(index);
    } else {
      // Fermer tous les autres menus d'actions ouverts
      this.expandedActionRows.clear();
      // Ouvrir le menu pour cette ligne
      this.expandedActionRows.add(index);
    }
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

  // ============= MÉTHODES DE RECHERCHE ET AUTO-COMPLÉTION =============

  onSearchInput(event: any): void {
    const query = event.target.value;
    const queryLowerCase = query.toLowerCase();
    this.searchQuery = query;

    if (query.length >= 2) {
      this.searchSuggestions = this.originalEmployees
        .filter(
          (employee) =>
            `${employee.firstName} ${employee.lastName}`
              .toLowerCase()
              .includes(queryLowerCase) ||
            employee.email.toLowerCase().includes(queryLowerCase) ||
            employee.department.toLowerCase().includes(queryLowerCase) ||
            employee.position.toLowerCase().includes(queryLowerCase)
        )
        .slice(0, 5); // Limiter à 5 suggestions
      this.showSearchSuggestions = true;
    } else {
      this.searchSuggestions = [];
      this.showSearchSuggestions = false;
      if (query.length === 0) {
        this.applyFilters(); // Réappliquer les filtres quand on efface la recherche
      }
    }
  }

  selectSuggestion(employee: Employee): void {
    this.searchQuery = `${employee.firstName} ${employee.lastName}`;
    this.showSearchSuggestions = false;
    this.applySearchAndFilters();
  }

  hideSearchSuggestions(): void {
    // Délai pour permettre au clic sur une suggestion de fonctionner
    setTimeout(() => {
      this.showSearchSuggestions = false;
    }, 200);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchSuggestions = [];
    this.showSearchSuggestions = false;
    this.applyFilters();
  }

  // ============= MÉTHODES DE FILTRAGE =============

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  closeFilters(): void {
    this.showFilters = false;
  }

  onDepartmentFilterChange(department: string, event: any): void {
    if (event.target.checked) {
      this.selectedFilters.departments.push(department);
    } else {
      const index = this.selectedFilters.departments.indexOf(department);
      if (index > -1) {
        this.selectedFilters.departments.splice(index, 1);
      }
    }
    this.updateActiveFiltersCount();
  }

  onContractTypeFilterChange(contractType: ContractType, event: any): void {
    if (event.target.checked) {
      this.selectedFilters.contractTypes.push(contractType);
    } else {
      const index = this.selectedFilters.contractTypes.indexOf(contractType);
      if (index > -1) {
        this.selectedFilters.contractTypes.splice(index, 1);
      }
    }
    this.updateActiveFiltersCount();
  }

  onWorkSectorFilterChange(workSector: WorkSector, event: any): void {
    if (event.target.checked) {
      this.selectedFilters.workSectors.push(workSector);
    } else {
      const index = this.selectedFilters.workSectors.indexOf(workSector);
      if (index > -1) {
        this.selectedFilters.workSectors.splice(index, 1);
      }
    }
    this.updateActiveFiltersCount();
  }

  onActiveFilterChange(event: any): void {
    this.selectedFilters.activeOnly = event.target.checked;
    this.updateActiveFiltersCount();
  }

  onExpiringContractFilterChange(event: any): void {
    this.selectedFilters.contractExpiringSoon = event.target.checked;
    this.updateActiveFiltersCount();
  }

  updateActiveFiltersCount(): void {
    this.activeFiltersCount =
      this.selectedFilters.departments.length +
      this.selectedFilters.contractTypes.length +
      this.selectedFilters.workSectors.length +
      (this.selectedFilters.activeOnly ? 1 : 0) +
      (this.selectedFilters.contractExpiringSoon ? 1 : 0);
  }

  clearAllFilters(): void {
    this.selectedFilters = {
      departments: [],
      contractTypes: [],
      workSectors: [],
      activeOnly: false,
      contractExpiringSoon: false,
    };
    this.activeFiltersCount = 0;
    this.applyFilters();
  }

  applyFilters(): void {
    this.applySearchAndFilters();
    // Fermer le panneau de filtres après application
    this.showFilters = false;
  }

  private applySearchAndFilters(): void {
    let filteredEmployees = [...this.originalEmployees];

    // Appliquer la recherche
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filteredEmployees = filteredEmployees.filter(
        (employee) =>
          `${employee.firstName} ${employee.lastName}`
            .toLowerCase()
            .includes(query) ||
          employee.email.toLowerCase().includes(query) ||
          employee.department.toLowerCase().includes(query) ||
          employee.position.toLowerCase().includes(query)
      );
    }

    // Appliquer les filtres de département
    if (this.selectedFilters.departments.length > 0) {
      filteredEmployees = filteredEmployees.filter((employee) =>
        this.selectedFilters.departments.includes(employee.department)
      );
    }

    // Appliquer les filtres de type de contrat
    if (this.selectedFilters.contractTypes.length > 0) {
      filteredEmployees = filteredEmployees.filter(
        (employee) =>
          employee.contractType &&
          this.selectedFilters.contractTypes.includes(employee.contractType)
      );
    }

    // Appliquer les filtres de secteur d'activité
    if (this.selectedFilters.workSectors.length > 0) {
      filteredEmployees = filteredEmployees.filter(
        (employee) =>
          employee.workSector &&
          this.selectedFilters.workSectors.includes(employee.workSector)
      );
    }

    // Appliquer le filtre employés actifs
    if (this.selectedFilters.activeOnly) {
      filteredEmployees = filteredEmployees.filter(
        (employee) => employee.isActive
      );
    }

    // Appliquer le filtre contrats expirant bientôt
    if (this.selectedFilters.contractExpiringSoon) {
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

      filteredEmployees = filteredEmployees.filter(
        (employee) =>
          employee.contractEndDate &&
          new Date(employee.contractEndDate) <= threeMonthsFromNow
      );
    }

    // Mettre à jour les résultats
    this.filteredEmployeesCount = filteredEmployees.length;

    // Simuler la pagination avec les résultats filtrés
    this.totalEmployees = filteredEmployees.length;
    this.totalPages = Math.ceil(this.totalEmployees / this.pageSize);
    this.calculateAvailablePageSizes();

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.employees = filteredEmployees.slice(startIndex, endIndex);

    this.updatePageNumbers();

    // Réinitialiser les sélections
    this.selectedRows.clear();
    this.expandedRows.clear();
    this.expandedActionRows.clear();
  }

  private loadAvailableFilterOptions(): void {
    // Extraire les départements uniques
    this.availableDepartments = [
      ...new Set(this.originalEmployees.map((emp) => emp.department)),
    ];
  }

  getWorkSectorDisplayName(sector: WorkSector): string {
    const sectorNames: { [key in WorkSector]: string } = {
      [WorkSector.IT]: 'Informatique',
      [WorkSector.RH]: 'Ressources Humaines',
      [WorkSector.FINANCE]: 'Finance',
      [WorkSector.MARKETING]: 'Marketing',
      [WorkSector.VENTE]: 'Vente',
      [WorkSector.PRODUCTION]: 'Production',
      [WorkSector.QUALITE]: 'Qualité',
      [WorkSector.LOGISTIQUE]: 'Logistique',
      [WorkSector.JURIDIQUE]: 'Juridique',
      [WorkSector.DIRECTION]: 'Direction',
    };
    return sectorNames[sector] || sector;
  }
}
