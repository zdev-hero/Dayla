import { Routes } from '@angular/router';
import { LeaveCalendarComponent } from './components/leave-calendar/leave-calendar.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/main-dashboard/main-dashboard.component').then(
        (m) => m.MainDashboardComponent
      ),
  },
  {
    path: 'employees',
    loadComponent: () =>
      import(
        './components/employee-dashboard/employee-dashboard.component'
      ).then((m) => m.EmployeeDashboardComponent),
  },
  {
    path: 'leave-requests',
    loadComponent: () =>
      import(
        './components/leave-management-tabs/leave-management-tabs.component'
      ).then((m) => m.LeaveManagementTabsComponent),
  },
  { path: 'leave-calendar', component: LeaveCalendarComponent },
  {
    path: 'cra',
    loadComponent: () =>
      import('./components/cra/cra.component').then((m) => m.CraComponent),
  },
  {
    path: 'all-cra',
    loadComponent: () =>
      import('./components/all-cra/all-cra.component').then(
        (m) => m.AllCraComponent
      ),
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./components/leave-analytics/leave-analytics.component').then(
        (m) => m.LeaveAnalyticsComponent
      ),
  },
  { path: '**', redirectTo: '/dashboard' },
];
