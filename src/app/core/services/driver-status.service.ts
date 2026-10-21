import { Injectable, computed, signal } from '@angular/core';

import { mockShiftSessions } from '../mocks/driver.mock';
import { CaptainAvailability, CaptainOpenShift, ShiftSession } from '../models';

@Injectable({
  providedIn: 'root',
})
export class DriverStatusService {
  private readonly shiftSessions = signal<ShiftSession[]>([...mockShiftSessions]);
  private readonly activeShift = signal<CaptainOpenShift | null>(null);
  private readonly online = signal(false);

  readonly isOnline = this.online.asReadonly();
  readonly openShift = this.activeShift.asReadonly();

  readonly sessions = computed(() => {
    const active = this.buildActiveSession();
    const completed = this.shiftSessions();

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

  getSessionDurationMinutes(session: ShiftSession, referenceDate = new Date()): number {
    if (session.durationMinutes !== null) {
      return session.durationMinutes;
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
      date: this.formatSessionDate(shift.startedAt),
      startTime: shift.startedAt,
      endTime: null,
      durationMinutes: null,
    };
  }

  private calculateDurationMinutes(startTime: string, endTime: string): number {
    const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
    return Math.max(Math.round(durationMs / 60_000), 1);
  }

  private formatSessionDate(isoTime: string): string {
    return new Date(isoTime).toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
}
