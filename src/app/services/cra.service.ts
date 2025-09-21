import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import {
  CraEntry,
  CraMonth,
  CraLeaveType,
  CraSummary,
  CraValidationRule,
} from '../models/cra.model';

@Injectable({
  providedIn: 'root',
})
export class CraService {
  private craEntriesSubject = new BehaviorSubject<CraEntry[]>([]);
  private craMonthsSubject = new BehaviorSubject<CraMonth[]>([]);

  // Données mockes pour le développement
  private mockCraEntries: CraEntry[] = [];
  private mockCraMonths: CraMonth[] = [];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Initialiser avec des données vides pour le moment
    // Les vraies données seront chargées depuis l'API
    this.craEntriesSubject.next(this.mockCraEntries);
    this.craMonthsSubject.next(this.mockCraMonths);
  }

  // Récupérer les entrées CRA pour un employé et une période
  getCraEntries(
    employeeId: string,
    year: number,
    month?: number
  ): Observable<CraEntry[]> {
    const entries = this.mockCraEntries.filter((entry) => {
      const entryDate = new Date(entry.date);
      const matchesEmployee = entry.employeeId === employeeId;
      const matchesYear = entryDate.getFullYear() === year;
      const matchesMonth = month ? entryDate.getMonth() + 1 === month : true;

      return matchesEmployee && matchesYear && matchesMonth;
    });

    return of(entries);
  }

  // Créer ou mettre à jour une entrée CRA
  saveCraEntry(entry: Partial<CraEntry>): Observable<CraEntry> {
    const now = new Date();

    if (entry.id) {
      // Mise à jour
      const index = this.mockCraEntries.findIndex((e) => e.id === entry.id);
      if (index !== -1) {
        this.mockCraEntries[index] = {
          ...this.mockCraEntries[index],
          ...entry,
          updatedAt: now,
        } as CraEntry;
        this.craEntriesSubject.next([...this.mockCraEntries]);
        return of(this.mockCraEntries[index]);
      }
    }

    // Création
    const newEntry: CraEntry = {
      id: this.generateId(),
      employeeId: entry.employeeId!,
      date: entry.date!,
      value: entry.value!,
      isLeaveType: entry.isLeaveType || false,
      notes: entry.notes || '',
      status: entry.status || 'draft',
      createdAt: now,
      updatedAt: now,
    };

    this.mockCraEntries.push(newEntry);
    this.craEntriesSubject.next([...this.mockCraEntries]);

    return of(newEntry);
  }

  // Supprimer une entrée CRA
  deleteCraEntry(entryId: string): Observable<void> {
    this.mockCraEntries = this.mockCraEntries.filter(
      (entry) => entry.id !== entryId
    );
    this.craEntriesSubject.next([...this.mockCraEntries]);
    return of(void 0);
  }

  // Récupérer le résumé CRA pour un employé et une période
  getCraSummary(
    employeeId: string,
    year: number,
    month: number
  ): Observable<CraSummary> {
    const entries = this.mockCraEntries.filter((entry) => {
      const entryDate = new Date(entry.date);
      return (
        entry.employeeId === employeeId &&
        entryDate.getFullYear() === year &&
        entryDate.getMonth() + 1 === month
      );
    });

    const totalWorkedDays = entries.filter(
      (entry) => typeof entry.value === 'number' && entry.value > 0
    ).length;

    const leavesByType: { [key in CraLeaveType]?: number } = {};
    entries.forEach((entry) => {
      if (entry.isLeaveType && typeof entry.value === 'string') {
        const leaveType = entry.value as CraLeaveType;
        leavesByType[leaveType] = (leavesByType[leaveType] || 0) + 1;
      }
    });

    const craMonth = this.mockCraMonths.find(
      (m) => m.employeeId === employeeId && m.year === year && m.month === month
    );

    const summary: CraSummary = {
      employeeId,
      period: { year, month },
      totalWorkedDays,
      totalPlannedDays: this.getWorkingDaysInMonth(year, month),
      leavesByType,
      status: craMonth?.status || 'draft',
    };

    return of(summary);
  }

  // Soumettre le CRA d'un mois pour validation
  submitCraMonth(
    employeeId: string,
    year: number,
    month: number
  ): Observable<CraMonth> {
    let craMonth = this.mockCraMonths.find(
      (m) => m.employeeId === employeeId && m.year === year && m.month === month
    );

    const entries = this.mockCraEntries.filter((entry) => {
      const entryDate = new Date(entry.date);
      return (
        entry.employeeId === employeeId &&
        entryDate.getFullYear() === year &&
        entryDate.getMonth() + 1 === month
      );
    });

    if (!craMonth) {
      craMonth = {
        employeeId,
        year,
        month,
        entries,
        totalDays: entries.length,
        status: 'submitted',
        submittedAt: new Date(),
      };
      this.mockCraMonths.push(craMonth);
    } else {
      craMonth.status = 'submitted';
      craMonth.submittedAt = new Date();
      craMonth.entries = entries;
    }

    // Mettre à jour le statut des entrées
    entries.forEach((entry) => {
      entry.status = 'submitted';
    });

    this.craMonthsSubject.next([...this.mockCraMonths]);
    this.craEntriesSubject.next([...this.mockCraEntries]);

    return of(craMonth);
  }

  // Valider le CRA d'un employé (pour les managers)
  validateCraMonth(
    employeeId: string,
    year: number,
    month: number
  ): Observable<CraMonth> {
    const craMonth = this.mockCraMonths.find(
      (m) => m.employeeId === employeeId && m.year === year && m.month === month
    );

    if (craMonth) {
      craMonth.status = 'validated';
      craMonth.validatedAt = new Date();

      // Mettre à jour le statut des entrées
      craMonth.entries.forEach((entry) => {
        entry.status = 'validated';
      });

      this.craMonthsSubject.next([...this.mockCraMonths]);
      this.craEntriesSubject.next([...this.mockCraEntries]);
    }

    return of(craMonth!);
  }

  // Rejeter le CRA d'un employé (pour les managers)
  rejectCraMonth(
    employeeId: string,
    year: number,
    month: number,
    reason: string
  ): Observable<CraMonth> {
    const craMonth = this.mockCraMonths.find(
      (m) => m.employeeId === employeeId && m.year === year && m.month === month
    );

    if (craMonth) {
      craMonth.status = 'rejected';

      // Mettre à jour le statut des entrées
      craMonth.entries.forEach((entry) => {
        entry.status = 'rejected';
      });

      this.craMonthsSubject.next([...this.mockCraMonths]);
      this.craEntriesSubject.next([...this.mockCraEntries]);
    }

    return of(craMonth!);
  }

  // Récupérer les règles de validation CRA
  getValidationRules(): Observable<CraValidationRule> {
    const defaultRules: CraValidationRule = {
      minHoursPerDay: 0,
      maxHoursPerDay: 1,
      standardWorkingDays: [1, 2, 3, 4, 5], // Lundi à vendredi
      allowHalfDays: true,
      requireNotes: false,
    };

    return of(defaultRules);
  }

  // Valider une entrée CRA
  validateCraEntry(
    entry: Partial<CraEntry>
  ): Observable<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (entry.value === undefined || entry.value === null) {
      errors.push('La valeur est obligatoire');
    }

    if (typeof entry.value === 'number') {
      if (entry.value < 0 || entry.value > 1) {
        errors.push('La valeur doit être comprise entre 0 et 1');
      }
      if (entry.value === 0.5 && !this.isValidHalfDay(entry.date!)) {
        errors.push('Les demi-journées ne sont pas autorisées pour ce jour');
      }
    }

    return of({
      valid: errors.length === 0,
      errors,
    });
  }

  // Calculer le nombre de jours ouvrés dans un mois
  private getWorkingDaysInMonth(year: number, month: number): number {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    let workingDays = 0;

    for (
      let date = new Date(startDate);
      date <= endDate;
      date.setDate(date.getDate() + 1)
    ) {
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Lundi à vendredi
        workingDays++;
      }
    }

    return workingDays;
  }

  // Vérifier si une demi-journée est valide pour une date
  private isValidHalfDay(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5; // Lundi à vendredi seulement
  }

  // Générer un ID unique
  private generateId(): string {
    return 'cra_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  // Observables pour les components
  getCraEntriesObservable(): Observable<CraEntry[]> {
    return this.craEntriesSubject.asObservable();
  }

  getCraMonthsObservable(): Observable<CraMonth[]> {
    return this.craMonthsSubject.asObservable();
  }

  // Méthode pour sauvegarder en lot (pour l'import de données)
  saveBulkCraEntries(entries: Partial<CraEntry>[]): Observable<CraEntry[]> {
    const savedEntries: CraEntry[] = [];

    entries.forEach((entry) => {
      this.saveCraEntry(entry).subscribe((savedEntry) => {
        savedEntries.push(savedEntry);
      });
    });

    return of(savedEntries);
  }
}
