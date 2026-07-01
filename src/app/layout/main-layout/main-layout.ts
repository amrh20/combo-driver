import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/services/auth';
import { ComboButton } from '../../shared/components';

@Component({
  selector: 'app-main-layout',
  imports: [ComboButton, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly driver = this.authService.driver;

  readonly navItems = [
    { label: 'الرئيسية', hint: 'Home', link: '/home' },
    { label: 'المحفظة', hint: 'Wallet', link: '/wallet' },
    { label: 'السجل', hint: 'History', link: '/history' },
    { label: 'الشيفت', hint: 'Shifts', link: '/shifts' }
  ];

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/auth/login']);
  }
}
