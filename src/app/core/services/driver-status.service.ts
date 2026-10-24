import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, tap } from 'rxjs';

import { API_BASE_URL } from '../config/api';
import { CursorPage, collectCursorPages } from '../http/cursor-page';
import { formatArabicDate } from '../mocks/date-helpers';
import { CaptainAvailability, CaptainOpenShift, CaptainShift, ShiftSession, ShiftTimeFilter } from '../models';
import { ToastService } from './toast.service';

const SHIFTS_URL = `${API_BASE_URL}/v1/captain/shifts`;
const PAGE_LIMIT = '100';

@Injectable({
  providedIn: 'root',
})
export class DriverStatusService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  private requestSeq = 0;
  private readonly closedShifts = signal<ShiftSession[]>([]);
  private readonly activeShift = signal<CaptainOpenShift | null>(null);
  private readonly online = signal(false);

  readonly isOnline = this.online.asReadonly();
  readonly openShift = this.activeShift.asReadonly();
  readonly shiftsLoading = signal(false);

  /** The open shift, when the captain is online, then closed shifts from the API in server order. */
  readonly sessions = computed(() => {
    const active = this.buildActiveSession();
    const openId = active?.id;
    const completed = this.closedShifts().filter((session) => session.id !== openId);

    if (active) {
      return [active, ...completed];
    }

    return completed;
  });

  /** Applies `GET` or `POST /v1/captain/availability` without inventing a local shift. */
  applyAvailability(state: CaptainAvailability): void {
    this.online.set(state.online);
    this.activeShift.set(state.online && state.shift ? state.shift : null);
  }

  /**
   * `GET /v1/captain/shifts?period=`.
   * Closed shifts keep `durationMinutes` from the API. The open shift is not in this list.
   */
  loadClosedShifts(period: ShiftTimeFilter): Observable<void> {
    const requestId = ++this.requestSeq;
    this.shiftsLoading.set(true);
    this.closedShifts.set([]);

    return collectCursorPages<CaptainShift>((cursor) =>
      this.http.get<CursorPage<CaptainShift>>(SHIFTS_URL, { params: pageParams(period, cursor) }),
    ).pipe(
      tap((shifts) => {
        if (requestId === this.requestSeq) {
          this.closedShifts.set(shifts.map(toClosedSession));
        }
      }),
      map(() => undefined),
      catchError(() => {
        if (requestId === this.requestSeq) {
          this.closedShifts.set([]);
          this.toast.show('تعذر تحميل الشيفتات.');
        }

        return of(undefined);
      }),
      finalize(() => {
        if (requestId === this.requestSeq) {
          this.shiftsLoading.set(false);
        }
      }),
    );
  }

  clearClosedShifts(): void {
    this.requestSeq += 1;
    this.closedShifts.set([]);
    this.shiftsLoading.set(false);
  }

  /**
   * Closed shifts use the API duration. Only the open shift (no `endTime`) is measured locally.
   */
  getSessionDurationMinutes(session: ShiftSession, referenceDate = new Date()): number {
    if (session.endTime !== null) {
      return session.durationMinutes ?? 0;
    }

    return this.calculateDurationMinutes(session.startTime, referenceDate.toISOString());
  }

  isActiveSession(session: ShiftSession): boolean {
    return session.endTime === null;
  }

  formatClockTime(isoTime: string): string {
    return new Date(isoTime).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDuration(minutes: number): string {
    const safeMinutes = Math.max(minutes, 0);
    const hours = Math.floor(safeMinutes / 60);
    const mins = safeMinutes % 60;

    if (hours === 0) {
      return `${mins} دقيقة`;
    }

    if (mins === 0) {
      return hours === 1 ? 'ساعة واحدة' : `${hours} ساعات`;
    }

    const hourLabel = hours === 1 ? 'ساعة' : `${hours} ساعات`;
    return `${hourLabel} و ${mins} دقيقة`;
  }

  private buildActiveSession(): ShiftSession | null {
    const shift = this.activeShift();

    if (!shift || !this.isOnline()) {
      return null;
    }

    return {
      id: shift.id,
      date: formatArabicDate(shift.startedAt),
      startTime: shift.startedAt,
      endTime: null,
      durationMinutes: null,
    };
  }

  private calculateDurationMinutes(startTime: string, endTime: string): number {
    const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
    return Math.max(Math.round(durationMs / 60_000), 1);
  }
}

function pageParams(period: ShiftTimeFilter, cursor?: string): Record<string, string> {
  const params: Record<string, string> = { period, limit: PAGE_LIMIT };

  if (cursor) {
    params['cursor'] = cursor;
  }

  return params;
}

function toClosedSession(shift: CaptainShift): ShiftSession {
  return {
    id: shift.id,
    date: formatArabicDate(shift.startedAt),
    startTime: shift.startedAt,
    endTime: shift.endTime ?? shift.endedAt,
    durationMinutes: shift.durationMinutes,
  };
}
