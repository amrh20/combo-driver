import { environment } from '../../../environments/environment';

/** Same host as the REST API, on the WebSocket scheme. */
export function captainRealtimeUrl(accessToken: string): string {
  const base = environment.apiUrl.replace(/^http/i, 'ws');
  return `${base}/v1/realtime?access_token=${encodeURIComponent(accessToken)}`;
}
