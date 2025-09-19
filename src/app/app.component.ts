import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationMenuComponent } from './components/navigation-menu/navigation-menu.component';
import { HeaderNavigationComponent } from './components/header-navigation/header-navigation.component';
import { QuickActionsPanelComponent } from './components/quick-actions-panel/quick-actions-panel.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    NavigationMenuComponent,
    HeaderNavigationComponent,
    QuickActionsPanelComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'Dayla';
}
