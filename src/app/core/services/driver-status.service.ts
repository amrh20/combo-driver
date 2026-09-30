import { Injectable, computed, signal } from '@angular/core';

import { mockShiftSessions } from '../mocks/driver.mock';
import { ShiftSession } from '../models';

@Injectable({
  providedIn: 'root',
})
export class DriverStatusService {
  private readonly shiftSessions = signal<ShiftSession[]>([...mockShiftSessions]);
  private readonly activeSessionStart = signal<string | null>(null);

  readonly isOnline = signal(false);

  readonly sessions = computed(() => {
    const active = this.buildActiveSession();
    const completed = this.shiftSessions();

    if (active) {
      return [active, ...completed];
    }

    return completed;
  });

  toggleOnline(): void {
    if (this.isOnline()) {
      this.goOffline();
      return;
    }

    this.goOnline();
  }

  goOnline(): void {
    if (this.isOnline()) {
      return;
    }

    this.isOnline.set(true);
    this.activeSessionStart.set(new Date().toISOString());
  }

  goOffline(): void {
    if (!this.isOnline()) {
      return;
    }

    const startTime = this.activeSessionStart();

    if (startTime) {
      const endTime = new Date();
      const durationMinutes = this.calculateDurationMinutes(startTime, endTime.toISOString());

      this.shiftSessions.update((sessions) => [
        {
          id: `SHIFT-${endTime.getTime()}`,
          date: this.formatSessionDate(startTime),
          startTime,
          endTime: endTime.toISOString(),
          durationMinutes,
        },
        ...sessions,
      ]);
    }

    this.activeSessionStart.set(null);
    this.isOnline.set(false);
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
    const startTime = this.activeSessionStart();

    if (!startTime || !this.isOnline()) {
      return null;
    }

    return {
      id: 'SHIFT-ACTIVE',
      date: this.formatSessionDate(startTime),
      startTime,
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
