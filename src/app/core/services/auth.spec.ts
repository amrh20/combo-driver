import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { API_BASE_URL } from '../config/api';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { AuthService } from './auth';
import { DriverStatusService } from './driver-status.service';

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    window.localStorage.clear();
  });

  it('stores the captain tokens and loads the profile role', () => {
    auth.login('01012345678', 'Temp-pass-1').subscribe();

    const login = http.expectOne(`${API_BASE_URL}/v1/auth/captain/login`);
    expect(login.request.method).toBe('POST');
    expect(login.request.body).toEqual({ phone: '01012345678', password: 'Temp-pass-1' });
    login.flush({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresIn: 900,
      role: 'DELIVERY',
      mustChangePassword: false,
    });

    expect(window.localStorage.getItem('combo-captain-access-token')).toBe('access-1');
    expect(window.localStorage.getItem('combo-captain-refresh-token')).toBe('refresh-1');

    auth.fetchProfile().subscribe();

    const profile = http.expectOne(`${API_BASE_URL}/v1/auth/captain/me`);
    expect(profile.request.headers.get('Authorization')).toBe('Bearer access-1');
    profile.flush({
      id: 'cap-1',
      phone: '01012345678',
      fullName: 'أحمد',
      role: 'COLLECTOR',
      vehicleType: 'NONE',
      status: 'ACTIVE',
      hubId: 'hub-1',
      mustChangePassword: false,
      employmentType: 'FIXED',
    });

    expect(auth.currentUserRole()).toBe('COLLECTOR');
    expect(auth.captain()?.employmentType).toBe('FIXED');
    expect(auth.showPerTripEarnings()).toBe(false);
    expect(auth.driver().name).toBe('أحمد');
  });

  it('closes the shift before clearing credentials on logout', () => {
    signIn(auth, http);

    let completed = false;
    auth.logout().subscribe(() => {
      completed = true;
    });

    const closeShift = http.expectOne(`${API_BASE_URL}/v1/captain/availability`);
    expect(closeShift.request.method).toBe('POST');
    expect(closeShift.request.body).toEqual({ online: false });
    expect(closeShift.request.headers.get('Authorization')).toBe('Bearer access-1');
    expect(closeShift.request.headers.get('Idempotency-Key')).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
    expect(window.localStorage.getItem('combo-captain-access-token')).toBe('access-1');
    expect(completed).toBe(false);

    closeShift.flush({ online: false, shift: null });

    expect(completed).toBe(true);
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.currentUserRole()).toBeNull();
    expect(window.localStorage.getItem('combo-captain-access-token')).toBeNull();
    expect(window.localStorage.getItem('combo-captain-refresh-token')).toBeNull();
  });

  it('still clears the session when closing the shift fails', () => {
    signIn(auth, http);
    const status = TestBed.inject(DriverStatusService);
    status.applyAvailability({
      online: true,
      shift: { id: 'shift-1', startedAt: '2026-10-18T08:00:00.000Z' },
    });

    let completed = false;
    auth.logout().subscribe(() => {
      completed = true;
    });

    http.expectOne(`${API_BASE_URL}/v1/captain/availability`).flush(
      { error: { code: 'INVALID_STATE', message: 'Finish your trip' } },
      { status: 409, statusText: 'Conflict' }
    );

    expect(completed).toBe(true);
    expect(auth.isAuthenticated()).toBe(false);
    expect(window.localStorage.getItem('combo-captain-access-token')).toBeNull();
    expect(status.isOnline()).toBe(false);
    http.expectNone(`${API_BASE_URL}/v1/captain/availability`);
  });

  it('clears the session when closing the shift times out', () => {
    vi.useFakeTimers();

    try {
      signIn(auth, http);

      let completed = false;
      auth.logout().subscribe(() => {
        completed = true;
      });

      http.expectOne(`${API_BASE_URL}/v1/captain/availability`);
      expect(completed).toBe(false);

      vi.advanceTimersByTime(8_000);

      expect(completed).toBe(true);
      expect(auth.isAuthenticated()).toBe(false);
      expect(window.localStorage.getItem('combo-captain-access-token')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears a session that has no access token without calling availability', () => {
    let completed = false;
    auth.logout().subscribe(() => {
      completed = true;
    });

    http.expectNone(`${API_BASE_URL}/v1/captain/availability`);
    expect(completed).toBe(true);
    expect(auth.isAuthenticated()).toBe(false);
  });
});

function signIn(auth: AuthService, http: HttpTestingController): void {
  auth.login('01012345678', 'Temp-pass-1').subscribe();
  http.expectOne(`${API_BASE_URL}/v1/auth/captain/login`).flush({
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    expiresIn: 900,
    role: 'DELIVERY',
    mustChangePassword: false,
  });
}
