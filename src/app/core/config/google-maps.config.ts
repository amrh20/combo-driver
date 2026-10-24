/** Placeholder in environment files. A real key must not be treated as this value. */
const UNCONFIGURED_GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY_HERE';

/** Same Maps JavaScript API key as the Combo customer and control apps. */
export const GOOGLE_MAPS_API_KEY = 'AIzaSyAw7RIqxwWQYrdwbXvuSP5C6yHEym_odWc';

export function resolveGoogleMapsApiKey(): string {
  const fromConstant = GOOGLE_MAPS_API_KEY.trim();
  return isUsableGoogleMapsApiKey(fromConstant) ? fromConstant : '';
}

function isUsableGoogleMapsApiKey(value: string | undefined): value is string {
  return !!value && value !== UNCONFIGURED_GOOGLE_MAPS_API_KEY;
}

export function isGoogleMapsConfigured(): boolean {
  return resolveGoogleMapsApiKey().length > 0;
}
