import { etaMinutesFromSeconds, isUsableGeoPoint, metersBetween, resolveDisplayEta } from './geo';

describe('geo helpers', () => {
  it('rejects missing or null-island coordinates', () => {
    expect(isUsableGeoPoint(0, 0)).toBe(false);
    expect(isUsableGeoPoint(Number.NaN, 31)).toBe(false);
    expect(isUsableGeoPoint(30.0444, 31.2357)).toBe(true);
  });

  it('rounds a driving duration up from seconds and never returns 0 for a live route', () => {
    expect(etaMinutesFromSeconds(0)).toBe(0);
    expect(etaMinutesFromSeconds(20)).toBe(1);
    expect(etaMinutesFromSeconds(90)).toBe(2);
  });

  it('prefers the routed ETA and hides a static zero fallback', () => {
    expect(resolveDisplayEta(7, 0)).toBe(7);
    expect(resolveDisplayEta(null, 12)).toBe(12);
    expect(resolveDisplayEta(null, 0)).toBeNull();
  });

  it('measures a short Cairo hop in meters', () => {
    const meters = metersBetween({ lat: 30.0444, lng: 31.2357 }, { lat: 30.0454, lng: 31.2357 });
    expect(meters).toBeGreaterThan(80);
    expect(meters).toBeLessThan(150);
  });
});
