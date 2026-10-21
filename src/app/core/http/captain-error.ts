import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorBody } from '../models';

export const CAPTAIN_NETWORK_MESSAGE = 'تعذر الاتصال بالخادم';

export type CaptainErrorKind = 'network' | 'invalid-state' | 'outside-geofence' | 'other';

export interface ClassifiedCaptainError {
  kind: CaptainErrorKind;
  message: string;
  distanceMeters: number | null;
  maxMeters: number | null;
}

export function classifyCaptainError(error: unknown): ClassifiedCaptainError {
  if (!(error instanceof HttpErrorResponse) || error.status === 0) {
    return {
      kind: 'network',
      message: CAPTAIN_NETWORK_MESSAGE,
      distanceMeters: null,
      maxMeters: null,
    };
  }

  const body = error.error as ApiErrorBody | null;
  const code = body?.error?.code;
  const message = body?.error?.message?.trim() || 'تعذر تنفيذ الخطوة. حاول مرة أخرى.';
  const details = readDetails(body?.error?.details);

  if (error.status === 409 && code === 'INVALID_STATE') {
    return { kind: 'invalid-state', message, distanceMeters: null, maxMeters: null };
  }

  if (error.status === 422 && code === 'OUTSIDE_GEOFENCE') {
    return {
      kind: 'outside-geofence',
      message,
      distanceMeters: details.distanceMeters,
      maxMeters: details.maxMeters,
    };
  }

  return { kind: 'other', message, distanceMeters: null, maxMeters: null };
}

function readDetails(details: unknown): { distanceMeters: number | null; maxMeters: number | null } {
  if (!details || typeof details !== 'object') {
    return { distanceMeters: null, maxMeters: null };
  }

  return {
    distanceMeters: readNumber(details, 'distanceMeters'),
    maxMeters: readNumber(details, 'maxMeters'),
  };
}

function readNumber(details: object, key: string): number | null {
  if (!(key in details)) {
    return null;
  }

  const value = (details as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
