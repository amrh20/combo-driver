import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';

import { GeoPoint } from '../models';

const GPS_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 8_000,
  maximumAge: 15_000,
};

/** Reads GPS for arrive/complete and keeps the latest fix for the live map. */
@Injectable({
  providedIn: 'root',
})
export class CaptainLocationService {
  private readonly pointState = signal<GeoPoint | undefined>(undefined);
  readonly point = this.pointState.asReadonly();

  private watchId: number | null = null;
  private watchRefs = 0;

  current(): Observable<GeoPoint | undefined> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return of(undefined);
    }

    return new Observable((subscriber) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const point = coordsToPoint(position);
          this.pointState.set(point);
          subscriber.next(point);
          subscriber.complete();
        },
        () => {
          subscriber.next(undefined);
          subscriber.complete();
        },
        GPS_OPTIONS,
      );
    });
  }

  startWatch(): void {
    this.watchRefs += 1;
    if (this.watchRefs > 1 || typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.pointState.set(coordsToPoint(position)),
      () => undefined,
      GPS_OPTIONS,
    );
  }

  stopWatch(): void {
    this.watchRefs = Math.max(0, this.watchRefs - 1);
    if (this.watchRefs > 0 || this.watchId == null || typeof navigator === 'undefined') {
      return;
    }

    navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
  }
}

function coordsToPoint(position: GeolocationPosition): GeoPoint {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  };
}
