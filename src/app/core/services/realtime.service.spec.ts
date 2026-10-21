import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { RealtimeMessage } from '../models';
import { AuthService } from './auth';
import { RealtimeService } from './realtime.service';

class MockSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: MockSocket[] = [];

  readyState = MockSocket.CONNECTING;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;

  constructor(readonly url: string) {
    MockSocket.instances.push(this);
  }

  close(code = 1000): void {
    this.readyState = MockSocket.CLOSED;
    this.onclose?.({ code });
  }

  serverClose(code: number): void {
    this.readyState = MockSocket.CLOSED;
    this.onclose?.({ code });
  }

  emit(message: RealtimeMessage): void {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

describe('RealtimeService', () => {
  let realtime: RealtimeService;
  const refreshAccessToken = vi.fn(() => of(undefined));

  beforeEach(() => {
    MockSocket.instances = [];
    refreshAccessToken.mockReset();
    refreshAccessToken.mockImplementation(() => of(undefined));
    vi.stubGlobal('WebSocket', MockSocket);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            readAccessToken: () => 'access-1',
            refreshAccessToken,
            isAuthenticated: signal(true),
          },
        },
      ],
    });

    realtime = TestBed.inject(RealtimeService);
  });

  afterEach(() => {
    realtime.stop();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('connects with the access token and dedupes events by id', () => {
    const events: string[] = [];
    let connections = 0;
    realtime.messages$.subscribe((message) => events.push(message.event));
    realtime.connected$.subscribe(() => connections += 1);

    realtime.start();

    const socket = MockSocket.instances[0];
    expect(socket?.url).toContain('/v1/realtime?access_token=access-1');

    socket?.emit({ event: 'ready', data: { type: 'CAPTAIN', id: 'cap-1' } });
    socket?.emit({ event: 'offer.created', id: 'evt-1', data: {} });
    socket?.emit({ event: 'offer.created', id: 'evt-1', data: {} });
    socket?.emit({ event: 'offer.expired', id: 'evt-2', data: {} });

    expect(connections).toBe(1);
    expect(events).toEqual(['offer.created', 'offer.expired']);
  });

  it('reconnects with backoff after the socket drops', () => {
    vi.useFakeTimers();
    realtime.start();
    MockSocket.instances[0]?.serverClose(1006);

    vi.advanceTimersByTime(999);
    expect(MockSocket.instances).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(MockSocket.instances).toHaveLength(2);
  });

  it('refreshes the access token after 4401 and opens a new socket', async () => {
    realtime.start();
    MockSocket.instances[0]?.serverClose(4401);

    await vi.waitFor(() => expect(MockSocket.instances).toHaveLength(2));
    expect(refreshAccessToken).toHaveBeenCalledOnce();
    expect(MockSocket.instances[1]?.url).toContain('access_token=access-1');
  });

  it('stops after a failed refresh or a 4403 close', async () => {
    refreshAccessToken.mockImplementation(() => throwError(() => new Error('expired')));
    realtime.start();
    MockSocket.instances[0]?.serverClose(4401);
    await vi.waitFor(() => expect(refreshAccessToken).toHaveBeenCalledOnce());
    await Promise.resolve();
    expect(MockSocket.instances).toHaveLength(1);

    realtime.start();
    MockSocket.instances.at(-1)?.serverClose(4403);
    await Promise.resolve();
    expect(MockSocket.instances).toHaveLength(2);
  });
});
