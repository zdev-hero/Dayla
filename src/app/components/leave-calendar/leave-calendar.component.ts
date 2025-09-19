import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  HostListener,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

export interface CalendarDay {
  date: Date;
  dayOfWeek: number;
  isWeekend: boolean;
  isHoliday: boolean;
  leaveRequest?: LeaveRequest;
  status:
    | 'worked'
    | 'approved'
    | 'pending'
    | 'rejected'
    | 'rtt'
    | 'holiday'
    | 'weekend';
  isHalfDay?: boolean;
  halfDayPeriod?: 'morning' | 'afternoon';
}

export interface EmployeeCalendar {
  employee: Employee;
  days: CalendarDay[];
}

@Component({
  selector: 'app-leave-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leave-calendar.component.html',
  styleUrls: ['./leave-calendar.component.scss'],
})
export class LeaveCalendarComponent implements OnInit, AfterViewInit {
  @ViewChild('datesHeaderContainer', { static: false })
  datesHeaderContainer!: ElementRef;

  selectedYear = new Date().getFullYear();
  employees: Employee[] = [];
  leaveRequests: LeaveRequest[] = [];
  employeeCalendars: EmployeeCalendar[] = [];

  // Propriétés pour la gestion du scroll
  scrollPosition = 0;
  maxScrollPosition = 0;
  scrollStep = 120; // pixels par scroll
  containerWidth = 0;
  contentWidth = 0;

  // Propriétés calculées pour éviter ExpressionChangedAfterItHasBeenCheckedError
  get canScrollLeft(): boolean {
    return this.currentMonth > 0;
  }

  get canScrollRight(): boolean {
    return this.currentMonth < 11;
  }

  // Navigation par mois
  currentMonth = new Date().getMonth(); // 0-11 pour janvier-décembre

  // Getters pour les noms des mois précédent et suivant
  get previousMonthName(): string {
    if (this.currentMonth === 0) return '';
    return this.months[this.currentMonth - 1];
  }

  get nextMonthName(): string {
    if (this.currentMonth === 11) return '';
    return this.months[this.currentMonth + 1];
  }

  // Variables pour la scrollbar personnalisée
  isDraggingScrollbar = false;
  scrollbarStartX = 0;
  scrollPositionAtStart = 0;

  // Filtres
  selectedTeam = '';
  selectedEmployee = '';
  selectedLeaveType = '';
  selectedStatus = '';

  // Options de filtrage
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

  // Mois et jours de la semaine
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

  weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  // Jours fériés français 2025 (à adapter selon vos besoins)
  holidays2025 = [
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

  constructor(
    private leaveService: LeaveManagementService,
    private employeeService: EmployeeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadData();
  }

  ngAfterViewInit() {
    // Utiliser setTimeout pour s'assurer que le DOM est complètement rendu
    setTimeout(() => {
      this.calculateScrollDimensions();
    }, 0);
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize() {
    this.calculateScrollDimensions();
  }

  async loadData() {
    try {
      // Charger les employés et demandes de congés
      this.employeeService.getEmployees().subscribe((employees) => {
        this.employees = employees;
        this.teams = [...new Set(employees.map((emp) => emp.department))];
        this.generateCalendars();
      });

      this.leaveService.getLeaveRequests().subscribe((requests) => {
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

  generateEmployeeDays(employee: Employee): CalendarDay[] {
    const days: CalendarDay[] = [];
    const startDate = new Date(this.selectedYear, 0, 1);
    const endDate = new Date(this.selectedYear, 11, 31);

    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = this.isHoliday(currentDate);

      // Trouver la demande de congé pour cette date
      const leaveRequest = this.findLeaveRequestForDate(
        employee.id,
        currentDate
      );

      let status: CalendarDay['status'] = 'worked';

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
    return this.holidays2025.some(
      (holiday) =>
        holiday.getDate() === date.getDate() &&
        holiday.getMonth() === date.getMonth() &&
        holiday.getFullYear() === date.getFullYear()
    );
  }

  applyFilters() {
    let filtered = [...this.employeeCalendars];

    // Filtre par équipe
    if (this.selectedTeam) {
      filtered = filtered.filter(
        (ec) => ec.employee.department === this.selectedTeam
      );
    }

    // Filtre par employé
    if (this.selectedEmployee) {
      filtered = filtered.filter(
        (ec) => ec.employee.id === this.selectedEmployee
      );
    }

    // Filtre par type de congé
    if (this.selectedLeaveType) {
      filtered = filtered.filter((ec) =>
        ec.days.some(
          (day) =>
            day.leaveRequest &&
            day.leaveRequest.leaveType === this.selectedLeaveType
        )
      );
    }

    // Filtre par statut
    if (this.selectedStatus) {
      filtered = filtered.filter((ec) =>
        ec.days.some(
          (day) =>
            day.leaveRequest && day.leaveRequest.status === this.selectedStatus
        )
      );
    }

    this.employeeCalendars = filtered;
  }

  onFilterChange() {
    this.applyFilters();
  }

  onYearChange() {
    this.generateCalendars();
  }

  getVisibleDays(employeeCalendar: EmployeeCalendar): CalendarDay[] {
    switch (this.viewMode) {
      case 'month':
        const monthStart = new Date(
          this.selectedYear,
          this.selectedMonth - 1,
          1
        );
        const monthEnd = new Date(this.selectedYear, this.selectedMonth, 0);
        return employeeCalendar.days.filter(
          (day) => day.date >= monthStart && day.date <= monthEnd
        );

      case 'quarter':
        const quarterStart = new Date(
          this.selectedYear,
          (this.selectedQuarter - 1) * 3,
          1
        );
        const quarterEnd = new Date(
          this.selectedYear,
          this.selectedQuarter * 3,
          0
        );
        return employeeCalendar.days.filter(
          (day) => day.date >= quarterStart && day.date <= quarterEnd
        );

      default: // year
        return employeeCalendar.days;
    }
  }

  onCellClick(day: CalendarDay, employee: Employee) {
    if (day.leaveRequest && day.status === 'pending') {
      this.selectedLeaveRequest = day.leaveRequest;
      this.showDetailsPopup = true;
    }
  }

  closeDetailsPopup() {
    this.showDetailsPopup = false;
    this.selectedLeaveRequest = undefined;
    this.rejectionReason = '';
  }

  approveLeaveRequest() {
    if (!this.selectedLeaveRequest) return;

    this.leaveService
      .approveLeaveRequest(this.selectedLeaveRequest.id)
      .subscribe({
        next: (updatedRequest) => {
          // Mettre à jour la demande dans la liste locale
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
      .subscribe({
        next: (updatedRequest) => {
          // Mettre à jour la demande dans la liste locale
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

  getCellClass(day: CalendarDay): string {
    const classes = ['calendar-cell'];

    classes.push(`status-${day.status}`);

    if (day.leaveRequest && day.status === 'pending') {
      classes.push('clickable');
    }

    return classes.join(' ');
  }

  getCellTitle(day: CalendarDay): string {
    if (day.leaveRequest) {
      return `${LEAVE_TYPE_LABELS[day.leaveRequest.leaveType]} - ${
        LEAVE_STATUS_LABELS[day.leaveRequest.status]
      }`;
    }

    if (day.isHoliday) {
      return 'Jour férié';
    }

    if (day.isWeekend) {
      return 'Week-end';
    }

    return 'Jour travaillé';
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR');
  }

  getLeaveTypeLabel(type: LeaveType): string {
    return LEAVE_TYPE_LABELS[type];
  }

  getLeaveStatusLabel(status: LeaveStatus): string {
    return LEAVE_STATUS_LABELS[status];
  }

  // Nouvelles méthodes pour le layout horizontal
  getAllDaysOfYear(): Date[] {
    const days: Date[] = [];
    const startDate = new Date(this.selectedYear, 0, 1);
    const endDate = new Date(this.selectedYear, 11, 31);

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  }

  getMonthWidth(monthIndex: number): number {
    // Calculer le nombre de jours dans le mois
    const daysInMonth = new Date(
      this.selectedYear,
      monthIndex + 1,
      0
    ).getDate();
    return daysInMonth * 24; // 24px par jour
  }

  isWeekendDay(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }

  // Méthodes pour la gestion du scroll
  calculateScrollDimensions() {
    if (this.datesHeaderContainer?.nativeElement) {
      const clientWidth = this.datesHeaderContainer.nativeElement.clientWidth;
      if (clientWidth > 0) {
        this.containerWidth = clientWidth;
        this.contentWidth = 365 * 24; // 365 jours * 24px par jour
        this.maxScrollPosition = Math.max(
          0,
          this.contentWidth - this.containerWidth
        );
      }
    }
  }

  scrollLeft() {
    this.scrollPosition = Math.max(0, this.scrollPosition - this.scrollStep);
  }

  scrollRight() {
    this.scrollPosition = Math.min(
      this.maxScrollPosition,
      this.scrollPosition + this.scrollStep
    );
  }

  // Propriétés calculées pour la scrollbar
  get scrollThumbWidth(): number {
    if (
      !this.containerWidth ||
      !this.contentWidth ||
      this.contentWidth <= this.containerWidth
    ) {
      return 100;
    }
    return Math.max(10, (this.containerWidth / this.contentWidth) * 100);
  }

  get scrollThumbPosition(): number {
    if (!this.maxScrollPosition || this.maxScrollPosition === 0) {
      return 0;
    }
    const thumbWidth = this.scrollThumbWidth;
    if (isNaN(thumbWidth)) {
      return 0;
    }
    return (this.scrollPosition / this.maxScrollPosition) * (100 - thumbWidth);
  }

  // Gestion de la scrollbar personnalisée
  onScrollbarMouseDown(event: MouseEvent) {
    event.preventDefault();
    this.isDraggingScrollbar = true;
    this.scrollbarStartX = event.clientX;
    this.scrollPositionAtStart = this.scrollPosition;
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent) {
    if (!this.isDraggingScrollbar) return;

    event.preventDefault();
    const deltaX = event.clientX - this.scrollbarStartX;
    const scrollbarTrackWidth = this.containerWidth;
    const scrollRatio = deltaX / scrollbarTrackWidth;
    const deltaScroll = scrollRatio * this.maxScrollPosition;

    this.scrollPosition = Math.max(
      0,
      Math.min(this.maxScrollPosition, this.scrollPositionAtStart + deltaScroll)
    );
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp() {
    this.isDraggingScrollbar = false;
  }

  // Navigation par mois - méthodes pour les boutons
  scrollToPreviousMonth() {
    if (this.currentMonth > 0) {
      this.currentMonth--;
      this.scrollToMonthCenter(this.currentMonth);
    }
  }

  scrollToNextMonth() {
    if (this.currentMonth < 11) {
      this.currentMonth++;
      this.scrollToMonthCenter(this.currentMonth);
    }
  }

  scrollToMonthCenter(monthIndex: number) {
    const monthWidth = this.getMonthWidth(monthIndex);
    let targetPosition = 0;

    // Calculer la position du début du mois
    for (let i = 0; i < monthIndex; i++) {
      targetPosition += this.getMonthWidth(i);
    }

    // Centrer le mois dans la vue
    const centerOffset = (this.containerWidth - monthWidth) / 2;
    targetPosition = targetPosition - centerOffset;

    this.scrollPosition = Math.max(
      0,
      Math.min(this.maxScrollPosition, targetPosition)
    );
  }

  // Navigation par mois
  scrollToMonth(monthIndex: number) {
    this.currentMonth = monthIndex;
    this.scrollToMonthCenter(monthIndex);
  }
}
