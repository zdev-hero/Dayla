import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  HostListener,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Employee } from '../../models/employee.model';

export interface CalendarConfig {
  // Configuration de l'affichage
  showEmployeeSearch?: boolean;
  showFilters?: boolean;
  showLegend?: boolean;
  showMultiSelection?: boolean;

  // Configuration du mode
  mode: 'leave-management' | 'cra';
  viewMode?: 'year' | 'month';

  // Configuration des colonnes et largeurs
  employeeColumnWidth?: number;
  cellWidth?: number;
  cellHeight?: number;

  // Configuration des interactions
  allowCellEditing?: boolean;
  allowMultiSelect?: boolean;
  allowDragSelect?: boolean;

  // Labels et textes personnalisés
  title?: string;
  legends?: CalendarLegendItem[];
}

export interface CalendarLegendItem {
  status: string;
  label: string;
  color: string;
}

export interface CalendarDay {
  date: Date;
  dayOfWeek: number;
  isWeekend: boolean;
  isHoliday: boolean;
  status: string;
  value?: any; // Flexible pour différents types de données
  isEditable?: boolean;
  data?: any; // Données additionnelles spécifiques au contexte
}

export interface EmployeeCalendar {
  employee: Employee;
  days: CalendarDay[];
}

export interface CalendarCellClickEvent {
  day: CalendarDay;
  employee: Employee;
  dayIndex: number;
  event: MouseEvent;
}

export interface CalendarCellEditEvent {
  day: CalendarDay;
  employee: Employee;
  dayIndex: number;
  newValue: any;
}

