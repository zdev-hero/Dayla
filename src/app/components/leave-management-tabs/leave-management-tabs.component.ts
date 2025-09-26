import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import { LeaveRequestsComponent } from '../leave-requests/leave-requests.component';
import { AbsenceListComponent } from '../absence-list/absence-list.component';

@Component({
  selector: 'app-leave-management-tabs',
  imports: [CommonModule, LeaveRequestsComponent, AbsenceListComponent],
  templateUrl: './leave-management-tabs.component.html',
  styleUrl: './leave-management-tabs.component.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate(
          '300ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
  ],
})
export class LeaveManagementTabsComponent implements OnInit {
  // Gestion des onglets
  activeTab: 'leave-requests' | 'absence-list' = 'leave-requests';

  constructor() {}

  ngOnInit(): void {}

  /**
   * Change l'onglet actif
   * @param tab - L'onglet à activer
   */
  setActiveTab(tab: 'leave-requests' | 'absence-list'): void {
    this.activeTab = tab;
    console.log('Onglet activé:', tab);
  }

  /**
   * Vérifie si un onglet est actif
   * @param tab - L'onglet à vérifier
   * @returns true si l'onglet est actif
   */
  isActiveTab(tab: 'leave-requests' | 'absence-list'): boolean {
    return this.activeTab === tab;
  }
}
