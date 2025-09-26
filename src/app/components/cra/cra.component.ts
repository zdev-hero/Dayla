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
import { YearPickerComponent } from '../year-picker/year-picker.component';
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
  imports: [
    CommonModule,
    FormsModule,
    GenericCalendarComponent,
    YearPickerComponent,
  ],
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

  // Cache pour les jours fériés par année
  private holidaysCache = new Map<number, Date[]>();

  // UI State
  showEditModal = false;
  editingEntry?: { day: CalendarDay; employee: Employee; dayIndex: number };
  editValue: number | CraLeaveType = 1;
  editNotes = '';
  isLeaveType = false;

  // État pour la sélection multiple
  isBulkEdit = false;
  selectedBulkData: {
    employee: Employee;
    day: CalendarDay;
    dayIndex: number;
  }[] = [];

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
    // Mise à jour de la configuration pour s'assurer du mode mensuel
    this.calendarConfig = {
      ...CRA_CALENDAR_CONFIG,
      viewMode: 'month',
    };
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

      if (isHoliday) {
        status = 'holiday';
        isEditable = false;
      } else if (isWeekend) {
        status = 'weekend';
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
    setTimeout(() => {
      this.generateEmployeeCalendar();
    }, 0);
  }

  onMonthChange(month: number) {
    this.selectedMonth = month;
    setTimeout(() => {
      this.generateEmployeeCalendar();
    }, 0);
  }

  onManageSelection(event: {
    selectedCells: Set<string>;
    selectedData: { employee: Employee; day: CalendarDay; dayIndex: number }[];
  }) {
    // Si des cellules sont sélectionnées, ouvrir la popup de saisie d'activité
    if (event.selectedData && event.selectedData.length > 0) {
      // Prendre la première cellule sélectionnée pour initialiser la popup
      // En mode CRA, il n'y a qu'un seul employé donc on prend le premier élément
      const firstSelection = event.selectedData[0];

      // Vérifier que la cellule est éditable
      if (!firstSelection.day.isEditable) {
        this.saveMessage =
          'Impossible de modifier des jours non travaillés (week-ends, jours fériés)';
        setTimeout(() => {
          this.saveMessage = '';
        }, 3000);
        return;
      }

      // Configurer la popup pour la sélection multiple
      this.editingEntry = {
        day: firstSelection.day,
        employee: firstSelection.employee,
        dayIndex: firstSelection.dayIndex,
      };

      // Stocker toutes les données sélectionnées pour la sauvegarde groupée
      this.selectedBulkData = event.selectedData.filter(
        (item) => item.day.isEditable
      );

      // Initialiser les valeurs d'édition avec les valeurs de la première cellule
      if (firstSelection.day.data) {
        const entry = firstSelection.day.data as CraEntry;
        this.editValue = entry.value;
        this.editNotes = entry.notes || '';
        this.isLeaveType = entry.isLeaveType || false;
      } else {
        this.editValue = 1;
        this.editNotes = '';
        this.isLeaveType = false;
      }

      // Marquer que nous sommes en mode sélection multiple
      this.isBulkEdit = true;
      this.showEditModal = true;
    }
  }

  // Gestion du modal d'édition
  closeEditModal() {
    this.showEditModal = false;
    this.editingEntry = undefined;
    this.editValue = 1;
    this.editNotes = '';
    this.isLeaveType = false;

    // Réinitialiser les variables de sélection multiple
    this.isBulkEdit = false;
    this.selectedBulkData = [];
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

    // Si on est en mode sélection multiple, sauvegarder toutes les entrées sélectionnées
    if (this.isBulkEdit && this.selectedBulkData.length > 0) {
      this.saveBulkEntries();
      return;
    }

    // Sinon, sauvegarder une seule entrée
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

  private saveBulkEntries() {
    if (!this.currentEmployee || this.selectedBulkData.length === 0) {
      this.isSaving = false;
      return;
    }

    const entryPromises = this.selectedBulkData.map((selection) => {
      const entryData: Partial<CraEntry> = {
        id: selection.day.data?.id,
        employeeId: selection.employee.id,
        date: selection.day.date,
        value: this.editValue,
        isLeaveType: this.isLeaveType,
        notes: this.editNotes,
        status: 'draft',
      };

      return this.craService
        .saveCraEntry(entryData)
        .pipe(takeUntil(this.destroy$));
    });

    // Utiliser combineLatest pour attendre que toutes les sauvegardes soient terminées
    combineLatest(entryPromises).subscribe({
      next: (savedEntries) => {
        const count = savedEntries.length;
        this.saveMessage = `${count} entrée${count > 1 ? 's' : ''} sauvegardée${
          count > 1 ? 's' : ''
        } avec succès`;
        this.closeEditModal();
        this.generateEmployeeCalendar();

        // Masquer le message après 3 secondes
        setTimeout(() => {
          this.saveMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Erreur lors de la sauvegarde en lot:', error);
        this.saveMessage = 'Erreur lors de la sauvegarde des entrées';
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
    if (!this.editingEntry) return;

    // Si on est en mode sélection multiple, supprimer toutes les entrées sélectionnées
    if (this.isBulkEdit && this.selectedBulkData.length > 0) {
      this.deleteBulkEntries();
      return;
    }

    // Sinon, supprimer une seule entrée
    if (!this.editingEntry.day.data) return;

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

  private deleteBulkEntries() {
    if (!this.currentEmployee || this.selectedBulkData.length === 0) {
      return;
    }

    // Filtrer seulement les entrées qui ont des données (qui existent dans la base)
    const entriesToDelete = this.selectedBulkData.filter(
      (selection) => selection.day.data
    );

    if (entriesToDelete.length === 0) {
      this.saveMessage = 'Aucune entrée à supprimer';
      setTimeout(() => {
        this.saveMessage = '';
      }, 3000);
      this.closeEditModal();
      return;
    }

    const confirmDelete = confirm(
      `Êtes-vous sûr de vouloir supprimer ${entriesToDelete.length} entrée${
        entriesToDelete.length > 1 ? 's' : ''
      } ?`
    );

    if (!confirmDelete) return;

    const deletePromises = entriesToDelete.map((selection) => {
      const entry = selection.day.data as CraEntry;
      return this.craService
        .deleteCraEntry(entry.id)
        .pipe(takeUntil(this.destroy$));
    });

    // Utiliser combineLatest pour attendre que toutes les suppressions soient terminées
    combineLatest(deletePromises).subscribe({
      next: (deletedEntries) => {
        const count = deletedEntries.length;
        this.saveMessage = `${count} entrée${count > 1 ? 's' : ''} supprimée${
          count > 1 ? 's' : ''
        } avec succès`;
        this.closeEditModal();
        this.generateEmployeeCalendar();

        // Masquer le message après 3 secondes
        setTimeout(() => {
          this.saveMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Erreur lors de la suppression en lot:', error);
        this.saveMessage = 'Erreur lors de la suppression des entrées';
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

  // Méthodes pour les conditions du template
  shouldShowDeleteButton(): boolean {
    if (!this.editingEntry) return false;

    if (this.isBulkEdit) {
      return this.selectedBulkData.some((item) => item.day.data);
    }

    return !!this.editingEntry.day.data;
  }

  getDeleteButtonText(): string {
    if (this.isBulkEdit && this.selectedBulkData.length > 1) {
      const countWithData = this.selectedBulkData.filter(
        (item) => item.day.data
      ).length;
      return `Supprimer (${countWithData})`;
    }

    return 'Supprimer';
  }
}
