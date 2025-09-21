import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-year-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './year-picker.component.html',
  styleUrls: ['./year-picker.component.scss'],
})
export class YearPickerComponent implements OnInit {
  @Input() selectedYear: number = new Date().getFullYear();
  @Input() minYear: number = 2020;
  @Input() maxYear: number = new Date().getFullYear() + 10;
  @Input() showTrigger: boolean = true; // Afficher le bouton déclencheur
  @Input() isOpen: boolean = false; // Contrôle externe de l'ouverture

  @Output() yearChange = new EventEmitter<number>();
  @Output() openStateChange = new EventEmitter<boolean>();

  years: number[] = [];
  currentDecade: { start: number; end: number } = { start: 2020, end: 2029 };

  ngOnInit() {
    this.initializeDecade();
    this.generateYears();
  }

  private initializeDecade() {
    const selectedDecadeStart = Math.floor(this.selectedYear / 10) * 10;
    this.currentDecade = {
      start: selectedDecadeStart,
      end: selectedDecadeStart + 9,
    };
  }

  private generateYears() {
    this.years = [];
    for (
      let year = this.currentDecade.start;
      year <= this.currentDecade.end;
      year++
    ) {
      this.years.push(year);
    }
  }

  togglePicker() {
    if (this.showTrigger) {
      this.isOpen = !this.isOpen;
      this.openStateChange.emit(this.isOpen);
    }
  }

  selectYear(year: number) {
    if (year >= this.minYear && year <= this.maxYear) {
      this.selectedYear = year;
      this.yearChange.emit(year);
      this.closePicker();
    }
  }

  closePicker() {
    this.isOpen = false;
    this.openStateChange.emit(this.isOpen);
  }

  previousDecade() {
    if (this.currentDecade.start > this.minYear) {
      this.currentDecade.start -= 10;
      this.currentDecade.end -= 10;
      this.generateYears();
    }
  }

  nextDecade() {
    if (this.currentDecade.end < this.maxYear) {
      this.currentDecade.start += 10;
      this.currentDecade.end += 10;
      this.generateYears();
    }
  }

  get canGoPreviousDecade(): boolean {
    return this.currentDecade.start > this.minYear;
  }

  get canGoNextDecade(): boolean {
    return this.currentDecade.end < this.maxYear;
  }

  get decadeLabel(): string {
    return `${this.currentDecade.start} - ${this.currentDecade.end}`;
  }

  isYearDisabled(year: number): boolean {
    return year < this.minYear || year > this.maxYear;
  }

  isCurrentYear(year: number): boolean {
    return year === new Date().getFullYear();
  }

  isSelectedYear(year: number): boolean {
    return year === this.selectedYear;
  }
}
