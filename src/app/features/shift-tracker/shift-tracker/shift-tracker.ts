import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ShiftSession, ShiftTimeFilter } from '../../../core/models';
import { DriverStatusService } from '../../../core/services/driver-status.service';

@Component({
  selector: 'app-shift-tracker',
  imports: [],
  templateUrl: './shift-tracker.html',
  styleUrl: './shift-tracker.scss',
})
export class ShiftTracker {
  private readonly driverStatus = inject(DriverStatusService);
  private readonly destroyRef = inject(DestroyRef);

  readonly shiftsLoading = this.driverStatus.shiftsLoading;
  readonly activeTimeFilter = signal<ShiftTimeFilter>('today');

  /** Open shift first (when online), then closed shifts already filtered by the API period. */
  readonly filteredSessions = this.driverStatus.sessions;

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

  constructor() {
    effect(() => {
      const period = this.activeTimeFilter();
      this.driverStatus.isOnline();
      untracked(() => {
        this.driverStatus.loadClosedShifts(period).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
      });
    });
  }

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
      return this.driverStatus.formatDuration(this.driverStatus.getSessionDurationMinutes(session));
    }

    return this.formatDuration(session.durationMinutes);
  }
}
