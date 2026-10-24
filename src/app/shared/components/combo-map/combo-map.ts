import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { isGoogleMapsConfigured } from '../../../core/config/google-maps.config';
import { GeoPoint } from '../../../core/models';
import { GoogleMapsLoaderService } from '../../../core/services/google-maps-loader.service';
import { formatNumber } from '../../utils/format';
import {
  etaMinutesFromSeconds,
  isUsableGeoPoint,
  metersBetween,
  pointsEqual,
  resolveDisplayEta,
} from '../../utils/geo';

const DEFAULT_ZOOM = 16;
const REROUTE_METERS = 40;
const CAIRO_CENTER: GeoPoint = { lat: 30.0444, lng: 31.2357 };

@Component({
  selector: 'combo-map',
  templateUrl: './combo-map.html',
  styleUrl: './combo-map.scss',
})
export class ComboMap implements AfterViewInit, OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly loader = inject(GoogleMapsLoaderService);

  readonly destinationLat = input(0);
  readonly destinationLng = input(0);
  readonly originLat = input<number | null>(null);
  readonly originLng = input<number | null>(null);
  readonly fallbackEtaMinutes = input(0);
  readonly heightPx = input(200);

  private readonly mapHost = viewChild<ElementRef<HTMLElement>>('mapHost');

  readonly configured = isGoogleMapsConfigured();
  readonly loading = signal(true);
  readonly loadFailed = signal(false);
  readonly ready = signal(false);
  readonly routedEtaMinutes = signal<number | null>(null);

  readonly hasDestination = computed(() =>
    isUsableGeoPoint(this.destinationLat(), this.destinationLng()),
  );

  readonly etaMinutes = computed(() =>
    resolveDisplayEta(this.routedEtaMinutes(), this.fallbackEtaMinutes()),
  );

  formatNumber = formatNumber;

  private map: google.maps.Map | null = null;
  private destinationMarker: google.maps.Marker | null = null;
  private originMarker: google.maps.Marker | null = null;
  private directions: google.maps.DirectionsService | null = null;
  private renderer: google.maps.DirectionsRenderer | null = null;
  private lastRoutedOrigin: GeoPoint | null = null;
  private lastRoutedDestination: GeoPoint | null = null;
  private sawOrigin = false;
  private destroyed = false;

  constructor() {
    effect(() => {
      const destination = {
        lat: this.destinationLat(),
        lng: this.destinationLng(),
      };
      const originLat = this.originLat();
      const originLng = this.originLng();
      const origin =
        originLat != null && originLng != null && isUsableGeoPoint(originLat, originLng)
          ? { lat: originLat, lng: originLng }
          : null;
      const ready = this.ready();

      untracked(() => this.syncMap(destination, origin, ready));
    });
  }

  ngAfterViewInit(): void {
    if (!this.configured) {
      this.loading.set(false);
      this.loadFailed.set(true);
      return;
    }

    void this.initMap();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.renderer?.setMap(null);
    this.destinationMarker?.setMap(null);
    this.originMarker?.setMap(null);
    this.map = null;
  }

  private async initMap(): Promise<void> {
    const host = this.mapHost()?.nativeElement;
    if (!host) {
      this.loading.set(false);
      this.loadFailed.set(true);
      return;
    }

    try {
      await this.loader.load();
      if (this.destroyed) {
        return;
      }

      const destination = this.destinationPoint();
      const center = destination ?? CAIRO_CENTER;
      const routeColor = readPrimaryColor(host);

      this.map = new google.maps.Map(host, {
        center,
        zoom: DEFAULT_ZOOM,
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy',
      });

      this.destinationMarker = new google.maps.Marker({
        map: destination ? this.map : null,
        position: center,
        title: 'موقع العميل',
        zIndex: 2,
      });

      this.originMarker = new google.maps.Marker({
        map: null,
        position: center,
        title: 'موقعك',
        zIndex: 3,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: routeColor,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      this.directions = google.maps.DirectionsService
        ? new google.maps.DirectionsService()
        : null;
      this.renderer = google.maps.DirectionsRenderer
        ? new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            preserveViewport: false,
            polylineOptions: {
              strokeColor: routeColor,
              strokeWeight: 5,
              strokeOpacity: 0.92,
            },
          })
        : null;

      this.loading.set(false);
      this.ready.set(true);
      google.maps.event.trigger(this.map, 'resize');
    } catch {
      if (this.destroyed) {
        return;
      }

      this.loading.set(false);
      this.loadFailed.set(true);
    }
  }

  private syncMap(destination: GeoPoint, origin: GeoPoint | null, ready: boolean): void {
    if (!ready || !this.map || !this.destinationMarker) {
      return;
    }

    const usableDestination = isUsableGeoPoint(destination.lat, destination.lng)
      ? destination
      : null;

    if (!usableDestination) {
      this.destinationMarker.setMap(null);
      this.originMarker?.setMap(null);
      this.clearRoute();
      this.routedEtaMinutes.set(null);
      return;
    }

    this.destinationMarker.setMap(this.map);
    this.destinationMarker.setPosition(usableDestination);

    if (origin) {
      const originAppeared = !this.sawOrigin;
      this.sawOrigin = true;
      this.originMarker?.setMap(this.map);
      this.originMarker?.setPosition(origin);
      if (originAppeared) {
        this.fitToMarkers(origin, usableDestination);
      }
      this.maybeRoute(origin, usableDestination);
      return;
    }

    this.sawOrigin = false;
    this.originMarker?.setMap(null);
    this.clearRoute();
    this.routedEtaMinutes.set(null);
    this.map.setCenter(usableDestination);
    this.map.setZoom(DEFAULT_ZOOM);
  }

  private maybeRoute(origin: GeoPoint, destination: GeoPoint): void {
    const destinationChanged =
      !this.lastRoutedDestination || !pointsEqual(this.lastRoutedDestination, destination);
    const originMoved =
      !this.lastRoutedOrigin || metersBetween(this.lastRoutedOrigin, origin) >= REROUTE_METERS;

    if (!destinationChanged && !originMoved) {
      return;
    }

    if (destinationChanged) {
      this.routedEtaMinutes.set(null);
    }

    this.lastRoutedOrigin = origin;
    this.lastRoutedDestination = destination;
    this.requestDirections(origin, destination);
  }

  private requestDirections(origin: GeoPoint, destination: GeoPoint): void {
    if (!this.directions) {
      this.fitToMarkers(origin, destination);
      return;
    }

    this.directions.route(
      {
        origin,
        destination,
        travelMode: 'DRIVING',
      },
      (result, status) => {
        this.zone.run(() => {
          if (this.destroyed) {
            return;
          }

          if (status === 'OK' && result) {
            this.renderer?.setMap(this.map);
            this.renderer?.setDirections(result);
            const seconds = result.routes[0]?.legs[0]?.duration?.value ?? 0;
            this.routedEtaMinutes.set(etaMinutesFromSeconds(seconds) || null);
            return;
          }

          this.clearRoute();
          this.routedEtaMinutes.set(null);
          this.fitToMarkers(origin, destination);
        });
      },
    );
  }

  private fitToMarkers(origin: GeoPoint, destination: GeoPoint): void {
    if (!this.map) {
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(origin);
    bounds.extend(destination);
    if (!bounds.isEmpty()) {
      this.map.fitBounds(bounds, 48);
    }
  }

  private clearRoute(): void {
    this.lastRoutedOrigin = null;
    this.lastRoutedDestination = null;
    this.renderer?.setMap(null);
  }

  private destinationPoint(): GeoPoint | null {
    const lat = this.destinationLat();
    const lng = this.destinationLng();
    return isUsableGeoPoint(lat, lng) ? { lat, lng } : null;
  }
}

function readPrimaryColor(host: HTMLElement): string {
  const fromToken = getComputedStyle(host).getPropertyValue('--Combo-bg-background-primary').trim();
  return fromToken || '#00846A';
}
