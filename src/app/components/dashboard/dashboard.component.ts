import { Component } from '@angular/core';
import { LeaveRequestsTableComponent } from '../leave-requests-table/leave-requests-table.component';
import { EmployeeProfileComponent } from '../employee-profile/employee-profile.component';
import { LeaveAnalysisComponent } from '../leave-analysis/leave-analysis.component';
import { BalanceChartComponent } from '../balance-chart/balance-chart.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    LeaveRequestsTableComponent,
    EmployeeProfileComponent,
    LeaveAnalysisComponent,
    BalanceChartComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {}
