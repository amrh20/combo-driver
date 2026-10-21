import { Injectable, NgZone, inject } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';

import { captainRealtimeUrl } from '../config/api';
import { RealtimeMessage } from '../models';
import { AuthService } from './auth';

const MAX_SEEN_EVENTS = 2000;
const MAX_RETRY_MS = 30_000;

/**
 * One captain socket on `/v1/realtime`. Events may arrive twice; `id` is deduped.
 * REST stays the source of truth — callers refetch after `connected$` and each event.
 */
@Injectable({
  providedIn: 'root',
})
export class RealtimeService {
  private readonly auth = inject(AuthService);
  private readonly zone = inject(NgZone);

  private socket: WebSocket | null = null;
  private readonly seen = new Set<string>();
  private retryMs = 1000;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = true;
  private blocked = false;
  private refreshing = false;

  readonly messages$ = new Subject<RealtimeMessage>();
  /** Fires after every successful connection, including reconnects. */
  readonly connected$ = new Subject<void>();

  start(): void {
    this.stopped = false;
    this.blocked = false;
    this.open();
  }

  stop(): void {
    this.stopped = true;
    this.refreshing = false;
    this.clearRetry();
    this.socket?.close(1000);
    this.socket = null;
  }

  private open(): void {
    if (this.stopped || this.blocked || this.refreshing) {
      return;
    }

    const token = this.auth.readAccessToken();
    if (!token) {
      return;
    }

    if (this.socket && this.socket.readyState < WebSocket.CLOSING) {
      return;
    }

    const socket = new WebSocket(captainRealtimeUrl(token));
    this.socket = socket;

    socket.onmessage = (raw) => {
      this.zone.run(() => this.handleMessage(raw.data));
    };

    socket.onclose = (closed) => {
      if (this.socket === socket) {
        this.socket = null;
      }

      void this.handleClose(closed.code);
    };
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== 'string') {
      return;
    }

    let message: RealtimeMessage;
    try {
      message = JSON.parse(raw) as RealtimeMessage;
    } catch {
      return;
    }

    if (message.id) {
      if (this.seen.has(message.id)) {
        return;
      }

      this.seen.add(message.id);
      if (this.seen.size > MAX_SEEN_EVENTS) {
        this.seen.clear();
      }
    }

    if (message.event === 'ready') {
      this.retryMs = 1000;
      this.connected$.next();
      return;
    }

    this.messages$.next(message);
  }

  private async handleClose(code: number): Promise<void> {
    if (this.stopped || this.blocked || code === 1000) {
      return;
    }

    if (code === 4403) {
      this.blocked = true;
      return;
    }

    if (code === 4401) {
      this.refreshing = true;
      try {
        await firstValueFrom(this.auth.refreshAccessToken());
      } catch {
        this.refreshing = false;
        this.stopped = true;
        return;
      }

      this.refreshing = false;
      this.retryMs = 1000;
      this.open();
      return;
    }

    this.scheduleRetry();
  }

  private scheduleRetry(): void {
    this.clearRetry();
    const delay = this.retryMs;
    this.retryMs = Math.min(this.retryMs * 2, MAX_RETRY_MS);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.open();
    }, delay);
  }

  private clearRetry(): void {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }
}
