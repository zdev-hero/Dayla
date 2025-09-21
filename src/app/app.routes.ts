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
      import('./components/leave-requests/leave-requests.component').then(
        (m) => m.LeaveRequestsComponent
      ),
  },
  { path: 'leave-calendar', component: LeaveCalendarComponent },
  {
    path: 'cra',
    loadComponent: () =>
      import('./components/cra/cra.component').then((m) => m.CraComponent),
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
