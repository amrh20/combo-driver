import { Injectable, computed, signal } from '@angular/core';

import { driverProfile } from '../mocks/driver.mock';

export type DriverRole = 'COLLECTOR' | 'DELIVERY' | 'BOTH';

const MOCK_ROLE_STORAGE_KEY = 'combo-driver-mock-role';
const DEFAULT_DRIVER_ROLE: DriverRole = 'BOTH';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly session = signal(false);
  private readonly userRole = signal<DriverRole>(this.readStoredRole());

  readonly driver = signal(driverProfile);
  readonly isAuthenticated = computed(() => this.session());
  readonly currentUserRole = this.userRole.asReadonly();

  login(phone: string, password: string, mockRole: DriverRole = DEFAULT_DRIVER_ROLE): boolean {
    const isValid = phone.trim().length >= 8 && password.trim().length >= 6;

    if (!isValid) {
      return false;
    }

    this.userRole.set(mockRole);
    this.persistRole(mockRole);
    this.session.set(isValid);
    return true;
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

  private readStoredRole(): DriverRole {
    if (typeof window === 'undefined' || !window.localStorage) {
      return DEFAULT_DRIVER_ROLE;
    }

    const storedRole = window.localStorage.getItem(MOCK_ROLE_STORAGE_KEY);
    return this.isDriverRole(storedRole) ? storedRole : DEFAULT_DRIVER_ROLE;
  }

  private persistRole(role: DriverRole): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    window.localStorage.setItem(MOCK_ROLE_STORAGE_KEY, role);
  }

  private isDriverRole(value: string | null): value is DriverRole {
    return value === 'COLLECTOR' || value === 'DELIVERY' || value === 'BOTH';
  }
}