@Component({
  selector: 'app-generic-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './generic-calendar.component.html',
  styleUrls: ['./generic-calendar.component.scss'],
})
export class GenericCalendarComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('datesHeaderContainer', { static: false })
  datesHeaderContainer!: ElementRef;

  // Inputs
  @Input() config: CalendarConfig = { mode: 'leave-management' };
  @Input() employees: Employee[] = [];
  @Input() employeeCalendars: EmployeeCalendar[] = [];
  @Input() selectedYear = new Date().getFullYear();
  @Input() selectedMonth = new Date().getMonth() + 1;

  // Outputs
  @Output() cellClick = new EventEmitter<CalendarCellClickEvent>();
  @Output() cellEdit = new EventEmitter<CalendarCellEditEvent>();
  @Output() employeeSearch = new EventEmitter<string>();
  @Output() yearChange = new EventEmitter<number>();
  @Output() monthChange = new EventEmitter<number>();

  // Propriétés internes pour le scroll
  scrollPosition = 0;
  maxScrollPosition = 0;
  scrollStep = 120;
  containerWidth = 0;
  contentWidth = 0;
  currentMonth = new Date().getMonth();

  // Propriétés de l'interface
  employeeSearchTerm = '';
  filteredEmployees: Employee[] = [];

  // Propriétés pour la gestion du focus
  hoveredEmployeeId?: string;
  hoveredDayIndex?: number;

  // Propriétés pour la sélection multiple
  selectedCells: Set<string> = new Set();
  isMultiSelectMode = false;
  lastSelectedCell?: { employeeId: string; dayIndex: number };

  // Propriétés pour le drag
  isDragging = false;
  dragStartCell?: { employeeId: string; dayIndex: number };
  dragCurrentCells: Set<string> = new Set();
  dragPreviewCells: Set<string> = new Set();

  // Variables pour la scrollbar
  isDraggingScrollbar = false;
  scrollbarStartX = 0;
  scrollPositionAtStart = 0;

  // Cache pour optimiser les performances
  private allDaysCache?: Date[];
  private dayIndexMap = new Map<string, number>();

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

  // Jours fériés français 2025
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

  // Propriétés calculées
  get canScrollLeft(): boolean {
    return this.currentMonth > 0;
  }

  get canScrollRight(): boolean {
    return this.currentMonth < 11;
  }

  get previousMonthName(): string {
    if (this.currentMonth === 0) return '';
    return this.months[this.currentMonth - 1];
  }

  get nextMonthName(): string {
    if (this.currentMonth === 11) return '';
    return this.months[this.currentMonth + 1];
  }

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

  get employeeColumnWidth(): number {
    return this.config.employeeColumnWidth || 300;
  }

  get cellWidth(): number {
    return this.config.cellWidth || 24;
  }

  get cellHeight(): number {
    return this.config.cellHeight || 32;
  }

  constructor(
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.currentMonth = new Date().getMonth();
    this.getAllDaysOfYear();

    if (isPlatformBrowser(this.platformId)) {
      document.addEventListener('mouseup', this.onGlobalMouseUp.bind(this));
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.calculateScrollDimensions();
      if (this.config.viewMode === 'year') {
        this.scrollToMonthCenter(this.currentMonth);
      }
    }, 0);
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('mouseup', this.onGlobalMouseUp.bind(this));
    }
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize() {
    this.calculateScrollDimensions();
  }

  // Méthodes pour la gestion des jours
  getAllDaysOfYear(): Date[] {
    if (this.allDaysCache) {
      return this.allDaysCache;
    }

    const days: Date[] = [];
    let startDate: Date;
    let endDate: Date;

    if (this.config.viewMode === 'month') {
      startDate = new Date(this.selectedYear, this.selectedMonth - 1, 1);
      endDate = new Date(this.selectedYear, this.selectedMonth, 0);
    } else {
      startDate = new Date(this.selectedYear, 0, 1);
      endDate = new Date(this.selectedYear, 11, 31);
    }

    const currentDate = new Date(startDate);
    let index = 0;
    while (currentDate <= endDate) {
      const dayDate = new Date(currentDate);
      days.push(dayDate);

      const dayKey = `${dayDate.getFullYear()}-${dayDate.getMonth()}-${dayDate.getDate()}`;
      this.dayIndexMap.set(dayKey, index);

      currentDate.setDate(currentDate.getDate() + 1);
      index++;
    }

    this.allDaysCache = days;
    return days;
  }

  isHoliday(date: Date): boolean {
    return this.holidays2025.some(
      (holiday) =>
        holiday.getDate() === date.getDate() &&
        holiday.getMonth() === date.getMonth() &&
        holiday.getFullYear() === date.getFullYear()
    );
  }

  isWeekendDay(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }

  // Méthodes pour la recherche d'employés
  onEmployeeSearch() {
    this.employeeSearch.emit(this.employeeSearchTerm);
  }

  selectEmployee(employee: Employee) {
    this.employeeSearchTerm = `${employee.firstName} ${employee.lastName}`;
    this.filteredEmployees = [];
  }

  clearEmployeeSearch() {
    this.employeeSearchTerm = '';
    this.filteredEmployees = [];
    this.employeeSearch.emit('');
  }

  // Méthodes pour les interactions de cellules
  onCellClick(day: CalendarDay, employee: Employee, event: MouseEvent) {
    const dayIndex = this.getDayIndexForDate(day.date);
    const cellKey = `${employee.id}-${dayIndex}`;

    if (
      this.config.allowMultiSelect &&
      (event.ctrlKey || event.metaKey || this.isMultiSelectMode)
    ) {
      this.handleMultiSelection(
        cellKey,
        day,
        employee,
        dayIndex,
        event.shiftKey
      );
    } else {
      this.cellClick.emit({
        day,
        employee,
        dayIndex,
        event,
      });
    }
  }

  onCellDoubleClick(
    day: CalendarDay,
    employee: Employee,
    dayIndex: number,
    event: MouseEvent
  ) {
    if (day.isEditable && this.config.allowCellEditing) {
      // Logique pour l'édition de cellule
      this.startCellEditing(day, employee, dayIndex);
    }
  }

  private startCellEditing(
    day: CalendarDay,
    employee: Employee,
    dayIndex: number
  ) {
    // Cette méthode sera implémentée selon les besoins du mode CRA
    console.log('Start cell editing:', day, employee, dayIndex);
  }

  // Méthodes pour la sélection multiple
  private handleMultiSelection(
    cellKey: string,
    day: CalendarDay,
    employee: Employee,
    dayIndex: number,
    isShiftPressed: boolean
  ) {
    if (
      isShiftPressed &&
      this.lastSelectedCell &&
      this.lastSelectedCell.employeeId === employee.id
    ) {
      this.selectRange(this.lastSelectedCell.dayIndex, dayIndex, employee);
    } else {
      if (this.selectedCells.has(cellKey)) {
        this.selectedCells.delete(cellKey);
      } else {
        this.selectedCells.add(cellKey);
      }
    }

    this.lastSelectedCell = { employeeId: employee.id, dayIndex };
    this.isMultiSelectMode = this.selectedCells.size > 0;
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
      if (dayData && this.canSelectCell(dayData)) {
        const cellKey = `${employee.id}-${i}`;
        this.selectedCells.add(cellKey);
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

  private canSelectCell(day: CalendarDay): boolean {
    return day.isEditable !== false;
  }

  // Méthodes pour le drag selection
  onCellMouseDown(day: CalendarDay, employee: Employee, event: MouseEvent) {
    if (!this.config.allowDragSelect) return;

    const dayIndex = this.getDayIndexForDate(day.date);

    if (!this.canSelectCell(day)) {
      return;
    }

    this.dragStartCell = { employeeId: employee.id, dayIndex };
    this.dragCurrentCells.clear();
    this.dragPreviewCells.clear();

    const cellKey = `${employee.id}-${dayIndex}`;
    this.dragCurrentCells.add(cellKey);
    this.dragPreviewCells.add(cellKey);
  }

  onCellMouseEnter(day: CalendarDay, employee: Employee) {
    this.hoveredEmployeeId = employee.id;
    const dayKey = `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`;
    this.hoveredDayIndex = this.dayIndexMap.get(dayKey);

    if (this.dragStartCell && !this.isDragging) {
      this.isDragging = true;
    }

    if (this.isDragging && this.dragStartCell) {
      this.updateDragSelection(employee, this.hoveredDayIndex || 0);
    }
  }

  onCellMouseUp(day: CalendarDay, employee: Employee, event: MouseEvent) {
    if (this.isDragging) {
      this.finalizeDragSelection(event.ctrlKey || event.metaKey);
    }

    this.isDragging = false;
    this.dragStartCell = undefined;
    this.dragCurrentCells.clear();
    this.dragPreviewCells.clear();
  }

  onGlobalMouseUp(event: MouseEvent) {
    if (this.isDragging || this.dragStartCell) {
      if (this.isDragging && this.dragCurrentCells.size > 0) {
        this.finalizeDragSelection(event.ctrlKey || event.metaKey);
      }

      this.isDragging = false;
      this.dragStartCell = undefined;
      this.dragCurrentCells.clear();
      this.dragPreviewCells.clear();
    }
  }

  private updateDragSelection(
    currentEmployee: Employee,
    currentDayIndex: number
  ) {
    if (!this.dragStartCell) return;

    this.dragPreviewCells.clear();

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
      this.clearSelection();
    }

    this.dragPreviewCells.forEach((cellKey) => {
      if (!this.selectedCells.has(cellKey)) {
        this.selectedCells.add(cellKey);
      }
    });

    this.isDragging = false;
    this.dragStartCell = undefined;
    this.dragCurrentCells.clear();
    this.dragPreviewCells.clear();

    this.isMultiSelectMode = this.selectedCells.size > 0;
  }

  private getEmployeeIndex(employeeId: string): number {
    return this.employeeCalendars.findIndex(
      (ec) => ec.employee.id === employeeId
    );
  }

  clearSelection() {
    this.selectedCells.clear();
    this.isMultiSelectMode = false;
    this.lastSelectedCell = undefined;
  }

  // Méthodes pour le scroll
  calculateScrollDimensions() {
    if (this.datesHeaderContainer?.nativeElement) {
      const clientWidth = this.datesHeaderContainer.nativeElement.clientWidth;
      if (clientWidth > 0) {
        this.containerWidth = clientWidth;

        if (this.config.viewMode === 'month') {
          const daysInMonth = new Date(
            this.selectedYear,
            this.selectedMonth,
            0
          ).getDate();
          this.contentWidth = daysInMonth * this.cellWidth;
        } else {
          this.contentWidth = 365 * this.cellWidth;
        }

        this.maxScrollPosition = Math.max(
          0,
          this.contentWidth - this.containerWidth
        );
      }
    }
  }

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
    if (this.config.viewMode === 'month') return;

    const monthWidth = this.getMonthWidth(monthIndex);
    let targetPosition = 0;

    for (let i = 0; i < monthIndex; i++) {
      targetPosition += this.getMonthWidth(i);
    }

    const centerOffset = (this.containerWidth - monthWidth) / 2;
    targetPosition = targetPosition - centerOffset;

    this.scrollPosition = Math.max(
      0,
      Math.min(this.maxScrollPosition, targetPosition)
    );
    this.updateCurrentMonthFromScrollPosition();
  }

  getMonthWidth(monthIndex: number): number {
    const daysInMonth = new Date(
      this.selectedYear,
      monthIndex + 1,
      0
    ).getDate();
    return daysInMonth * this.cellWidth;
  }

  getMonthStartPosition(monthIndex: number): number {
    let position = 0;
    for (let i = 0; i < monthIndex; i++) {
      position += this.getMonthWidth(i);
    }
    return position;
  }

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
    this.currentMonth = 11;
  }

  // Méthodes pour la scrollbar
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

  // Méthodes pour les changements d'année/mois
  onYearChange() {
    this.clearCache();
    this.yearChange.emit(this.selectedYear);
    setTimeout(() => {
      this.scrollToMonthCenter(this.currentMonth);
    }, 0);
  }

  onMonthChange() {
    this.clearCache();
    this.monthChange.emit(this.selectedMonth);
  }

  private clearCache() {
    this.allDaysCache = undefined;
    this.dayIndexMap.clear();
  }

  // Méthodes pour les classes CSS
  getCellClass(day: CalendarDay, employee: Employee, dayIndex: number): string {
    const classes = ['calendar-cell'];
    const cellKey = `${employee.id}-${dayIndex}`;

    classes.push(`status-${day.status}`);

    if (day.isEditable !== false) {
      classes.push('clickable');
    }

    if (this.selectedCells.has(cellKey)) {
      classes.push('selected');
    }

    if (this.dragPreviewCells.has(cellKey)) {
      classes.push('drag-preview');
    }

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

  // Méthode utilitaire pour formater les dates
  formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR');
  }
}
