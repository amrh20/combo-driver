import { GeoPoint } from '../../core/models';

export function isUsableGeoPoint(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    (lat !== 0 || lng !== 0)
  );
}

export function pointsEqual(a: GeoPoint, b: GeoPoint, epsilon = 1e-6): boolean {
  return Math.abs(a.lat - b.lat) < epsilon && Math.abs(a.lng - b.lng) < epsilon;
}

export function metersBetween(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const haversine =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

/** Driving duration in whole minutes. Sub-minute routes show as 1 instead of 0. */
export function etaMinutesFromSeconds(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 0;
  }

  return Math.max(1, Math.round(seconds / 60));
}

/** Prefer a routed ETA; otherwise the backend value. Never surfaces a static 0. */
export function resolveDisplayEta(
  routedMinutes: number | null,
  fallbackMinutes: number,
): number | null {
  if (routedMinutes != null && routedMinutes > 0) {
    return routedMinutes;
  }

  if (Number.isFinite(fallbackMinutes) && fallbackMinutes > 0) {
    return Math.round(fallbackMinutes);
  }

  return null;
}
