/** Opens Google Maps at the given coordinates in a new browser tab. */
export function openExternalNavigation(lat: number, lng: number): void {
  const url = `https://maps.google.com/?q=${lat},${lng}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
