import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ChartData {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

@Component({
  selector: 'app-employee-statistics',
  imports: [CommonModule],
  templateUrl: './employee-statistics.component.html',
  styleUrl: './employee-statistics.component.scss',
})
export class EmployeeStatisticsComponent implements OnInit {
  // Données pour les graphiques
  ageGroups: ChartData[] = [];
  categories: ChartData[] = [];
  departments: ChartData[] = [];
  contracts: ChartData[] = [];

  ngOnInit(): void {
    this.initializeData();
  }

  private initializeData(): void {
    // Données simulées pour les tranches d'âge
    this.ageGroups = [
      { label: '18-25 ans', value: 3, percentage: 20, color: '#ff8a4c' },
      { label: '26-35 ans', value: 6, percentage: 40, color: '#2c6fff' },
      { label: '36-45 ans', value: 4, percentage: 26.7, color: '#00d4aa' },
      { label: '46-60 ans', value: 2, percentage: 13.3, color: '#ff6b6b' },
    ];

    // Données simulées pour les catégories
    this.categories = [
      { label: 'Cadres', value: 5, percentage: 33.3, color: '#2c6fff' },
      { label: 'Employés', value: 7, percentage: 46.7, color: '#ff8a4c' },
      { label: 'Techniciens', value: 3, percentage: 20, color: '#00d4aa' },
    ];

    // Données simulées pour les départements
    this.departments = [
      { label: 'IT', value: 6, percentage: 40, color: '#2c6fff' },
      { label: 'RH', value: 3, percentage: 20, color: '#ff8a4c' },
      { label: 'Commercial', value: 4, percentage: 26.7, color: '#00d4aa' },
      { label: 'Finance', value: 2, percentage: 13.3, color: '#ff6b6b' },
    ];

    // Données simulées pour les types de contrats
    this.contracts = [
      { label: 'CDI', value: 12, percentage: 80, color: '#2c6fff' },
      { label: 'CDD', value: 2, percentage: 13.3, color: '#ff8a4c' },
      { label: 'Stage', value: 1, percentage: 6.7, color: '#00d4aa' },
    ];
  }

  // Méthodes pour calculer les totaux
  getTotalAgeGroups(): number {
    return this.ageGroups.reduce((sum, item) => sum + item.value, 0);
  }

  getTotalCategories(): number {
    return this.categories.reduce((sum, item) => sum + item.value, 0);
  }

  getTotalDepartments(): number {
    return this.departments.reduce((sum, item) => sum + item.value, 0);
  }

  getTotalContracts(): number {
    return this.contracts.reduce((sum, item) => sum + item.value, 0);
  }

  // Calculer le stroke-dasharray pour un segment du graphique
  getStrokeDasharray(percentage: number, radius: number): string {
    const circumference = 2 * Math.PI * radius;
    const segmentLength = (percentage / 100) * circumference;
    return `${segmentLength} ${circumference}`;
  }

  // Calculer le stroke-dashoffset pour positionner chaque segment
  getStrokeDashoffset(
    data: ChartData[],
    index: number,
    radius: number
  ): number {
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    // Calculer l'offset basé sur les segments précédents
    for (let i = 0; i < index; i++) {
      offset -= (data[i].percentage / 100) * circumference;
    }

    return offset;
  }

  // Créer un graphique en camembert simple avec un seul cercle coloré
  createSingleChart(
    data: ChartData[],
    radius: number = 72
  ): {
    strokeDasharray: string;
    color: string;
    percentage: number;
  } {
    const totalPercentage = data.reduce(
      (sum, item) => sum + item.percentage,
      0
    );
    const mainColor = data.length > 0 ? data[0].color : '#2c6fff';
    return {
      strokeDasharray: this.getStrokeDasharray(totalPercentage, radius),
      color: mainColor,
      percentage: totalPercentage,
    };
  }
}
