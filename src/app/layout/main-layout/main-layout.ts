import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService, landingPath } from '../../core/services/auth';
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
  readonly loggingOut = signal(false);

  readonly navItems = computed(() => [
    { label: 'الرئيسية', hint: 'Home', link: landingPath(this.authService.currentUserRole()) },
    { label: 'المحفظة', hint: 'Wallet', link: '/wallet' },
    { label: 'السجل', hint: 'History', link: '/history' },
    { label: 'الشيفت', hint: 'Shifts', link: '/shifts' }
  ]);

  logout(): void {
    if (this.loggingOut()) {
      return;
    }

    this.loggingOut.set(true);

    this.authService.logout().subscribe({
      next: () => {
        void this.router.navigate(['/auth/login']);
      },
      error: () => {
        void this.router.navigate(['/auth/login']);
      },
    });
  }
}
