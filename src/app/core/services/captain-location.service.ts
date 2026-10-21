import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { GeoPoint } from '../models';

/** Reads one GPS fix for arrive/complete. Missing permission omits `location`. */
@Injectable({
  providedIn: 'root',
})
export class CaptainLocationService {
  current(): Observable<GeoPoint | undefined> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return of(undefined);
    }

    return new Observable((subscriber) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          subscriber.next({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          subscriber.complete();
        },
        () => {
          subscriber.next(undefined);
          subscriber.complete();
        },
        { enableHighAccuracy: true, timeout: 8_000, maximumAge: 15_000 },
      );
    });
  }
}
