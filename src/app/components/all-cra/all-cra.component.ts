import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  GenericCalendarComponent,
  CalendarConfig,
  CalendarDay,
  EmployeeCalendar,
  CalendarCellClickEvent,
} from '../generic-calendar/generic-calendar.component';
import { CraService } from '../../services/cra.service';
import { EmployeeService } from '../../services/employee.service';
import {
  CraEntry,
  CraLeaveType,
  CRA_LEAVE_TYPE_LABELS,
} from '../../models/cra.model';
import { Employee } from '../../models/employee.model';
import { CRA_CALENDAR_CONFIG } from '../../config/calendar-configs';

@Component({
  selector: 'app-all-cra',
  imports: [CommonModule, FormsModule, GenericCalendarComponent],
  templateUrl: './all-cra.component.html',
  styleUrl: './all-cra.component.scss',
})
export class AllCraComponent implements OnInit {
  // Configuration du calendrier
  calendarConfig: CalendarConfig = {
    ...CRA_CALENDAR_CONFIG,
    viewMode: 'month',
    showExportButtons: true,
  };

  // Données des employés et leurs calendriers
  allEmployees: Employee[] = [];
  employees: Employee[] = [];
  employeeCalendars: EmployeeCalendar[] = [];
  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth() + 1;

  // Pagination des employés
  currentPage: number = 1;
  pageSize: number = 5;
  totalEmployees: number = 0;
  totalPages: number = 0;
  pages: number[] = [];
  loading: boolean = false;
  availablePageSizes: number[] = [];
  defaultPageSizes: number[] = [3, 5, 10, 15];

  // Cache des données CRA par employé
  private craDataCache = new Map<string, CraEntry[]>();
  private holidaysCache = new Map<number, Date[]>();

  // Recherche et auto-complétion
  searchQuery: string = '';
  showSearchSuggestions: boolean = false;
  searchSuggestions: Employee[] = [];

  // Filtres
  showFilters: boolean = false;
  selectedFilters = {
    departments: [] as string[],
    statuses: [] as string[],
  };

  // Options de filtrage disponibles
  availableDepartments: string[] = [];
  availableStatuses: { value: string; label: string }[] = [
    { value: 'Rempli', label: 'CRA Complets' },
    { value: 'En cours', label: 'CRA En cours' },
    { value: 'Vide', label: 'CRA Vides' },
  ];

  // Compteurs
  activeFiltersCount: number = 0;
  filteredEmployeesCount: number = 0;

  // Références pour les templates
  CraLeaveType = CraLeaveType;
  CRA_LEAVE_TYPE_LABELS = CRA_LEAVE_TYPE_LABELS;

  constructor(
    private craService: CraService,
    private employeeService: EmployeeService
  ) {}

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.loading = true;

