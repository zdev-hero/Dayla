import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, combineLatest } from 'rxjs';

import {
  GenericCalendarComponent,
  CalendarConfig,
  CalendarDay,
  EmployeeCalendar,
  CalendarCellClickEvent,
} from '../generic-calendar/generic-calendar.component';
import { EmployeeService } from '../../services/employee.service';
import { CraService } from '../../services/cra.service';
import { Employee } from '../../models/employee.model';
import {
  CraEntry,
  CraLeaveType,
  CRA_LEAVE_TYPE_LABELS,
} from '../../models/cra.model';
import { CRA_CALENDAR_CONFIG } from '../../config/calendar-configs';

@Component({
  selector: 'app-cra',
  standalone: true,
  imports: [CommonModule, FormsModule, GenericCalendarComponent],
  templateUrl: './cra.component.html',
  styleUrls: ['./cra.component.scss'],
})
export class CraComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Configuration du calendrier
  calendarConfig: CalendarConfig = {
    ...CRA_CALENDAR_CONFIG,
  };

  // Données
  employees: Employee[] = [];
  employeeCalendars: EmployeeCalendar[] = [];
  currentEmployee?: Employee;
  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth() + 1;

  // UI State
  showEditModal = false;
  editingEntry?: { day: CalendarDay; employee: Employee; dayIndex: number };
  editValue: number | CraLeaveType = 1;
  editNotes = '';
  isLeaveType = false;

  // Types de congé disponibles
  leaveTypes = Object.values(CraLeaveType);
  leaveTypeLabels = CRA_LEAVE_TYPE_LABELS;

  // Indicateur de sauvegarde
  isSaving = false;
  saveMessage = '';

  constructor(
    private employeeService: EmployeeService,
    private craService: CraService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData() {
    // Charger uniquement l'employé connecté pour le CRA
    this.employeeService
      .getCurrentEmployee()
      .pipe(takeUntil(this.destroy$))
      .subscribe((employee: Employee | null) => {
        if (employee) {
          this.currentEmployee = employee;
          this.employees = [employee];
          this.generateEmployeeCalendar();
        }
      });
  }

  private generateEmployeeCalendar() {
    if (!this.currentEmployee) return;

    // Charger les entrées CRA pour la période sélectionnée
    this.craService
      .getCraEntries(
        this.currentEmployee.id,
        this.selectedYear,
        this.selectedMonth
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe((entries) => {
        const calendar = this.generateCalendarForEmployee(
          this.currentEmployee!,
          entries
        );
        this.employeeCalendars = [calendar];
      });
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
      let isEditable = true;

      if (isWeekend) {
        status = 'weekend';
        isEditable = false;
      } else if (isHoliday) {
        status = 'holiday';
        isEditable = false;
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
        isEditable = true;
      }

      days.push({
        date: new Date(currentDate),
        dayOfWeek,
        isWeekend,
        isHoliday,
        status,
        value,
        isEditable,
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
    // Jours fériés français 2025 (simplifié)
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

  // Événements du calendrier
  onCellClick(event: CalendarCellClickEvent) {
    if (!event.day.isEditable) return;

    this.editingEntry = {
      day: event.day,
      employee: event.employee,
      dayIndex: event.dayIndex,
    };

    // Initialiser les valeurs d'édition
    if (event.day.data) {
      const entry = event.day.data as CraEntry;
      this.editValue = entry.value;
      this.editNotes = entry.notes || '';
      this.isLeaveType = entry.isLeaveType || false;
    } else {
      this.editValue = 1;
      this.editNotes = '';
      this.isLeaveType = false;
    }

    this.showEditModal = true;
  }

  onYearChange(year: number) {
    this.selectedYear = year;
    this.generateEmployeeCalendar();
  }

  onMonthChange(month: number) {
    this.selectedMonth = month;
    this.generateEmployeeCalendar();
  }

  onManageSelection(event: {
    selectedCells: Set<string>;
    selectedData: { employee: Employee; day: CalendarDay; dayIndex: number }[];
  }) {
    // Pour le CRA, on peut implémenter une gestion groupée si nécessaire
    // Pour l'instant, on affiche juste un message ou on ouvre une modal de saisie groupée
    console.log('Gestion de sélection CRA:', event);

    // Exemple : ouvrir une modal pour saisir des valeurs en lot
    // this.openBulkEditModal(event.selectedData);
  }

  // Gestion du modal d'édition
  closeEditModal() {
    this.showEditModal = false;
    this.editingEntry = undefined;
    this.editValue = 1;
    this.editNotes = '';
    this.isLeaveType = false;
  }

  onValueTypeChange() {
    if (this.isLeaveType) {
      this.editValue = CraLeaveType.VACATION;
    } else {
      this.editValue = 1;
    }
  }

  saveEntry() {
    if (!this.editingEntry || !this.currentEmployee) return;

    this.isSaving = true;
    const { day, employee } = this.editingEntry;

    const entryData: Partial<CraEntry> = {
      id: day.data?.id,
      employeeId: employee.id,
      date: day.date,
      value: this.editValue,
      isLeaveType: this.isLeaveType,
      notes: this.editNotes,
      status: 'draft',
    };

    this.craService
      .saveCraEntry(entryData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (savedEntry) => {
          this.saveMessage = 'Entrée sauvegardée avec succès';
          this.closeEditModal();
          this.generateEmployeeCalendar();

          // Masquer le message après 3 secondes
          setTimeout(() => {
            this.saveMessage = '';
          }, 3000);
        },
        error: (error) => {
          console.error('Erreur lors de la sauvegarde:', error);
          this.saveMessage = 'Erreur lors de la sauvegarde';
          setTimeout(() => {
            this.saveMessage = '';
          }, 3000);
        },
        complete: () => {
          this.isSaving = false;
        },
      });
  }

  deleteEntry() {
    if (!this.editingEntry || !this.editingEntry.day.data) return;

    const entry = this.editingEntry.day.data as CraEntry;

    this.craService
      .deleteCraEntry(entry.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saveMessage = 'Entrée supprimée avec succès';
          this.closeEditModal();
          this.generateEmployeeCalendar();

          setTimeout(() => {
            this.saveMessage = '';
          }, 3000);
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
          this.saveMessage = 'Erreur lors de la suppression';
          setTimeout(() => {
            this.saveMessage = '';
          }, 3000);
        },
      });
  }

  // Soumission du CRA pour validation
  submitCra() {
    if (!this.currentEmployee) return;

    const confirmSubmit = confirm(
      `Êtes-vous sûr de vouloir soumettre votre CRA de ${this.getMonthName(
        this.selectedMonth
      )} ${this.selectedYear} pour validation ?`
    );

    if (!confirmSubmit) return;

    this.craService
      .submitCraMonth(
        this.currentEmployee.id,
        this.selectedYear,
        this.selectedMonth
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saveMessage = 'CRA soumis pour validation avec succès';
          this.generateEmployeeCalendar();

          setTimeout(() => {
            this.saveMessage = '';
          }, 3000);
        },
        error: (error) => {
          console.error('Erreur lors de la soumission:', error);
          this.saveMessage = 'Erreur lors de la soumission';
          setTimeout(() => {
            this.saveMessage = '';
          }, 3000);
        },
      });
  }

  // Méthodes utilitaires
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
    return months[month - 1];
  }

  getLeaveTypeLabel(type: CraLeaveType): string {
    return this.leaveTypeLabels[type];
  }

  // Validation des valeurs numériques
  isValidNumericValue(value: any): boolean {
    return typeof value === 'number' && (value === 0.5 || value === 1);
  }
}
