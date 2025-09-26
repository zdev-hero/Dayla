import { Component } from '@angular/core';
import { LeaveRequestsComponent } from '../leave-requests/leave-requests.component';
import { LeaveBalanceOverviewComponent } from '../leave-balance-overview/leave-balance-overview.component';
import { LeaveManagementTabsComponent } from '../leave-management-tabs/leave-management-tabs.component';

@Component({
  selector: 'app-main-dashboard',
  imports: [LeaveManagementTabsComponent, LeaveBalanceOverviewComponent],
  templateUrl: './main-dashboard.component.html',
  styleUrl: './main-dashboard.component.scss',
})
export class MainDashboardComponent {}
