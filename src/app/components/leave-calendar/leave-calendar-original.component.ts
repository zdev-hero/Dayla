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
import { forkJoin } from 'rxjs';
import { GenericCalendarComponent, CalendarConfig, CalendarDay, EmployeeCalendar, CalendarCellClickEvent } from '../generic-calendar/generic-calendar.component';
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
export class LeaveCalendarComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('datesHeaderContainer', { static: false })
  datesHeaderContainer!: ElementRef;

  selectedYear = new Date().getFullYear();
  employees: Employee[] = [];
  leaveRequests: LeaveRequest[] = [];
  employeeCalendars: EmployeeCalendar[] = [];

  // Recherche d'employés
  employeeSearchTerm = '';
  filteredEmployees: Employee[] = [];

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
  currentMonth = new Date().getMonth(); // Commence par le mois d'aujourd'hui (0-11 pour janvier-décembre)

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

  // Nouvelles propriétés pour l'édition des congés
  isEditingLeave = false;
  editableLeaveRequest?: LeaveRequest;
  tempRejectionReason = '';

  // Propriétés pour l'effet de focus vertical et horizontal
  hoveredEmployeeId?: string;
  hoveredDayIndex?: number;

  // Cache pour optimiser les performances
  private allDaysCache?: Date[];
  private dayIndexMap = new Map<string, number>();

  // Sélection multiple
  selectedCells: Set<string> = new Set();
  isMultiSelectMode = false;
  lastSelectedCell?: { employeeId: string; dayIndex: number };
  showBulkManagementPopup = false;
  selectedDays: Array<{ day: CalendarDay; employee: Employee }> = [];
  bulkAction: 'approve' | 'reject' | 'modify' | 'assign' | null = null;
  bulkRejectionReason = '';
  bulkLeaveType: LeaveType = LeaveType.VACATION;
  bulkReason = '';

  // Variables pour la sélection par glisser-déposer
  isDragging = false;
  dragStartCell?: { employeeId: string; dayIndex: number };
  dragCurrentCells: Set<string> = new Set();
  dragPreviewCells: Set<string> = new Set();

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
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.loadData();
    // S'assurer que le mois courant est sélectionné au démarrage
    this.currentMonth = new Date().getMonth();
    // Initialiser le cache des jours
    this.getAllDaysOfYear();
    
    // Event listener global pour gérer le mouseup en dehors des cellules (seulement côté client)
    if (isPlatformBrowser(this.platformId)) {
      document.addEventListener('mouseup', this.onGlobalMouseUp.bind(this));
    }
  }

  ngAfterViewInit() {
    // Utiliser setTimeout pour s'assurer que le DOM est complètement rendu
    setTimeout(() => {
      this.calculateScrollDimensions();
      // Positionner automatiquement sur le mois d'aujourd'hui
      this.scrollToMonthCenter(this.currentMonth);
    }, 0);
  }

  ngOnDestroy() {
    // Nettoyer les event listeners globaux (seulement côté client)
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('mouseup', this.onGlobalMouseUp.bind(this));
    }
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

    // Filtre par recherche d'employé
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
    // Vider le cache lors du changement d'année
    this.clearCache();
    this.generateCalendars();
    // Maintenir le mois actuel lors du changement d'année
    setTimeout(() => {
      this.scrollToMonthCenter(this.currentMonth);
    }, 0);
  }

  private clearCache() {
    this.allDaysCache = undefined;
    this.dayIndexMap.clear();
  }

  // Méthodes pour la recherche d'employés
  onEmployeeSearch() {
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
      .slice(0, 10); // Limiter à 10 résultats
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

  onCellClick(day: CalendarDay, employee: Employee, event?: MouseEvent) {
    const dayIndex = this.getDayIndexForDate(day.date);
    const cellKey = `${employee.id}-${dayIndex}`;

    // Si on a Ctrl/Cmd pressé ou on est déjà en mode multi-sélection
    if ((event && (event.ctrlKey || event.metaKey)) || this.isMultiSelectMode) {
      this.handleMultiSelection(
        cellKey,
        day,
        employee,
        dayIndex,
        event?.shiftKey || false
      );
    }
    // Sélection simple pour les demandes existantes
    else if (
      day.leaveRequest &&
      (day.status === 'pending' ||
        day.status === 'approved' ||
        day.status === 'rejected' ||
        day.status === 'rtt')
    ) {
      this.selectedLeaveRequest = day.leaveRequest;
      this.showDetailsPopup = true;
    }
    // Sélection simple pour les cellules vides (pour affecter un congé)
    else if (day.status === 'worked') {
      // Créer une demande temporaire pour les cellules vides
      this.selectedLeaveRequest = {
        id: 'temp',
        employeeId: employee.id,
        employee: employee,
        leaveType: LeaveType.VACATION,
        startDate: day.date,
        endDate: day.date,
        totalDays: 1,
        reason: '',
        status: LeaveStatus.PENDING,
        submittedDate: new Date(),
      };
      this.selectedEmployee = employee.id;
      this.isEditingLeave = true; // Mode édition pour créer une nouvelle demande
      this.showDetailsPopup = true;
    }
  }

  private handleMultiSelection(
    cellKey: string,
    day: CalendarDay,
    employee: Employee,
    dayIndex: number,
    isShiftPressed: boolean
  ) {
    // Si Shift est pressé et on a une dernière cellule sélectionnée, sélectionner la plage
    if (
      isShiftPressed &&
      this.lastSelectedCell &&
      this.lastSelectedCell.employeeId === employee.id
    ) {
      this.selectRange(this.lastSelectedCell.dayIndex, dayIndex, employee);
    } else {
      // Toggle de la sélection de cette cellule
      if (this.selectedCells.has(cellKey)) {
        this.selectedCells.delete(cellKey);
        this.selectedDays = this.selectedDays.filter(
          (item) =>
            !(
              item.employee.id === employee.id &&
              this.getDayIndexForDate(item.day.date) === dayIndex
            )
        );
      } else {
        // Ne permettre la sélection que des cellules appropriées
        if (
          day.status === 'worked' ||
          day.status === 'pending' ||
          day.status === 'approved' ||
          day.status === 'rejected' ||
          day.status === 'rtt'
        ) {
          this.selectedCells.add(cellKey);
          this.selectedDays.push({ day, employee });
        }
      }
    }

    this.lastSelectedCell = { employeeId: employee.id, dayIndex };
    this.isMultiSelectMode = this.selectedCells.size > 0;

    // Si on a des sélections, analyser le type d'action possible
    if (this.selectedCells.size > 0) {
      this.analyzeBulkAction();
    }
  }

  private selectRange(
    startIndex: number,
    endIndex: number,
    employee: Employee
  ) {
    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);

    for (let i = minIndex; i <= maxIndex; i++) {
      const dayData = this.getEmployeeDayByIndex(employee.id, i);
      if (
        dayData &&
        (dayData.status === 'worked' ||
          dayData.status === 'pending' ||
          dayData.status === 'approved' ||
          dayData.status === 'rejected' ||
          dayData.status === 'rtt')
      ) {
        const cellKey = `${employee.id}-${i}`;
        if (!this.selectedCells.has(cellKey)) {
          this.selectedCells.add(cellKey);
          this.selectedDays.push({ day: dayData, employee });
        }
      }
    }
  }

  private getEmployeeDayByIndex(
    employeeId: string,
    dayIndex: number
  ): CalendarDay | null {
    const empCalendar = this.employeeCalendars.find(
      (ec) => ec.employee.id === employeeId
    );
    return empCalendar && empCalendar.days[dayIndex]
      ? empCalendar.days[dayIndex]
      : null;
  }

  private getDayIndexForDate(date: Date): number {
    const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return this.dayIndexMap.get(dayKey) || 0;
  }

  private analyzeBulkAction() {
    if (this.selectedDays.length === 0) return;

    const statuses = this.selectedDays.map((item) => item.day.status);
    const uniqueStatuses = [...new Set(statuses)];

    // Analyser quel type d'action est possible
    if (uniqueStatuses.every((status) => status === 'pending')) {
      this.bulkAction = 'approve'; // Demandes en attente -> on peut valider/refuser
    } else if (
      uniqueStatuses.every(
        (status) => status === 'approved' || status === 'rtt'
      )
    ) {
      this.bulkAction = 'modify'; // Congés validés -> on peut modifier
    } else if (uniqueStatuses.every((status) => status === 'worked')) {
      this.bulkAction = 'assign'; // Cellules vides -> on peut affecter des congés
    } else {
      this.bulkAction = null; // Mélange -> actions limitées
    }
  }

  // Méthodes pour la sélection par glisser-déposer
  onCellMouseDown(day: CalendarDay, employee: Employee, event: MouseEvent) {
    const dayIndex = this.getDayIndexForDate(day.date);

    // Vérifier si la cellule peut être sélectionnée
    if (!this.canSelectCell(day)) {
      return;
    }

    // Toujours préparer le drag, mais on décidera plus tard si c'est un vrai drag
    this.dragStartCell = { employeeId: employee.id, dayIndex };
    this.dragCurrentCells.clear();
    this.dragPreviewCells.clear();

    const cellKey = `${employee.id}-${dayIndex}`;
    this.dragCurrentCells.add(cellKey);
    this.dragPreviewCells.add(cellKey);
  }

  onCellMouseEnter(day: CalendarDay, employee: Employee) {
    this.hoveredEmployeeId = employee.id;

    // Utiliser le cache d'index pour une recherche rapide
    const dayKey = `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`;
    this.hoveredDayIndex = this.dayIndexMap.get(dayKey);

    // Si on a un dragStartCell mais pas encore isDragging, c'est qu'on commence à bouger
    if (this.dragStartCell && !this.isDragging) {
      // Commencer le vrai drag maintenant
      this.isDragging = true;
    }

    // Gestion du drag selection
    if (this.isDragging && this.dragStartCell) {
      this.updateDragSelection(employee, this.hoveredDayIndex || 0);
    }
  }

  onCellMouseUp(day: CalendarDay, employee: Employee, event: MouseEvent) {
    if (this.isDragging) {
      // Finaliser la sélection par drag
      this.finalizeDragSelection(event.ctrlKey || event.metaKey);
    }
    
    // Réinitialiser l'état de drag
    this.isDragging = false;
    this.dragStartCell = undefined;
    this.dragCurrentCells.clear();
    this.dragPreviewCells.clear();
  }

  onGlobalMouseUp(event: MouseEvent) {
    // Si on était en train de draguer et qu'on relâche la souris n'importe où
    if (this.isDragging || this.dragStartCell) {
      // Finaliser la sélection avec les cellules actuellement sélectionnées
      if (this.isDragging && this.dragCurrentCells.size > 0) {
        this.finalizeDragSelection(event.ctrlKey || event.metaKey);
      }
      
      // Réinitialiser l'état
      this.isDragging = false;
      this.dragStartCell = undefined;
      this.dragCurrentCells.clear();
      this.dragPreviewCells.clear();
    }
  }

  private canSelectCell(day: CalendarDay): boolean {
    return (
      day.status === 'worked' ||
      day.status === 'pending' ||
      day.status === 'approved' ||
      day.status === 'rejected' ||
      day.status === 'rtt'
    );
  }

  private updateDragSelection(
    currentEmployee: Employee,
    currentDayIndex: number
  ) {
    if (!this.dragStartCell) return;

    this.dragPreviewCells.clear();

    // Sélection rectangulaire
    const startEmployeeIndex = this.getEmployeeIndex(
      this.dragStartCell.employeeId
    );
    const currentEmployeeIndex = this.getEmployeeIndex(currentEmployee.id);
    const startDayIndex = this.dragStartCell.dayIndex;

    if (startEmployeeIndex === -1 || currentEmployeeIndex === -1) return;

    const minEmployeeIndex = Math.min(startEmployeeIndex, currentEmployeeIndex);
    const maxEmployeeIndex = Math.max(startEmployeeIndex, currentEmployeeIndex);
    const minDayIndex = Math.min(startDayIndex, currentDayIndex);
    const maxDayIndex = Math.max(startDayIndex, currentDayIndex);

    // Parcourir la zone rectangulaire
    for (
      let empIndex = minEmployeeIndex;
      empIndex <= maxEmployeeIndex;
      empIndex++
    ) {
      const empCalendar = this.employeeCalendars[empIndex];
      if (!empCalendar) continue;

      for (let dayIndex = minDayIndex; dayIndex <= maxDayIndex; dayIndex++) {
        const day = empCalendar.days[dayIndex];
        if (day && this.canSelectCell(day)) {
          const cellKey = `${empCalendar.employee.id}-${dayIndex}`;
          this.dragPreviewCells.add(cellKey);
        }
      }
    }
  }

  private finalizeDragSelection(addToExisting: boolean) {
    if (!addToExisting && !this.isMultiSelectMode) {
      // Si on n'ajoute pas à la sélection existante et on n'est pas en mode multi, vider la sélection
      this.clearSelection();
    }

    // Ajouter les cellules de la sélection drag à la sélection principale
    this.dragPreviewCells.forEach((cellKey) => {
      if (!this.selectedCells.has(cellKey)) {
        this.selectedCells.add(cellKey);

        // Trouver la cellule et l'employé correspondants
        const [employeeId, dayIndexStr] = cellKey.split('-');
        const dayIndex = parseInt(dayIndexStr);
        const empCalendar = this.employeeCalendars.find(
          (ec) => ec.employee.id === employeeId
        );

        if (empCalendar && empCalendar.days[dayIndex]) {
          this.selectedDays.push({
            day: empCalendar.days[dayIndex],
            employee: empCalendar.employee,
          });
        }
      }
    });

    // Réinitialiser les variables de drag
    this.isDragging = false;
    this.dragStartCell = undefined;
    this.dragCurrentCells.clear();
    this.dragPreviewCells.clear();

    // Mettre à jour l'état
    this.isMultiSelectMode = this.selectedCells.size > 0;
    if (this.selectedCells.size > 0) {
      this.analyzeBulkAction();
    }
  }

  private getEmployeeIndex(employeeId: string): number {
    return this.employeeCalendars.findIndex(
      (ec) => ec.employee.id === employeeId
    );
  }

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

  // Nouvelles méthodes pour l'édition des congés
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

    // Ajouter le motif de refus si le statut est rejeté
    if (this.editableLeaveRequest.status === LeaveStatus.REJECTED) {
      this.editableLeaveRequest.comments = this.tempRejectionReason;
    }

    this.leaveService.updateLeaveRequest(this.editableLeaveRequest).subscribe({
      next: (updatedRequest: LeaveRequest) => {
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
        .subscribe({
          next: () => {
            // Supprimer la demande de la liste locale
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

  // Méthodes pour la gestion de la sélection multiple
  openBulkManagementPopup() {
    if (this.selectedCells.size > 0) {
      this.showBulkManagementPopup = true;
      this.analyzeBulkAction();
    }
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
    this.isMultiSelectMode = false;
    this.lastSelectedCell = undefined;
    this.bulkAction = null;
  }

  // Actions de gestion groupée
  bulkApprove() {
    const pendingRequests = this.selectedDays
      .filter((item) => item.day.status === 'pending' && item.day.leaveRequest)
      .map((item) => item.day.leaveRequest!);

    if (pendingRequests.length === 0) return;

    // Approuver toutes les demandes en lot
    const approvalObservables = pendingRequests.map((request) =>
      this.leaveService.approveLeaveRequest(request.id)
    );

    forkJoin(approvalObservables).subscribe({
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

    forkJoin(rejectionObservables).subscribe({
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

  bulkModify() {
    const approvedRequests = this.selectedDays
      .filter(
        (item) =>
          (item.day.status === 'approved' || item.day.status === 'rtt') &&
          item.day.leaveRequest
      )
      .map((item) => item.day.leaveRequest!);

    if (approvedRequests.length === 0) return;

    const dateRange = this.getSelectedDateRange();
    if (!dateRange) return;

    // Créer de nouvelles demandes modifiées
    const modifiedRequests = approvedRequests.map((request) => ({
      ...request,
      leaveType: this.bulkLeaveType,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      reason: this.bulkReason || request.reason,
    }));

    const updateObservables = modifiedRequests.map((request) =>
      this.leaveService.updateLeaveRequest(request)
    );

    forkJoin(updateObservables).subscribe({
      next: () => {
        this.loadData();
        this.clearSelection();
        this.closeBulkManagementPopup();
      },
      error: (error) => {
        console.error('Erreur lors de la modification en lot:', error);
      },
    });
  }

  bulkAssign() {
    const workedDays = this.selectedDays.filter(
      (item) => item.day.status === 'worked'
    );

    if (workedDays.length === 0) return;

    const dateRange = this.getSelectedDateRange();
    if (!dateRange) return;

    // Grouper par employé pour créer des demandes distinctes
    const employeeGroups = workedDays.reduce((groups, item) => {
      const employeeId = item.employee.id;
      if (!groups[employeeId]) {
        groups[employeeId] = { employee: item.employee, days: [] };
      }
      groups[employeeId].days.push(item.day);
      return groups;
    }, {} as { [key: string]: { employee: Employee; days: CalendarDay[] } });

    // Créer une demande de congé pour chaque employé
    const newRequests = Object.values(employeeGroups).map((group) => {
      const totalDays = group.days.length;
      return {
        id: '', // Sera généré par le service
        employeeId: group.employee.id,
        employee: group.employee,
        leaveType: this.bulkLeaveType,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        totalDays,
        reason: this.bulkReason,
        status: LeaveStatus.APPROVED, // Directement approuvé
        submittedDate: new Date(),
      } as LeaveRequest;
    });

    const createObservables = newRequests.map((request) =>
      this.leaveService.createLeaveRequest(request)
    );

    forkJoin(createObservables).subscribe({
      next: () => {
        this.loadData();
        this.clearSelection();
        this.closeBulkManagementPopup();
      },
      error: (error) => {
        console.error("Erreur lors de l'affectation en lot:", error);
      },
    });
  }

  bulkCreatePending() {
    const workedDays = this.selectedDays.filter(
      (item) => item.day.status === 'worked'
    );

    if (workedDays.length === 0) return;

    const dateRange = this.getSelectedDateRange();
    if (!dateRange) return;

    // Grouper par employé pour créer des demandes distinctes
    const employeeGroups = workedDays.reduce((groups, item) => {
      const employeeId = item.employee.id;
      if (!groups[employeeId]) {
        groups[employeeId] = { employee: item.employee, days: [] };
      }
      groups[employeeId].days.push(item.day);
      return groups;
    }, {} as { [key: string]: { employee: Employee; days: CalendarDay[] } });

    // Créer une demande de congé en attente pour chaque employé
    const newRequests = Object.values(employeeGroups).map((group) => {
      const totalDays = group.days.length;
      return {
        id: '', // Sera généré par le service
        employeeId: group.employee.id,
        employee: group.employee,
        leaveType: this.bulkLeaveType,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        totalDays,
        reason: this.bulkReason,
        status: LeaveStatus.PENDING, // En attente de validation
        submittedDate: new Date(),
      } as LeaveRequest;
    });

    const createObservables = newRequests.map((request) =>
      this.leaveService.createLeaveRequest(request)
    );

    forkJoin(createObservables).subscribe({
      next: () => {
        this.loadData();
        this.clearSelection();
        this.closeBulkManagementPopup();
      },
      error: (error) => {
        console.error(
          'Erreur lors de la création des demandes en attente:',
          error
        );
      },
    });
  }

  getStatusCount(status: string): number {
    return this.selectedDays.filter((item) => item.day.status === status)
      .length;
  }

  // Méthodes pour gérer les dates sélectionnées
  getSelectedDates(): Date[] {
    return this.selectedDays
      .map((item) => item.day.date)
      .sort((a, b) => a.getTime() - b.getTime());
  }

  getSelectedDateRange(): { startDate: Date; endDate: Date } | null {
    const dates = this.getSelectedDates();
    if (dates.length === 0) return null;

    return {
      startDate: dates[0],
      endDate: dates[dates.length - 1],
    };
  }

  getSelectedDateRangeText(): string {
    const range = this.getSelectedDateRange();
    if (!range) return 'Aucune date sélectionnée';

    if (range.startDate.getTime() === range.endDate.getTime()) {
      return `Le ${this.formatDate(range.startDate)}`;
    }

    return `Du ${this.formatDate(range.startDate)} au ${this.formatDate(
      range.endDate
    )}`;
  }

  getSelectedDatesText(): string {
    const dates = this.getSelectedDates();
    if (dates.length === 0) return 'Aucune date sélectionnée';
    if (dates.length === 1) return `Le ${this.formatDate(dates[0])}`;
    if (dates.length <= 3) {
      return dates.map((date) => this.formatDate(date)).join(', ');
    }
    return `${dates.length} jours sélectionnés (${this.formatDate(
      dates[0]
    )} - ${this.formatDate(dates[dates.length - 1])})`;
  }

  // Méthodes pour l'effet de focus vertical et horizontal - supprimées (duplicatas)

  getCellClass(day: CalendarDay, employee: Employee, dayIndex: number): string {
    const classes = ['calendar-cell'];
    const cellKey = `${employee.id}-${dayIndex}`;

    classes.push(`status-${day.status}`);

    // Rendre tous les congés cliquables (en attente, validés, rejetés, RTT)
    if (
      day.leaveRequest &&
      (day.status === 'pending' ||
        day.status === 'approved' ||
        day.status === 'rejected' ||
        day.status === 'rtt')
    ) {
      classes.push('clickable');
    }

    // Ajouter les cellules vides cliquables pour affectation
    if (day.status === 'worked') {
      classes.push('clickable');
    }

    // Classe de sélection
    if (this.selectedCells.has(cellKey)) {
      classes.push('selected');
    }

    // Classe de prévisualisation de drag
    if (this.dragPreviewCells.has(cellKey)) {
      classes.push('drag-preview');
    }

    // Ajouter les classes de focus
    if (this.hoveredEmployeeId === employee.id) {
      classes.push('row-focused');
    }

    if (this.hoveredDayIndex === dayIndex) {
      classes.push('column-focused');
    }

    return classes.join(' ');
  }

  getEmployeeRowClass(employee: Employee): string {
    const classes = [];
    if (this.hoveredEmployeeId === employee.id) {
      classes.push('row-hovered');
    }
    return classes.join(' ');
  }

  getDayHeaderClass(dayIndex: number): string {
    const classes = ['day-header-cell'];
    const allDays = this.getAllDaysOfYear();
    const day = allDays[dayIndex];

    if (this.isWeekendDay(day)) {
      classes.push('weekend');
    }

    if (this.isHoliday(day)) {
      classes.push('holiday');
    }

    if (this.hoveredDayIndex === dayIndex) {
      classes.push('column-hovered');
    }

    return classes.join(' ');
  }

  getWeekdayHeaderClass(dayIndex: number): string {
    const classes = ['weekday-header-cell'];
    const allDays = this.getAllDaysOfYear();
    const day = allDays[dayIndex];

    if (this.isWeekendDay(day)) {
      classes.push('weekend');
    }

    if (this.isHoliday(day)) {
      classes.push('holiday');
    }

    if (this.hoveredDayIndex === dayIndex) {
      classes.push('column-hovered');
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
    if (this.allDaysCache) {
      return this.allDaysCache;
    }

    const days: Date[] = [];
    const startDate = new Date(this.selectedYear, 0, 1);
    const endDate = new Date(this.selectedYear, 11, 31);

    const currentDate = new Date(startDate);
    let index = 0;
    while (currentDate <= endDate) {
      const dayDate = new Date(currentDate);
      days.push(dayDate);

      // Créer la clé pour le cache d'index
      const dayKey = `${dayDate.getFullYear()}-${dayDate.getMonth()}-${dayDate.getDate()}`;
      this.dayIndexMap.set(dayKey, index);

      currentDate.setDate(currentDate.getDate() + 1);
      index++;
    }

    this.allDaysCache = days;
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
    this.updateCurrentMonthFromScrollPosition();
  }

  scrollRight() {
    this.scrollPosition = Math.min(
      this.maxScrollPosition,
      this.scrollPosition + this.scrollStep
    );
    this.updateCurrentMonthFromScrollPosition();
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
    this.updateCurrentMonthFromScrollPosition();
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp() {
    if (this.isDragging) {
      this.finalizeDragSelection(false);
    }
    this.isDraggingScrollbar = false;
  }

  // Détection du mois actuellement visible
  updateCurrentMonthFromScrollPosition() {
    let accumulatedWidth = 0;
    for (let i = 0; i < 12; i++) {
      const monthWidth = this.getMonthWidth(i);
      if (this.scrollPosition < accumulatedWidth + monthWidth / 2) {
        this.currentMonth = i;
        return;
      }
      accumulatedWidth += monthWidth;
    }
    this.currentMonth = 11; // Décembre si on est à la fin
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
    this.updateCurrentMonthFromScrollPosition();
  }

  // Navigation par mois
  scrollToMonth(monthIndex: number) {
    this.currentMonth = monthIndex;
    this.scrollToMonthCenter(monthIndex);
  }

  // Vérifier si un jour appartient au mois sélectionné
  isCurrentMonth(day: Date): boolean {
    return day.getMonth() === this.currentMonth;
  }

  // Obtenir la position de début d'un mois spécifique
  getMonthStartPosition(monthIndex: number): number {
    let position = 0;
    for (let i = 0; i < monthIndex; i++) {
      position += this.getMonthWidth(i);
    }
    return position;
  }

  // Méthode utilitaire pour revenir au mois d'aujourd'hui
  goToCurrentMonth() {
    const currentMonthIndex = new Date().getMonth();
    this.scrollToMonth(currentMonthIndex);
  }

  // Vérifier si nous sommes sur le mois d'aujourd'hui
  isOnCurrentMonth(): boolean {
    return this.currentMonth === new Date().getMonth();
  }
}
