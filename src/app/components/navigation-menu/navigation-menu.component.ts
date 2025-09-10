import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-navigation-menu',
  imports: [CommonModule, FormsModule],
  templateUrl: './navigation-menu.component.html',
  styleUrl: './navigation-menu.component.scss',
})
export class NavigationMenuComponent {
  // Données pour le graphique
  totalEmployees = 15;
  presentEmployees = 10;

  // Période sélectionnée
  selectedPeriod: 'week' | 'month' = 'week';

  // Dates (format ISO pour les inputs date)
  startDate: string = '';
  endDate: string = '';
  currentDate: string = '';

  constructor() {
    // Initialiser avec la date du jour
    const today = new Date();
    this.currentDate = this.formatDateDisplay(today);
    this.initializeDates();
  }

  ngOnInit() {
    this.updateChartData();
  }

  // Initialiser les dates selon la période
  initializeDates() {
    const today = new Date();

    if (this.selectedPeriod === 'week') {
      // Début de la semaine (lundi)
      const startOfWeek = new Date(today);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);

      // Fin de la semaine (dimanche)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      this.startDate = this.formatDateInput(startOfWeek);
      this.endDate = this.formatDateInput(endOfWeek);
    } else {
      // Début du mois
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      // Fin du mois
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      this.startDate = this.formatDateInput(startOfMonth);
      this.endDate = this.formatDateInput(endOfMonth);
    }
  }

  // Changer de période
  onPeriodChange(period: 'week' | 'month') {
    this.selectedPeriod = period;
    this.initializeDates();
    this.updateChartData();
  }

  // Revenir à la date du jour
  goToToday() {
    this.initializeDates();
    this.updateChartData();
  }

  // Mettre à jour les données du graphique
  updateChartData() {
    // Ici vous pourrez appeler votre service pour récupérer les vraies données
    // Pour l'instant, on simule des données
    if (this.selectedPeriod === 'week') {
      this.presentEmployees = 10;
      this.totalEmployees = 15;
    } else {
      this.presentEmployees = 12;
      this.totalEmployees = 15;
    }
  }

  // Calculer le pourcentage pour le graphique circulaire
  get presentPercentage(): number {
    return (this.presentEmployees / this.totalEmployees) * 100;
  }

  // Calculer le stroke-dasharray pour le graphique SVG
  get strokeDasharray(): string {
    const circumference = 2 * Math.PI * 52; // rayon = 52
    const presentLength = (this.presentPercentage / 100) * circumference;
    const absentLength = circumference - presentLength;
    return `${presentLength} ${absentLength}`;
  }

  // Formater une date pour l'affichage (JJ/MM/AAAA)
  formatDateDisplay(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  // Formater une date pour les inputs (YYYY-MM-DD)
  formatDateInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Gérer le changement de date de début
  onStartDateChange() {
    this.updateChartData();
  }

  // Gérer le changement de date de fin
  onEndDateChange() {
    this.updateChartData();
  }
}
