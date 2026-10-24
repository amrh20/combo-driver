import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { GoogleMapsLoaderService } from '../../../core/services/google-maps-loader.service';
import { ComboMap } from './combo-map';

describe('ComboMap', () => {
  describe('when Google Maps cannot load', () => {
    let fixture: ComponentFixture<ComboMap>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [ComboMap],
        providers: [
          {
            provide: GoogleMapsLoaderService,
            useValue: { load: vi.fn(() => Promise.reject(new Error('offline'))) },
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(ComboMap);
      fixture.componentRef.setInput('destinationLat', 30.0444);
      fixture.componentRef.setInput('destinationLng', 31.2357);
      fixture.componentRef.setInput('fallbackEtaMinutes', 9);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('shows the backend ETA instead of a static zero while the map is unavailable', () => {
      const component = fixture.componentInstance;
      expect(component.etaMinutes()).toBe(9);
      expect(fixture.nativeElement.textContent).toContain('9');
      expect(fixture.nativeElement.textContent).toContain('دقيقة');
    });

    it('hides ETA when the backend value is zero and no route exists', () => {
      fixture.componentRef.setInput('fallbackEtaMinutes', 0);
      fixture.detectChanges();

      expect(fixture.componentInstance.etaMinutes()).toBeNull();
      expect(fixture.nativeElement.querySelector('.combo-map__eta')).toBeNull();
    });
  });

  describe('when Google Maps loads', () => {
    let fixture: ComponentFixture<ComboMap>;
    let routeRequests: Array<{ origin: { lat: number; lng: number }; destination: { lat: number; lng: number } }>;

    beforeEach(async () => {
      routeRequests = installFakeGoogleMaps();

      await TestBed.configureTestingModule({
        imports: [ComboMap],
        providers: [
          {
            provide: GoogleMapsLoaderService,
            useValue: { load: vi.fn(() => Promise.resolve(window.google)) },
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(ComboMap);
      fixture.componentRef.setInput('destinationLat', 30.06);
      fixture.componentRef.setInput('destinationLng', 31.25);
      fixture.componentRef.setInput('originLat', 30.05);
      fixture.componentRef.setInput('originLng', 31.24);
      fixture.componentRef.setInput('fallbackEtaMinutes', 0);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('draws a driving route and replaces a zero backend ETA with the routed minutes', () => {
      expect(routeRequests).toEqual([
        {
          origin: { lat: 30.05, lng: 31.24 },
          destination: { lat: 30.06, lng: 31.25 },
        },
      ]);
      expect(fixture.componentInstance.etaMinutes()).toBe(9);
      expect(fixture.nativeElement.querySelector('.combo-map__eta')?.textContent).toContain('9');
    });
  });
});

function installFakeGoogleMaps() {
  const routeRequests: Array<{ origin: { lat: number; lng: number }; destination: { lat: number; lng: number } }> = [];

  window.google = {
    maps: {
      Map: class {
        setCenter(): void {}
        setZoom(): void {}
        fitBounds(): void {}
      },
      Marker: class {
        setMap(): void {}
        setPosition(): void {}
      },
      DirectionsService: class {
        route(
          request: { origin: { lat: number; lng: number }; destination: { lat: number; lng: number } },
          callback: (result: { routes: Array<{ legs: Array<{ duration: { value: number } }> }> }, status: string) => void,
        ): void {
          routeRequests.push({ origin: request.origin, destination: request.destination });
          callback({ routes: [{ legs: [{ duration: { value: 540 } }] }] }, 'OK');
        }
      },
      DirectionsRenderer: class {
        setMap(): void {}
        setDirections(): void {}
      },
      LatLngBounds: class {
        extend(): void {}
        isEmpty(): boolean {
          return false;
        }
      },
      SymbolPath: { CIRCLE: 0 },
      event: {
        trigger(): void {},
        clearInstanceListeners(): void {},
      },
    },
  } as unknown as typeof google;

  return routeRequests;
}
