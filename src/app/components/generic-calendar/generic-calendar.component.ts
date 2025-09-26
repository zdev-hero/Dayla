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
  OnChanges,
  SimpleChanges,
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
  showExportButtons?: boolean;

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
  implements OnInit, AfterViewInit, OnDestroy, OnChanges
{
  @ViewChild('datesHeaderContainer', { static: false })
  datesHeaderContainer!: ElementRef;

  // Inputs
  @Input() config: CalendarConfig = { mode: 'leave-management' };
  @Input() employees: Employee[] = [];
  @Input() employeeCalendars: EmployeeCalendar[] = [];
  @Input() filteredEmployees: Employee[] = [];
  @Input() selectedYear = new Date().getFullYear();
  @Input() selectedMonth = new Date().getMonth() + 1;

  // Outputs
  @Output() cellClick = new EventEmitter<CalendarCellClickEvent>();
  @Output() cellEdit = new EventEmitter<CalendarCellEditEvent>();
  @Output() employeeSearch = new EventEmitter<string>();
  @Output() employeeSelect = new EventEmitter<Employee>();
  @Output() clearEmployeeSearch = new EventEmitter<void>();
  @Output() yearChange = new EventEmitter<number>();
  @Output() monthChange = new EventEmitter<number>();
  @Output() manageSelectionClick = new EventEmitter<{
    selectedCells: Set<string>;
    selectedData: { employee: Employee; day: CalendarDay; dayIndex: number }[];
  }>();

  // Propriétés internes pour le scroll
  scrollPosition = 0;
  maxScrollPosition = 0;
  scrollStep = 120;
  containerWidth = 0;
  contentWidth = 0;
  currentMonth = new Date().getMonth();

  // Propriétés de l'interface
  employeeSearchTerm = '';

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

  // Cache pour les jours fériés par année
  private holidaysCache = new Map<number, Date[]>();

  // Propriétés pour l'exportation
  showExportModal = false;
  selectedEmployeeForExport: Employee | null = null;

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
    return this.config.employeeColumnWidth || 200;
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

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedYear'] || changes['selectedMonth']) {
      this.clearCache();
      setTimeout(() => {
        this.calculateScrollDimensions();
        if (this.config.viewMode === 'year') {
          this.scrollToMonthCenter(this.currentMonth);
        }
      }, 0);
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
    this.employeeSelect.emit(employee);
  }

  clearEmployeeSearchHandler() {
    this.employeeSearchTerm = '';
    this.clearEmployeeSearch.emit();
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

  manageSelection() {
    if (this.selectedCells.size === 0) {
      return;
    }

    // Construire les données sélectionnées
    const selectedData: {
      employee: Employee;
      day: CalendarDay;
      dayIndex: number;
    }[] = [];

    this.selectedCells.forEach((cellKey) => {
      const [employeeId, dayIndexStr] = cellKey.split('-');
      const dayIndex = parseInt(dayIndexStr, 10);

      const empCalendar = this.employeeCalendars.find(
        (ec) => ec.employee.id === employeeId
      );

      if (empCalendar && empCalendar.days[dayIndex]) {
        selectedData.push({
          employee: empCalendar.employee,
          day: empCalendar.days[dayIndex],
          dayIndex: dayIndex,
        });
      }
    });

    // Émettre l'événement avec les données sélectionnées
    this.manageSelectionClick.emit({
      selectedCells: new Set(this.selectedCells),
      selectedData: selectedData,
    });
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
      this.calculateScrollDimensions();
      if (this.config.viewMode === 'year') {
        this.scrollToMonthCenter(this.currentMonth);
      }
    }, 0);
  }

  onMonthChange() {
    this.clearCache();
    this.monthChange.emit(this.selectedMonth);
    setTimeout(() => {
      this.calculateScrollDimensions();
    }, 0);
  }

  private clearCache() {
    this.allDaysCache = undefined;
    this.dayIndexMap.clear();
    this.holidaysCache.clear();
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

  // Méthodes pour l'exportation
  openExportModal(employee: Employee, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedEmployeeForExport = employee;
    this.showExportModal = true;
  }

  closeExportModal(): void {
    this.showExportModal = false;
    this.selectedEmployeeForExport = null;
  }

  exportEmployee(format: 'excel' | 'pdf' | 'csv' | 'json'): void {
    if (!this.selectedEmployeeForExport) return;

    const employee = this.selectedEmployeeForExport;
    const employeeCalendar = this.employeeCalendars.find(
      (cal) => cal.employee.id === employee.id
    );

    if (!employeeCalendar) {
      console.error("Calendrier introuvable pour l'employé:", employee);
      return;
    }

    switch (format) {
      case 'excel':
        this.exportToExcel(employee, employeeCalendar);
        break;
      case 'pdf':
        this.exportToPdf(employee, employeeCalendar);
        break;
      case 'csv':
        this.exportToCsv(employee, employeeCalendar);
        break;
      case 'json':
        this.exportToJson(employee, employeeCalendar);
        break;
    }

    this.closeExportModal();
  }

  private exportToExcel(employee: Employee, calendar: EmployeeCalendar): void {
    // Préparer les données pour Excel
    const data: any[] = [];

    // En-tête
    data.push(['Date', 'Jour', 'Statut', 'Valeur', 'Type de jour']);

    // Données des jours
    calendar.days.forEach((day) => {
      const dayType = day.isHoliday
        ? 'Férié'
        : day.isWeekend
        ? 'Week-end'
        : 'Ouvré';

      data.push([
        this.formatDate(day.date),
        this.weekDays[day.dayOfWeek],
        day.status,
        day.value || '',
        dayType,
      ]);
    });

    // Créer et télécharger le fichier Excel
    this.downloadExcelFile(data, employee);
  }

  private exportToPdf(employee: Employee, calendar: EmployeeCalendar): void {
    // Créer le contenu HTML pour le PDF
    const htmlContent = this.generatePdfContent(employee, calendar);

    // Ouvrir dans une nouvelle fenêtre pour impression/sauvegarde
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();

      // Déclencher l'impression après un court délai
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  }

  private exportToCsv(employee: Employee, calendar: EmployeeCalendar): void {
    const csvContent: string[] = [];

    // En-tête CSV
    csvContent.push('Date,Jour,Statut,Valeur,Type de jour');

    // Données
    calendar.days.forEach((day) => {
      const dayType = day.isHoliday
        ? 'Férié'
        : day.isWeekend
        ? 'Week-end'
        : 'Ouvré';

      csvContent.push(
        [
          this.formatDate(day.date),
          this.weekDays[day.dayOfWeek],
          day.status,
          day.value || '',
          dayType,
        ]
          .map((field) => `"${field}"`)
          .join(',')
      );
    });

    // Télécharger le fichier CSV
    this.downloadFile(
      csvContent.join('\n'),
      `CRA_${employee.firstName}_${employee.lastName}_${this.getMonthName(
        this.selectedMonth
      )}_${this.selectedYear}.csv`,
      'text/csv'
    );
  }

  private exportToJson(employee: Employee, calendar: EmployeeCalendar): void {
    const jsonData = {
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        department: employee.department,
        position: employee.position,
      },
      period: {
        year: this.selectedYear,
        month: this.selectedMonth,
        monthName: this.getMonthName(this.selectedMonth),
      },
      exportDate: new Date().toISOString(),
      days: calendar.days.map((day) => ({
        date: day.date.toISOString(),
        dayOfWeek: day.dayOfWeek,
        dayName: this.weekDays[day.dayOfWeek],
        isWeekend: day.isWeekend,
        isHoliday: day.isHoliday,
        status: day.status,
        value: day.value,
        isEditable: day.isEditable,
        data: day.data,
      })),
    };

    // Télécharger le fichier JSON
    this.downloadFile(
      JSON.stringify(jsonData, null, 2),
      `CRA_${employee.firstName}_${employee.lastName}_${this.getMonthName(
        this.selectedMonth
      )}_${this.selectedYear}.json`,
      'application/json'
    );
  }

  private downloadExcelFile(data: any[][], employee: Employee): void {
    // Créer un tableau HTML pour simuler un fichier Excel
    let htmlContent = '<table border="1">';

    data.forEach((row, index) => {
      htmlContent += '<tr>';
      row.forEach((cell) => {
        const tag = index === 0 ? 'th' : 'td';
        htmlContent += `<${tag}>${cell}</${tag}>`;
      });
      htmlContent += '</tr>';
    });

    htmlContent += '</table>';

    // Créer et télécharger le fichier
    const fileName = `CRA_${employee.firstName}_${
      employee.lastName
    }_${this.getMonthName(this.selectedMonth)}_${this.selectedYear}.xls`;
    this.downloadFile(htmlContent, fileName, 'application/vnd.ms-excel');
  }

  private generatePdfContent(
    employee: Employee,
    calendar: EmployeeCalendar
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>CRA - ${employee.firstName} ${employee.lastName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .employee-info { margin-bottom: 20px; }
          .table { width: 100%; border-collapse: collapse; }
          .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .table th { background-color: #f2f2f2; }
          .weekend { background-color: #ffe6e6; }
          .holiday { background-color: #fff2cc; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Compte Rendu d'Activité</h1>
          <h2>${this.getMonthName(this.selectedMonth)} ${this.selectedYear}</h2>
        </div>
        
        <div class="employee-info">
          <h3>Employé: ${employee.firstName} ${employee.lastName}</h3>
          <p>Email: ${employee.email}</p>
          <p>Département: ${employee.department}</p>
          <p>Poste: ${employee.position}</p>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Jour</th>
              <th>Statut</th>
              <th>Valeur</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            ${calendar.days
              .map((day) => {
                const dayType = day.isHoliday
                  ? 'Férié'
                  : day.isWeekend
                  ? 'Week-end'
                  : 'Ouvré';
                const cssClass = day.isHoliday
                  ? 'holiday'
                  : day.isWeekend
                  ? 'weekend'
                  : '';

                return `
                <tr class="${cssClass}">
                  <td>${this.formatDate(day.date)}</td>
                  <td>${this.weekDays[day.dayOfWeek]}</td>
                  <td>${day.status}</td>
                  <td>${day.value || ''}</td>
                  <td>${dayType}</td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Généré le ${new Date().toLocaleDateString(
            'fr-FR'
          )} à ${new Date().toLocaleTimeString('fr-FR')}</p>
        </div>
      </body>
      </html>
    `;
  }

  private downloadFile(
    content: string,
    fileName: string,
    mimeType: string
  ): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  getMonthName(month: number): string {
    return this.months[month - 1] || month.toString();
  }
}
