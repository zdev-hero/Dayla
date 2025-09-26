import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import {
  GenericCalendarComponent,
  CalendarConfig,
  CalendarDay as GenericCalendarDay,
  EmployeeCalendar as GenericEmployeeCalendar,
  CalendarCellClickEvent,
} from '../generic-calendar/generic-calendar.component';
import { YearPickerComponent } from '../year-picker/year-picker.component';
import { LeaveManagementService } from '../../services/leave-management.service';
import { EmployeeService } from '../../services/employee.service';
import { Employee } from '../../models/employee.model';
import {
  LeaveRequest,
  LeaveType,
  LeaveStatus,
  LEAVE_TYPE_LABELS,
  LEAVE_STATUS_LABELS,
} from '../../models/leave-request.model';
import { LEAVE_CALENDAR_CONFIG } from '../../config/calendar-configs';

// Interface locale pour étendre CalendarDay avec les propriétés spécifiques aux congés
interface LeaveCalendarDay extends GenericCalendarDay {
  leaveRequest?: LeaveRequest;
  isHalfDay?: boolean;
  halfDayPeriod?: 'morning' | 'afternoon';
}

interface LeaveEmployeeCalendar extends GenericEmployeeCalendar {
  days: LeaveCalendarDay[];
}

@Component({
  selector: 'app-leave-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GenericCalendarComponent,
    YearPickerComponent,
  ],
  templateUrl: './leave-calendar.component.html',
  styleUrls: ['./leave-calendar.component.scss'],
})
export class LeaveCalendarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Configuration du calendrier générique
  calendarConfig: CalendarConfig = {
    ...LEAVE_CALENDAR_CONFIG,
    showExportButtons: false, // Pas de boutons d'export dans leave-calendar
  };

  // Données
  selectedYear = new Date().getFullYear();
  employees: Employee[] = [];
  leaveRequests: LeaveRequest[] = [];
  employeeCalendars: LeaveEmployeeCalendar[] = [];
  filteredEmployeeCalendars: LeaveEmployeeCalendar[] = [];

  // Recherche et filtres
  employeeSearchTerm = '';
  filteredEmployees: Employee[] = [];
  selectedTeam = '';
  selectedEmployee = '';
  selectedLeaveType = '';
  selectedStatus = '';

  // Cache pour les jours fériés par année
  private holidaysCache = new Map<number, Date[]>();
  teams: string[] = [];
  leaveTypes = Object.values(LeaveType);
  leaveStatuses = Object.values(LeaveStatus);

  // Vue
  viewMode: 'year' | 'quarter' | 'month' = 'year';
  selectedQuarter = 1;
  selectedMonth = new Date().getMonth() + 1;

  // Popup de détails
  selectedLeaveRequest?: LeaveRequest;
  showDetailsPopup = false;
  rejectionReason = '';
  isEditingLeave = false;
  editableLeaveRequest?: LeaveRequest;
  tempRejectionReason = '';

  // Sélection multiple
  selectedCells: Set<string> = new Set();
  selectedDays: Array<{ day: LeaveCalendarDay; employee: Employee }> = [];
  showBulkManagementPopup = false;
  bulkRejectionReason = '';
  bulkLeaveType: LeaveType = LeaveType.VACATION;
  bulkReason = '';

  // Getter pour le mode multi-sélection
  get isMultiSelectMode(): boolean {
    return this.selectedCells.size > 0;
  }

  // Mois pour l'affichage
  months = [
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

  constructor(
    private leaveService: LeaveManagementService,
    private employeeService: EmployeeService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.updateCalendarConfig();
    this.loadData();
  }

  private updateCalendarConfig() {
    this.calendarConfig = {
      ...LEAVE_CALENDAR_CONFIG,
      viewMode: this.viewMode as 'year' | 'month',
      showExportButtons: false, // Pas de boutons d'export dans leave-calendar
    };
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadData() {
    try {
      this.employeeService
        .getEmployees()
        .pipe(takeUntil(this.destroy$))
        .subscribe((employees) => {
          this.employees = employees;
          this.teams = [...new Set(employees.map((emp) => emp.department))];
          this.generateCalendars();
        });

      this.leaveService
        .getLeaveRequests()
        .pipe(takeUntil(this.destroy$))
        .subscribe((requests) => {
          this.leaveRequests = requests;
          this.generateCalendars();
        });
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  }

  generateCalendars() {
    if (!this.employees.length) return;

    this.employeeCalendars = this.employees.map((employee) => ({
      employee,
      days: this.generateEmployeeDays(employee),
    }));

    this.applyFilters();
  }

  generateEmployeeDays(employee: Employee): LeaveCalendarDay[] {
    const days: LeaveCalendarDay[] = [];
    let startDate: Date;
    let endDate: Date;

    // Générer les dates en fonction du mode de vue
    if (this.viewMode === 'month') {
      startDate = new Date(this.selectedYear, this.selectedMonth - 1, 1);
      endDate = new Date(this.selectedYear, this.selectedMonth, 0);
    } else if (this.viewMode === 'quarter') {
      const quarterStartMonth = (this.selectedQuarter - 1) * 3;
      startDate = new Date(this.selectedYear, quarterStartMonth, 1);
      endDate = new Date(this.selectedYear, quarterStartMonth + 3, 0);
    } else {
      // Vue année par défaut
      startDate = new Date(this.selectedYear, 0, 1);
      endDate = new Date(this.selectedYear, 11, 31);
    }

    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = this.isHoliday(currentDate);

      const leaveRequest = this.findLeaveRequestForDate(
        employee.id,
        currentDate
      );

      let status: string = 'worked';

      if (isHoliday) {
        status = 'holiday';
      } else if (isWeekend) {
        status = 'weekend';
      } else if (leaveRequest) {
        switch (leaveRequest.status) {
          case LeaveStatus.APPROVED:
            status =
              leaveRequest.leaveType === LeaveType.PERSONAL
                ? 'rtt'
                : 'approved';
            break;
          case LeaveStatus.PENDING:
            status = 'pending';
            break;
          case LeaveStatus.REJECTED:
            status = 'rejected';
            break;
        }
      }

      days.push({
        date: new Date(currentDate),
        dayOfWeek,
        isWeekend,
        isHoliday,
        leaveRequest,
        status,
        isEditable: !isWeekend && !isHoliday,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  }

  findLeaveRequestForDate(
    employeeId: string,
    date: Date
  ): LeaveRequest | undefined {
    return this.leaveRequests.find(
      (request) =>
        request.employeeId === employeeId &&
        date >= new Date(request.startDate) &&
        date <= new Date(request.endDate)
    );
  }

  isHoliday(date: Date): boolean {
    const year = date.getFullYear();
    const holidays = this.getHolidaysForYear(year);

    return holidays.some(
      (holiday) =>
        holiday.getDate() === date.getDate() &&
        holiday.getMonth() === date.getMonth() &&
        holiday.getFullYear() === date.getFullYear()
    );
  }

  /**
   * Calcule les jours fériés français pour une année donnée
   */
  private getHolidaysForYear(year: number): Date[] {
    // Vérifier le cache d'abord
    if (this.holidaysCache.has(year)) {
      return this.holidaysCache.get(year)!;
    }

    const holidays: Date[] = [];

    // Jours fériés fixes
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

    // Mettre en cache et retourner
    this.holidaysCache.set(year, holidays);
    return holidays;
  }

  /**
   * Calcule la date de Pâques pour une année donnée
   * Utilise l'algorithme de calcul de Pâques
   */
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
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // -1 car les mois sont indexés à partir de 0
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    return new Date(year, month, day);
  }

  applyFilters() {
    let filtered = [...this.employeeCalendars];

    if (this.employeeSearchTerm.trim()) {
      const searchTerm = this.employeeSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (ec) =>
          `${ec.employee.firstName} ${ec.employee.lastName}`
            .toLowerCase()
            .includes(searchTerm) ||
          ec.employee.department.toLowerCase().includes(searchTerm) ||
          ec.employee.position.toLowerCase().includes(searchTerm)
      );
    }

    if (this.selectedTeam) {
      filtered = filtered.filter(
        (ec) => ec.employee.department === this.selectedTeam
      );
    }

    if (this.selectedEmployee) {
      filtered = filtered.filter(
        (ec) => ec.employee.id === this.selectedEmployee
      );
    }

    if (this.selectedLeaveType) {
      filtered = filtered.filter((ec) =>
        ec.days.some(
          (day) =>
            day.leaveRequest &&
            day.leaveRequest.leaveType === this.selectedLeaveType
        )
      );
    }

    if (this.selectedStatus) {
      filtered = filtered.filter((ec) =>
        ec.days.some(
          (day) =>
            day.leaveRequest && day.leaveRequest.status === this.selectedStatus
        )
      );
    }

    this.filteredEmployeeCalendars = filtered;
  }

  // Événements du calendrier générique
  onCellClick(event: CalendarCellClickEvent) {
    const day = event.day as LeaveCalendarDay;

    if (
      day.leaveRequest &&
      (day.status === 'pending' ||
        day.status === 'approved' ||
        day.status === 'rejected' ||
        day.status === 'rtt')
    ) {
      this.selectedLeaveRequest = day.leaveRequest;
      this.showDetailsPopup = true;
    } else if (day.status === 'worked') {
      // Créer une demande temporaire pour les cellules vides
      this.selectedLeaveRequest = {
        id: 'temp',
        employeeId: event.employee.id,
        employee: event.employee,
        leaveType: LeaveType.VACATION,
        startDate: day.date,
        endDate: day.date,
        totalDays: 1,
        reason: '',
        status: LeaveStatus.PENDING,
        submittedDate: new Date(),
      };
      this.selectedEmployee = event.employee.id;
      this.isEditingLeave = true;
      this.showDetailsPopup = true;
    }
  }

  onEmployeeSearch(searchTerm: string) {
    this.employeeSearchTerm = searchTerm;
    this.onEmployeeSearchInternal();
  }

  onManageSelection(event: {
    selectedCells: Set<string>;
    selectedData: {
      employee: Employee;
      day: GenericCalendarDay;
      dayIndex: number;
    }[];
  }) {
    // Convertir les données sélectionnées au format attendu
    this.selectedDays = event.selectedData.map((item) => ({
      employee: item.employee,
      day: item.day as LeaveCalendarDay,
    }));

    // Ouvrir la popup de gestion groupée
    this.openBulkManagementPopup();
  }

  onYearChange(year: number) {
    this.selectedYear = year;
    setTimeout(() => {
      this.generateCalendars();
    }, 0);
  }

  onMonthChange(month: number) {
    this.selectedMonth = month;
    setTimeout(() => {
      this.generateCalendars();
    }, 0);
  }

  // Méthodes pour la recherche d'employés (interne, gardée de l'ancien code)
  onEmployeeSearchInternal() {
    if (!this.employeeSearchTerm.trim()) {
      this.filteredEmployees = [];
      return;
    }

    const searchTerm = this.employeeSearchTerm.toLowerCase();
    this.filteredEmployees = this.employees
      .filter(
        (employee) =>
          `${employee.firstName} ${employee.lastName}`
            .toLowerCase()
            .includes(searchTerm) ||
          employee.department.toLowerCase().includes(searchTerm) ||
          employee.position.toLowerCase().includes(searchTerm)
      )
      .slice(0, 10);
  }

  selectEmployee(employee: Employee) {
    this.selectedEmployee = employee.id;
    this.employeeSearchTerm = `${employee.firstName} ${employee.lastName}`;
    this.filteredEmployees = [];
    this.onFilterChange();
  }

  clearEmployeeSearch() {
    this.employeeSearchTerm = '';
    this.selectedEmployee = '';
    this.filteredEmployees = [];
    this.onFilterChange();
  }

  onFilterChange() {
    this.updateCalendarConfig();
    setTimeout(() => {
      this.generateCalendars();
    }, 0);
  }

  // Gestion des popups (gardée de l'ancien code)
  closeDetailsPopup() {
    this.showDetailsPopup = false;
    this.selectedLeaveRequest = undefined;
    this.rejectionReason = '';
    this.isEditingLeave = false;
    this.editableLeaveRequest = undefined;
    this.tempRejectionReason = '';
  }

  approveLeaveRequest() {
    if (!this.selectedLeaveRequest) return;

    this.leaveService
      .approveLeaveRequest(this.selectedLeaveRequest.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedRequest) => {
          const index = this.leaveRequests.findIndex(
            (r) => r.id === updatedRequest.id
          );
          if (index !== -1) {
            this.leaveRequests[index] = updatedRequest;
          }
          this.generateCalendars();
          this.closeDetailsPopup();
        },
        error: (error) => {
          console.error("Erreur lors de l'approbation:", error);
        },
      });
  }

  rejectLeaveRequest() {
    if (!this.selectedLeaveRequest || !this.rejectionReason.trim()) return;

    this.leaveService
      .rejectLeaveRequest(this.selectedLeaveRequest.id, this.rejectionReason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedRequest) => {
          const index = this.leaveRequests.findIndex(
            (r) => r.id === updatedRequest.id
          );
          if (index !== -1) {
            this.leaveRequests[index] = updatedRequest;
          }
          this.generateCalendars();
          this.closeDetailsPopup();
        },
        error: (error) => {
          console.error('Erreur lors du refus:', error);
        },
      });
  }

  startEditingLeave() {
    if (!this.selectedLeaveRequest) return;

    this.isEditingLeave = true;
    this.editableLeaveRequest = { ...this.selectedLeaveRequest };
    this.tempRejectionReason = this.selectedLeaveRequest.comments || '';
  }

  cancelEditingLeave() {
    this.isEditingLeave = false;
    this.editableLeaveRequest = undefined;
    this.tempRejectionReason = '';
  }

  saveLeaveChanges() {
    if (!this.editableLeaveRequest) return;

    if (this.editableLeaveRequest.status === LeaveStatus.REJECTED) {
      this.editableLeaveRequest.comments = this.tempRejectionReason;
    }

    this.leaveService
      .updateLeaveRequest(this.editableLeaveRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedRequest: LeaveRequest) => {
          const index = this.leaveRequests.findIndex(
            (r) => r.id === updatedRequest.id
          );
          if (index !== -1) {
            this.leaveRequests[index] = updatedRequest;
          }
          this.generateCalendars();
          this.closeDetailsPopup();
        },
        error: (error: any) => {
          console.error('Erreur lors de la mise à jour:', error);
        },
      });
  }

  deleteLeaveRequest() {
    if (!this.selectedLeaveRequest) return;

    if (
      confirm('Êtes-vous sûr de vouloir supprimer cette demande de congé ?')
    ) {
      this.leaveService
        .deleteLeaveRequest(this.selectedLeaveRequest.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.leaveRequests = this.leaveRequests.filter(
              (r) => r.id !== this.selectedLeaveRequest!.id
            );
            this.generateCalendars();
            this.closeDetailsPopup();
          },
          error: (error: any) => {
            console.error('Erreur lors de la suppression:', error);
          },
        });
    }
  }

  // Actions groupées (simplifiées)
  openBulkManagementPopup() {
    this.showBulkManagementPopup = true;
  }

  closeBulkManagementPopup() {
    this.showBulkManagementPopup = false;
    this.bulkRejectionReason = '';
    this.bulkLeaveType = LeaveType.VACATION;
    this.bulkReason = '';
  }

  clearSelection() {
    this.selectedCells.clear();
    this.selectedDays = [];
  }

  bulkApprove() {
    const pendingRequests = this.selectedDays
      .filter((item) => item.day.status === 'pending' && item.day.leaveRequest)
      .map((item) => item.day.leaveRequest!);

    if (pendingRequests.length === 0) return;

    const approvalObservables = pendingRequests.map((request) =>
      this.leaveService.approveLeaveRequest(request.id)
    );

    forkJoin(approvalObservables)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadData();
          this.clearSelection();
          this.closeBulkManagementPopup();
        },
        error: (error) => {
          console.error("Erreur lors de l'approbation en lot:", error);
        },
      });
  }

  bulkReject() {
    if (!this.bulkRejectionReason.trim()) return;

    const pendingRequests = this.selectedDays
      .filter((item) => item.day.status === 'pending' && item.day.leaveRequest)
      .map((item) => item.day.leaveRequest!);

    if (pendingRequests.length === 0) return;

    const rejectionObservables = pendingRequests.map((request) =>
      this.leaveService.rejectLeaveRequest(request.id, this.bulkRejectionReason)
    );

    forkJoin(rejectionObservables)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadData();
          this.clearSelection();
          this.closeBulkManagementPopup();
        },
        error: (error) => {
          console.error('Erreur lors du refus en lot:', error);
        },
      });
  }

  getStatusCount(status: string): number {
    return this.selectedDays.filter((item) => item.day.status === status)
      .length;
  }

  // Utilitaires
  formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR');
  }

  getLeaveTypeLabel(type: LeaveType): string {
    return LEAVE_TYPE_LABELS[type];
  }

  getLeaveStatusLabel(status: LeaveStatus): string {
    return LEAVE_STATUS_LABELS[status];
  }
}
