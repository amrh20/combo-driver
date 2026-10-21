import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError, timeout } from 'rxjs';

import { API_BASE_URL } from '../config/api';
import { CaptainLoginResponse, CaptainProfile, DriverProfile, DriverRole } from '../models';
import { AvailabilityService } from './availability.service';

export type { DriverRole } from '../models';

const ACCESS_TOKEN_KEY = 'combo-captain-access-token';
const REFRESH_TOKEN_KEY = 'combo-captain-refresh-token';

/** Bound the close-shift call so a hung network cannot trap the captain on logout. */
const LOGOUT_SHIFT_TIMEOUT_MS = 8_000;

export function landingPath(role: DriverRole | null): string {
  if (role === 'COLLECTOR') {
    return '/collector-tasks';
  }

  if (role === 'DELIVERY') {
    return '/delivery-tasks';
  }

  return '/home';
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly availability = inject(AvailabilityService);

  private readonly accessToken = signal<string | null>(readStorage(ACCESS_TOKEN_KEY));
  private readonly refreshToken = signal<string | null>(readStorage(REFRESH_TOKEN_KEY));
  private refreshInFlight: Observable<void> | null = null;
  private readonly userRole = signal<DriverRole | null>(null);
  private readonly profile = signal<CaptainProfile | null>(null);

  readonly isAuthenticated = computed(() => this.accessToken() !== null);
  readonly currentUserRole = this.userRole.asReadonly();
  readonly captain = this.profile.asReadonly();
  readonly driver = computed<DriverProfile>(() => {
    const captain = this.profile();

    return {
      id: captain?.id ?? '',
      name: captain?.fullName ?? '',
      phone: captain?.phone ?? '',
      vehicle: captain?.vehicleType ?? '',
      rating: 0,
    };
  });

  login(phone: string, password: string): Observable<CaptainLoginResponse> {
    return this.http
      .post<CaptainLoginResponse>(`${API_BASE_URL}/v1/auth/captain/login`, {
        phone: phone.trim(),
        password,
      })
      .pipe(
        tap((response) => {
          this.persistTokens(response.accessToken, response.refreshToken);
          this.userRole.set(response.role);
        })
      );
  }

  fetchProfile(): Observable<CaptainProfile> {
    return this.http.get<CaptainProfile>(`${API_BASE_URL}/v1/auth/captain/me`).pipe(
      tap((profile) => {
        this.profile.set(profile);
        this.userRole.set(profile.role);
      })
    );
  }

  changePassword(currentPassword: string, newPassword: string, confirmPassword: string): boolean {
    return (
      currentPassword.trim().length > 0 &&
      newPassword === confirmPassword &&
      newPassword.length >= 6
    );
  }

  /**
   * Closes the shift while the access token is still present, then clears the session.
   * A failed or timed-out close still completes so the captain can reach login.
   */
  logout(): Observable<void> {
    const closeShift$ = this.accessToken()
      ? this.availability.closeShift().pipe(
          timeout(LOGOUT_SHIFT_TIMEOUT_MS),
          catchError(() => of(null))
        )
      : of(null);

    return closeShift$.pipe(
      tap(() => this.clearSession()),
      map(() => undefined)
    );
  }

  readAccessToken(): string | null {
    return this.accessToken();
  }

  /**
   * Rotates the refresh token and stores the new pair.
   * Concurrent callers share one request so a 4401 storm cannot rotate twice.
   */
  refreshAccessToken(): Observable<void> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    const refreshToken = this.refreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('Missing refresh token'));
    }

    this.refreshInFlight = this.http
      .post<{ accessToken: string; refreshToken: string; expiresIn: number }>(
        `${API_BASE_URL}/v1/auth/refresh`,
        { refreshToken },
      )
      .pipe(
        tap((tokens) => this.persistTokens(tokens.accessToken, tokens.refreshToken)),
        map(() => undefined),
        finalize(() => {
          this.refreshInFlight = null;
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
      );

    return this.refreshInFlight;
  }

  private clearSession(): void {
    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.userRole.set(null);
    this.profile.set(null);
    this.availability.clear();
    removeStorage(ACCESS_TOKEN_KEY);
    removeStorage(REFRESH_TOKEN_KEY);
  }

  private persistTokens(accessToken: string, refreshToken: string): void {
    this.accessToken.set(accessToken);
    this.refreshToken.set(refreshToken);
    writeStorage(ACCESS_TOKEN_KEY, accessToken);
    writeStorage(REFRESH_TOKEN_KEY, refreshToken);
  }
}

function readStorage(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  return window.localStorage.getItem(key);
}

function writeStorage(key: string, value: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(key, value);
}

function removeStorage(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  window.localStorage.removeItem(key);
}
