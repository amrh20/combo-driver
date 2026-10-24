import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../config/api';
import { DriverStatusService } from './driver-status.service';

const shiftsUrl = `${API_BASE_URL}/v1/captain/shifts`;

describe('DriverStatusService shifts', () => {
  let driverStatus: DriverStatusService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    driverStatus = TestBed.inject(DriverStatusService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('keeps the open shift first and uses the API duration for closed shifts', () => {
    driverStatus.applyAvailability({
      online: true,
      shift: { id: 'open-shift', startedAt: '2026-10-21T08:00:00.000Z' },
    });

    driverStatus.loadClosedShifts('today').subscribe();

    const request = http.expectOne(
      (call) => call.url === shiftsUrl && call.params.get('period') === 'today',
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      items: [
        {
          id: 'closed-shift',
          startedAt: '2026-10-21T04:00:00.000Z',
          endedAt: '2026-10-21T06:00:00.000Z',
          endTime: '2026-10-21T06:00:00.000Z',
          durationMinutes: 90,
        },
      ],
      nextCursor: null,
    });

    const [open, closed] = driverStatus.sessions();
    expect(open?.id).toBe('open-shift');
    expect(open?.endTime).toBeNull();
    expect(open?.durationMinutes).toBeNull();
    expect(closed).toEqual(
      expect.objectContaining({
        id: 'closed-shift',
        startTime: '2026-10-21T04:00:00.000Z',
        endTime: '2026-10-21T06:00:00.000Z',
        durationMinutes: 90,
      }),
    );
    expect(driverStatus.getSessionDurationMinutes(closed!)).toBe(90);
    expect(driverStatus.isActiveSession(open!)).toBe(true);
    expect(driverStatus.isActiveSession(closed!)).toBe(false);
  });

  it('drops the open shift from the list when the captain is offline', () => {
    driverStatus.applyAvailability({ online: false, shift: null });
    driverStatus.loadClosedShifts('all').subscribe();
    http.expectOne((call) => call.params.get('period') === 'all').flush({
      items: [
        {
          id: 'closed-shift',
          startedAt: '2026-10-20T08:00:00.000Z',
          endedAt: '2026-10-20T09:00:00.000Z',
          endTime: '2026-10-20T09:00:00.000Z',
          durationMinutes: 60,
        },
      ],
      nextCursor: null,
    });

    expect(driverStatus.sessions().map((session) => session.id)).toEqual(['closed-shift']);
  });
});
