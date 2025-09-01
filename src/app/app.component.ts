import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TopbarComponent } from './components/topbar/topbar.component';
import { SidebarRightComponent } from './components/sidebar-right/sidebar-right.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    DashboardComponent,
    SidebarComponent,
    TopbarComponent,
    SidebarRightComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Dayla';
}
