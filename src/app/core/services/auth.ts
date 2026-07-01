import { Injectable, computed, signal } from '@angular/core';

import { driverProfile } from '../mocks/driver.mock';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly session = signal(false);

  readonly driver = signal(driverProfile);
  readonly isAuthenticated = computed(() => this.session());

  login(phone: string, password: string): boolean {
    const isValid = phone.trim().length >= 8 && password.trim().length >= 6;

    this.session.set(isValid);
    return isValid;
  }

  changePassword(currentPassword: string, newPassword: string, confirmPassword: string): boolean {
    return (
      currentPassword.trim().length > 0 &&
      newPassword === confirmPassword &&
      newPassword.length >= 6
    );
  }

  logout(): void {
    this.session.set(false);
  }
}
