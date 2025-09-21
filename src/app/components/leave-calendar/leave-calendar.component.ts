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
  imports: [CommonModule, FormsModule, GenericCalendarComponent],
  templateUrl: './leave-calendar.component.html',
  styleUrls: ['./leave-calendar.component.scss'],
})
export class LeaveCalendarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Configuration du calendrier générique
  calendarConfig: CalendarConfig = {
    ...LEAVE_CALENDAR_CONFIG,
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
    this.loadData();
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
    const startDate = new Date(this.selectedYear, 0, 1);
    const endDate = new Date(this.selectedYear, 11, 31);

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

      if (isWeekend) {
        status = 'weekend';
      } else if (isHoliday) {
        status = 'holiday';
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
    // Jours fériés français 2025
    const holidays2025 = [
      new Date(2025, 0, 1), // Nouvel An
      new Date(2025, 3, 21), // Lundi de Pâques
      new Date(2025, 4, 1), // Fête du travail
      new Date(2025, 4, 8), // Victoire 1945
      new Date(2025, 4, 29), // Ascension
      new Date(2025, 5, 9), // Lundi de Pentecôte
      new Date(2025, 6, 14), // Fête nationale
      new Date(2025, 7, 15), // Assomption
      new Date(2025, 10, 1), // Toussaint
      new Date(2025, 10, 11), // Armistice
      new Date(2025, 11, 25), // Noël
    ];

    return holidays2025.some(
      (holiday) =>
        holiday.getDate() === date.getDate() &&
        holiday.getMonth() === date.getMonth() &&
        holiday.getFullYear() === date.getFullYear()
    );
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
    this.generateCalendars();
  }

  onMonthChange(month: number) {
    this.selectedMonth = month;
    this.generateCalendars();
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
    this.applyFilters();
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
