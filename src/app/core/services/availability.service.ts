import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { EMPTY, Observable, catchError, finalize, of, switchMap, tap, throwError } from 'rxjs';

import { API_BASE_URL } from '../config/api';
import { idempotencyHeaders } from '../http/idempotency';
import { ApiErrorBody, CaptainAvailability } from '../models';
import { DriverStatusService } from './driver-status.service';
import { ToastService } from './toast.service';

const AVAILABILITY_URL = `${API_BASE_URL}/v1/captain/availability`;

@Injectable({
  providedIn: 'root',
})
export class AvailabilityService {
  private readonly http = inject(HttpClient);
  private readonly driverStatus = inject(DriverStatusService);
  private readonly toast = inject(ToastService);

  readonly isOnline = this.driverStatus.isOnline;
  readonly updating = signal(false);

  /** Loads the open shift and sets the switch from the backend. */
  load(): Observable<CaptainAvailability> {
    return this.fetchAvailability().pipe(
      catchError((error: unknown) => {
        this.toast.show('تعذر تحميل حالة الاتصال.');
        return throwError(() => error);
      })
    );
  }

  /**
   * Re-reads availability after a 409 or a shift closed by the tracking worker.
   * Does not toast; callers decide what to tell the captain.
   */
  resync(): Observable<CaptainAvailability> {
    return this.fetchAvailability();
  }

  /**
   * Closes the open shift during logout.
   * Does not toast or block on an in-flight switch update; the caller still logs out if this fails.
   */
  closeShift(): Observable<CaptainAvailability> {
    return this.http
      .post<CaptainAvailability>(AVAILABILITY_URL, { online: false }, { headers: idempotencyHeaders() })
      .pipe(tap((state) => this.driverStatus.applyAvailability(state)));
  }

  /**
   * Asks the backend to open or close the shift.
   * The switch changes only after a successful response.
   */
  setOnline(online: boolean): Observable<CaptainAvailability> {
    if (this.updating()) {
      return EMPTY;
    }

    this.updating.set(true);

    return this.http
      .post<CaptainAvailability>(AVAILABILITY_URL, { online }, { headers: idempotencyHeaders() })
      .pipe(
        tap((state) => this.driverStatus.applyAvailability(state)),
        catchError((error: unknown) => {
          this.toast.show(availabilityErrorMessage(error, online));
          return this.fetchAvailability().pipe(
            catchError(() => of(this.snapshot())),
            switchMap(() => throwError(() => error))
          );
        }),
        finalize(() => this.updating.set(false))
      );
  }

  clear(): void {
    this.updating.set(false);
    this.driverStatus.applyAvailability({ online: false, shift: null });
    this.driverStatus.clearClosedShifts();
  }

  private fetchAvailability(): Observable<CaptainAvailability> {
    return this.http
      .get<CaptainAvailability>(AVAILABILITY_URL)
      .pipe(tap((state) => this.driverStatus.applyAvailability(state)));
  }

  private snapshot(): CaptainAvailability {
    const shift = this.driverStatus.openShift();

    return {
      online: this.isOnline(),
      shift,
    };
  }
}

function availabilityErrorMessage(error: unknown, attemptedOnline: boolean): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'تعذر تحديث حالة الاتصال. حاول مرة أخرى.';
  }

  if (error.status === 0) {
    return 'تعذر الاتصال بالخادم. تأكد أن الخدمة تعمل.';
  }

  if (error.status === 409) {
    const body = error.error as ApiErrorBody | null;
    const code = body?.error?.code;
    const taskId = readTaskId(body?.error?.details);

    if (code === 'INVALID_STATE' && !attemptedOnline && taskId) {
      return 'لا يمكن قطع الاتصال أثناء رحلة نشطة. أنهِ الرحلة أولًا، أو اطلب من العمليات تحويلها.';
    }

    if (code === 'INVALID_STATE') {
      return 'تم إغلاق الشيفت أو تغيّرت الحالة. تم تحديث زر الاتصال.';
    }
  }

  return 'تعذر تحديث حالة الاتصال. حاول مرة أخرى.';
}

function readTaskId(details: unknown): string | null {
  if (!details || typeof details !== 'object' || !('taskId' in details)) {
    return null;
  }

  const taskId = details.taskId;
  return typeof taskId === 'string' && taskId.length > 0 ? taskId : null;
}
