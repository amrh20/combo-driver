import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { ApiErrorBody } from '../models';
import { AvailabilityService } from '../services/availability.service';
import { ToastService } from '../services/toast.service';

/**
 * A location ping rejected with 409 means the tracking worker closed the shift.
 * Refresh availability so the switch does not stay online.
 */
export const availabilitySyncInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.includes('/v1/captain/locations')) {
    return next(request);
  }

  const availability = inject(AvailabilityService);
  const toast = inject(ToastService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (isInvalidState(error)) {
        availability.resync().subscribe({
          next: (state) => {
            if (!state.online) {
              toast.show('تم إغلاق الشيفت لعدم وصول إشارة الموقع. اضغط للاتصال إذا كنت جاهزًا.');
            }
          },
          error: () => undefined,
        });
      }

      return throwError(() => error);
    })
  );
};

function isInvalidState(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse) || error.status !== 409) {
    return false;
  }

  return (error.error as ApiErrorBody | null)?.error?.code === 'INVALID_STATE';
}