    // Charger tous les employés d'abord
    this.employeeService.getEmployeesWithPagination(1, 1000).subscribe({
      next: (allEmployeesResponse) => {
        this.allEmployees = allEmployeesResponse.employees;
        this.loadAvailableFilterOptions();

        // Appliquer les filtres et pagination
        this.applyFiltersAndPagination();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des employés:', error);
        this.loading = false;
      },
    });
  }

  private loadAvailableFilterOptions(): void {
    // Extraire les départements disponibles
    this.availableDepartments = [
      ...new Set(this.allEmployees.map((emp) => emp.department)),
    ];
  }

  private applyFiltersAndPagination(): void {
    let filteredEmployees = [...this.allEmployees];

    // Appliquer la recherche
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filteredEmployees = filteredEmployees.filter(
        (employee) =>
          `${employee.firstName} ${employee.lastName}`
            .toLowerCase()
            .includes(query) ||
          employee.email.toLowerCase().includes(query) ||
          employee.department.toLowerCase().includes(query)
      );
    }

    // Appliquer les filtres de département
    if (this.selectedFilters.departments.length > 0) {
      filteredEmployees = filteredEmployees.filter((employee) =>
        this.selectedFilters.departments.includes(employee.department)
      );
    }

    // Appliquer les filtres de statut
    if (this.selectedFilters.statuses.length > 0) {
      // Logique de filtrage par statut CRA (à implémenter selon les besoins)
    }

    // Mettre à jour les compteurs
    this.totalEmployees = filteredEmployees.length;
    this.filteredEmployeesCount = this.totalEmployees;
    this.totalPages = Math.ceil(this.totalEmployees / this.pageSize);
    this.calculateAvailablePageSizes();
    this.updatePageNumbers();

    // Appliquer la pagination
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.employees = filteredEmployees.slice(startIndex, endIndex);

    // Générer les calendriers pour les employés de la page courante
    this.generateEmployeeCalendars();
  }

  private generateEmployeeCalendars(): void {
    this.employeeCalendars = [];
    let pendingRequests = 0;

    if (this.employees.length === 0) {
      this.loading = false;
      return;
    }

    this.employees.forEach((employee) => {
      // Vérifier le cache d'abord
      let craEntries = this.craDataCache.get(employee.id);

      if (craEntries) {
        // Utiliser les données du cache
        const calendar = this.generateCalendarForEmployee(employee, craEntries);
        this.employeeCalendars.push(calendar);

        // Vérifier si c'est le dernier employé traité
        if (this.employeeCalendars.length === this.employees.length) {
          this.loading = false;
        }
      } else {
        // Incrémenter le compteur de requêtes en attente
        pendingRequests++;

        // Charger les données CRA pour cet employé
        this.craService
          .getCraEntries(employee.id, this.selectedYear, this.selectedMonth)
          .subscribe({
            next: (entries) => {
              // Mettre en cache
              this.craDataCache.set(employee.id, entries);

              const calendar = this.generateCalendarForEmployee(
                employee,
                entries
              );
              this.employeeCalendars.push(calendar);

              // Décrémenter le compteur et vérifier si terminé
              pendingRequests--;
              if (pendingRequests === 0) {
                this.loading = false;
              }
            },
            error: (error) => {
              console.error(
                `Erreur lors du chargement des CRAs pour l'employé ${employee.id}:`,
                error
              );
              // Créer un calendrier vide en cas d'erreur
              const calendar = this.generateCalendarForEmployee(employee, []);
              this.employeeCalendars.push(calendar);

              // Décrémenter le compteur et vérifier si terminé
              pendingRequests--;
              if (pendingRequests === 0) {
                this.loading = false;
              }
            },
          });
      }
    });

    // Si tous les employés sont dans le cache, on a déjà fini
    if (
      pendingRequests === 0 &&
      this.employeeCalendars.length === this.employees.length
    ) {
      this.loading = false;
    }
  }

  private generateCalendarForEmployee(
    employee: Employee,
    craEntries: CraEntry[]
  ): EmployeeCalendar {
    const days: CalendarDay[] = [];
    const startDate = new Date(this.selectedYear, this.selectedMonth - 1, 1);
    const endDate = new Date(this.selectedYear, this.selectedMonth, 0);

    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const entry = craEntries.find(
        (e) => new Date(e.date).toISOString().split('T')[0] === dateKey
      );

      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = this.isHoliday(currentDate);

      let status: string;
      let value: any = undefined;

      if (isHoliday) {
        status = 'holiday';
      } else if (isWeekend) {
        status = 'weekend';
      } else if (entry) {
        if (entry.isLeaveType) {
          status = entry.value as string;
          value = entry.value;
        } else {
          const numValue = entry.value as number;
          if (numValue === 0.5) {
            status = 'partial';
          } else if (numValue === 1) {
            status = 'full';
          } else {
            status = 'empty';
          }
          value = numValue;
        }
      } else {
        status = 'empty';
      }

      days.push({
        date: new Date(currentDate),
        dayOfWeek,
        isWeekend,
        isHoliday,
        status,
        value,
        isEditable: false, // Mode lecture seule
        data: entry,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      employee,
      days,
    };
  }

  private isHoliday(date: Date): boolean {
    const year = date.getFullYear();
    const holidays = this.getHolidaysForYear(year);

    return holidays.some(
      (holiday) =>
        holiday.getDate() === date.getDate() &&
        holiday.getMonth() === date.getMonth() &&
        holiday.getFullYear() === date.getFullYear()
    );
  }

  private getHolidaysForYear(year: number): Date[] {
    if (this.holidaysCache.has(year)) {
      return this.holidaysCache.get(year)!;
    }

    const holidays: Date[] = [];
    holidays.push(new Date(year, 0, 1)); // Nouvel An
    holidays.push(new Date(year, 4, 1)); // Fête du travail
    holidays.push(new Date(year, 4, 8)); // Victoire 1945
    holidays.push(new Date(year, 6, 14)); // Fête nationale
    holidays.push(new Date(year, 7, 15)); // Assomption
    holidays.push(new Date(year, 10, 1)); // Toussaint
    holidays.push(new Date(year, 10, 11)); // Armistice
    holidays.push(new Date(year, 11, 25)); // Noël

    // Calcul de Pâques et jours fériés mobiles
    const easter = this.calculateEaster(year);
    holidays.push(new Date(easter.getTime() + 24 * 60 * 60 * 1000)); // Lundi de Pâques
    holidays.push(new Date(easter.getTime() + 39 * 24 * 60 * 60 * 1000)); // Ascension
    holidays.push(new Date(easter.getTime() + 50 * 24 * 60 * 60 * 1000)); // Lundi de Pentecôte

    this.holidaysCache.set(year, holidays);
    return holidays;
  }

  private calculateEaster(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    return new Date(year, month, day);
  }

  // Méthodes de pagination
  updatePageNumbers(): void {
    this.pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      this.pages.push(i);
    }
  }

  calculateAvailablePageSizes(): void {
    this.availablePageSizes = [];

    const sizesToCheck = [...this.defaultPageSizes];
    if (!sizesToCheck.includes(this.pageSize)) {
      sizesToCheck.push(this.pageSize);
      sizesToCheck.sort((a, b) => a - b);
    }

    for (const size of sizesToCheck) {
      if (
        this.totalEmployees >= size ||
        size === this.pageSize ||
        (this.totalEmployees > 0 && size === Math.min(...sizesToCheck))
      ) {
        this.availablePageSizes.push(size);
      }
    }

    if (this.availablePageSizes.length === 0) {
      this.availablePageSizes = [Math.min(5, this.totalEmployees || 5)];
    }
  }

  onPageSizeChange(): void {
    const firstItemIndex = (this.currentPage - 1) * this.pageSize;
    this.currentPage = Math.floor(firstItemIndex / this.pageSize) + 1;
    this.totalPages = Math.ceil(this.totalEmployees / this.pageSize);

    if (this.currentPage > this.totalPages) {
      this.currentPage = Math.max(1, this.totalPages);
    }

    this.updatePageNumbers();
    this.applyFiltersAndPagination();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.applyFiltersAndPagination();
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

  // Méthodes de recherche
  onSearchInput(event: any): void {
    const query = event.target.value;
    this.searchQuery = query;

    if (query.length >= 2) {
      this.searchSuggestions = this.allEmployees
        .filter(
          (employee) =>
            `${employee.firstName} ${employee.lastName}`
              .toLowerCase()
              .includes(query.toLowerCase()) ||
            employee.email.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 5);
      this.showSearchSuggestions = true;
    } else {
      this.searchSuggestions = [];
      this.showSearchSuggestions = false;
      if (query.length === 0) {
        this.applySearchAndFilters();
      }
    }
  }

  selectSuggestion(employee: Employee): void {
    this.searchQuery = `${employee.firstName} ${employee.lastName}`;
    this.showSearchSuggestions = false;
    this.applySearchAndFilters();
  }

  hideSearchSuggestions(): void {
    setTimeout(() => {
      this.showSearchSuggestions = false;
    }, 200);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchSuggestions = [];
    this.showSearchSuggestions = false;
    this.applySearchAndFilters();
  }

  // Méthodes de filtrage
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

  onStatusFilterChange(status: string, event: any): void {
    if (event.target.checked) {
      this.selectedFilters.statuses.push(status);
    } else {
      const index = this.selectedFilters.statuses.indexOf(status);
      if (index > -1) {
        this.selectedFilters.statuses.splice(index, 1);
      }
    }
    this.updateActiveFiltersCount();
  }

  updateActiveFiltersCount(): void {
    this.activeFiltersCount =
      this.selectedFilters.departments.length +
      this.selectedFilters.statuses.length;
  }

  clearAllFilters(): void {
    this.selectedFilters = {
      departments: [],
      statuses: [],
    };
    this.activeFiltersCount = 0;
    this.applyFilters();
  }

  applyFilters(): void {
    this.applySearchAndFilters();
    this.showFilters = false;
  }

  applySearchAndFilters(): void {
    this.currentPage = 1;
    this.craDataCache.clear(); // Vider le cache lors des changements
    this.applyFiltersAndPagination();
  }

  // Événements du calendrier (en mode lecture seule, on ne fait rien)
  onCellClick(event: CalendarCellClickEvent) {
    // Mode lecture seule - ne rien faire
  }

  onYearChange(year: number) {
    this.selectedYear = year;
    this.craDataCache.clear(); // Vider le cache lors des changements
    this.applyFiltersAndPagination();
  }

  onMonthChange(month: number) {
    this.selectedMonth = month;
    this.craDataCache.clear(); // Vider le cache lors des changements
    this.applyFiltersAndPagination();
  }

  onManageSelection(event: any) {
    // Mode lecture seule - ne rien faire
  }

  // Obtenir le calendrier d'un employé spécifique
  getEmployeeCalendar(employee: Employee): EmployeeCalendar {
    return (
      this.employeeCalendars.find(
        (calendar) => calendar.employee.id === employee.id
      ) || {
        employee,
        days: [],
      }
    );
  }

  // Méthodes utilitaires
  getEmployeeName(employee: Employee): string {
    return `${employee.firstName} ${employee.lastName}`;
  }

  getMonthName(month: number): string {
    const months = [
      'Janvier',
      'Février',
      'Mars',
      'Avril',
      'Mai',
      'Juin',
      'Juillet',
      'Août',
      'Septembre',
      'Octobre',
      'Novembre',
      'Décembre',
    ];
    return months[month - 1] || month.toString();
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
}
