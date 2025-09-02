import { Component } from '@angular/core';
import { LeaveRequestsComponent } from '../leave-requests/leave-requests.component';
import { EmployeeDashboardComponent } from '../employee-dashboard/employee-dashboard.component';
import { LeaveAnalyticsComponent } from '../leave-analytics/leave-analytics.component';
import { LeaveBalanceOverviewComponent } from '../leave-balance-overview/leave-balance-overview.component';

@Component({
  selector: 'app-main-dashboard',
  imports: [
    LeaveRequestsComponent,
    EmployeeDashboardComponent,
    LeaveAnalyticsComponent,
    LeaveBalanceOverviewComponent,
  ],
  templateUrl: './main-dashboard.component.html',
  styleUrl: './main-dashboard.component.scss',
})
export class MainDashboardComponent {}
