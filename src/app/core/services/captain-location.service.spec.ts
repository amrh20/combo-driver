import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';

import { CaptainLocationService } from './captain-location.service';

describe('CaptainLocationService', () => {
  let watchCallback: ((position: GeolocationPosition) => void) | undefined;
  let getCurrentCallback: ((position: GeolocationPosition) => void) | undefined;

  beforeEach(() => {
    watchCallback = undefined;
    getCurrentCallback = undefined;

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success: (position: GeolocationPosition) => void) => {
          getCurrentCallback = success;
        }),
        watchPosition: vi.fn((success: (position: GeolocationPosition) => void) => {
          watchCallback = success;
          return 17;
        }),
        clearWatch: vi.fn(),
      },
    });

    TestBed.configureTestingModule({});
  });

  it('stores a one-shot GPS fix on current()', async () => {
    const location = TestBed.inject(CaptainLocationService);
    const pending = firstValueFrom(location.current());

    getCurrentCallback?.(coords(30.1, 31.2));

    await expect(pending).resolves.toEqual({ lat: 30.1, lng: 31.2 });
    expect(location.point()).toEqual({ lat: 30.1, lng: 31.2 });
  });

  it('keeps a live watch until the last subscriber stops', () => {
    const location = TestBed.inject(CaptainLocationService);
    const geo = navigator.geolocation;

    location.startWatch();
    location.startWatch();
    watchCallback?.(coords(30.2, 31.3));

    expect(location.point()).toEqual({ lat: 30.2, lng: 31.3 });
    expect(geo.watchPosition).toHaveBeenCalledTimes(1);

    location.stopWatch();
    expect(geo.clearWatch).not.toHaveBeenCalled();

    location.stopWatch();
    expect(geo.clearWatch).toHaveBeenCalledWith(17);
  });
});

function coords(lat: number, lng: number): GeolocationPosition {
  return {
    coords: {
      latitude: lat,
      longitude: lng,
      accuracy: 8,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({}),
    },
    timestamp: Date.now(),
    toJSON: () => ({}),
  } as GeolocationPosition;
}
