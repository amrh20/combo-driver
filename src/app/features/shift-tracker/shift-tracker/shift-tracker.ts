import { Component, computed, inject, signal } from '@angular/core';

import { ShiftSession, ShiftTimeFilter } from '../../../core/mocks/driver.mock';
import { DriverStatusService } from '../../../core/services/driver-status.service';

@Component({
  selector: 'app-shift-tracker',
  imports: [],
  templateUrl: './shift-tracker.html',
  styleUrl: './shift-tracker.scss',
})
export class ShiftTracker {
  private readonly driverStatus = inject(DriverStatusService);

  readonly activeTimeFilter = signal<ShiftTimeFilter>('today');

  readonly filteredSessions = computed(() => {
    const range = this.getTimeRange(this.activeTimeFilter());

    return this.driverStatus
      .sessions()
      .filter((session) => {
        if (!range) {
          return true;
        }

        const startedAt = new Date(session.startTime);
        return startedAt >= range.start && startedAt <= range.end;
      })
      .sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
  });

  readonly filteredSummary = computed(() => {
    const totalMinutes = this.filteredSessions().reduce(
      (sum, session) => sum + this.driverStatus.getSessionDurationMinutes(session),
      0
    );

    return {
      sessionCount: this.filteredSessions().length,
      totalMinutes,
      totalLabel: this.driverStatus.formatDuration(totalMinutes),
    };
  });

  selectTimeFilter(filter: ShiftTimeFilter): void {
    this.activeTimeFilter.set(filter);
  }

  isTimeFilterActive(filter: ShiftTimeFilter): boolean {
    return this.activeTimeFilter() === filter;
  }

  isActiveSession(session: ShiftSession): boolean {
    return this.driverStatus.isActiveSession(session);
  }

  formatClockTime(isoTime: string): string {
    return this.driverStatus.formatClockTime(isoTime);
  }

  formatDuration(minutes: number | null): string {
    if (minutes === null) {
      return '—';
    }

    return this.driverStatus.formatDuration(minutes);
  }

  sessionDuration(session: ShiftSession): string {
    if (this.isActiveSession(session)) {
      return this.driverStatus.formatDuration(
        this.driverStatus.getSessionDurationMinutes(session)
      );
    }

    return this.formatDuration(session.durationMinutes);
  }

  private getTimeRange(filter: ShiftTimeFilter): { start: Date; end: Date } | null {
    if (filter === 'all') {
      return null;
    }

    const end = this.endOfDay(new Date());
    const start = new Date(end);

    if (filter === 'today') {
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }

    if (filter === 'week') {
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }

    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  private endOfDay(date: Date): Date {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }
}
