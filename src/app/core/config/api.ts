/** Local combo-backend. CORS allows the Angular dev server on port 4200. */
export const API_BASE_URL = 'http://localhost:3000';

/** Same host as the REST API, on the WebSocket scheme. */
export function captainRealtimeUrl(accessToken: string): string {
  const base = API_BASE_URL.replace(/^http/i, 'ws');
  return `${base}/v1/realtime?access_token=${encodeURIComponent(accessToken)}`;
}
