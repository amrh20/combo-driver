/** Minimal typings for the Maps JavaScript API loaded at runtime. */
declare namespace google.maps {
  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }

  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  class LatLngBounds {
    constructor();
    extend(point: LatLng | LatLngLiteral): void;
    isEmpty(): boolean;
  }

  class Map {
    constructor(el: HTMLElement, opts?: MapOptions);
    setCenter(center: LatLng | LatLngLiteral): void;
    setZoom(zoom: number): void;
    panTo(center: LatLng | LatLngLiteral): void;
    fitBounds(bounds: LatLngBounds, padding?: number): void;
    addListener(event: string, handler: (e: MapMouseEvent) => void): MapsEventListener;
  }

  interface MapOptions {
    center?: LatLng | LatLngLiteral;
    zoom?: number;
    disableDefaultUI?: boolean;
    clickableIcons?: boolean;
    zoomControl?: boolean;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
    gestureHandling?: string;
  }

  interface MapMouseEvent {
    latLng?: LatLng | null;
  }

  interface MapsEventListener {
    remove(): void;
  }

  enum SymbolPath {
    CIRCLE = 0,
  }

  interface Symbol {
    path?: SymbolPath | string;
    scale?: number;
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWeight?: number;
  }

  class Marker {
    constructor(opts?: MarkerOptions);
    setMap(map: Map | null): void;
    setPosition(latLng: LatLng | LatLngLiteral | null): void;
    getPosition(): LatLng | null | undefined;
    setTitle(title: string): void;
    setIcon(icon: Symbol | string): void;
    addListener(event: string, handler: () => void): MapsEventListener;
  }

  interface MarkerOptions {
    map?: Map | null;
    position?: LatLng | LatLngLiteral;
    title?: string;
    icon?: Symbol | string;
    zIndex?: number;
  }

  interface PolylineOptions {
    strokeColor?: string;
    strokeWeight?: number;
    strokeOpacity?: number;
  }

  class DirectionsService {
    route(
      request: DirectionsRequest,
      callback: (result: DirectionsResult | null, status: string) => void,
    ): void;
  }

  class DirectionsRenderer {
    constructor(opts?: DirectionsRendererOptions);
    setMap(map: Map | null): void;
    setDirections(result: DirectionsResult): void;
  }

  interface DirectionsRendererOptions {
    map?: Map | null;
    suppressMarkers?: boolean;
    preserveViewport?: boolean;
    polylineOptions?: PolylineOptions;
  }

  interface DirectionsRequest {
    origin: LatLngLiteral;
    destination: LatLngLiteral;
    travelMode: string;
  }

  interface DirectionsResult {
    routes: Array<{
      legs: Array<{
        duration?: { value: number; text: string };
      }>;
    }>;
  }

  function importLibrary(name: string): Promise<unknown>;

  namespace event {
    function clearInstanceListeners(instance: object): void;
    function trigger(instance: object, eventName: string): void;
  }
}

declare const google: { maps: typeof google.maps };

interface Window {
  google?: typeof google;
  __comboGoogleMapsLoadPromise?: Promise<typeof google>;
}
