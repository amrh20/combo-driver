import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { availabilitySyncInterceptor } from '../interceptors/availability-sync.interceptor';
import { AvailabilityService } from './availability.service';
import { DriverStatusService } from './driver-status.service';
import { ToastService } from './toast.service';

const availabilityUrl = `${environment.apiUrl}/v1/captain/availability`;
const openShift = {
  id: 'shift-1',
  startedAt: '2026-10-18T08:00:00.000Z',
};

describe('AvailabilityService', () => {
  let availability: AvailabilityService;
  let driverStatus: DriverStatusService;
  let http: HttpTestingController;
  let toast: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    availability = TestBed.inject(AvailabilityService);
    driverStatus = TestBed.inject(DriverStatusService);
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => {
    http.verify();
  });

  it('sets the switch from the open shift on load', () => {
    availability.load().subscribe();

    const request = http.expectOne(availabilityUrl);
    expect(request.request.method).toBe('GET');
    request.flush({ online: true, shift: openShift });

    expect(availability.isOnline()).toBe(true);
    expect(driverStatus.openShift()).toEqual(openShift);
    expect(driverStatus.sessions()[0]).toEqual(
      expect.objectContaining({
        id: 'shift-1',
        startTime: openShift.startedAt,
        endTime: null,
      })
    );
  });

  it('posts offline without a toast so logout can close the shift', () => {
    driverStatus.applyAvailability({ online: true, shift: openShift });

    availability.closeShift().subscribe();

    const request = http.expectOne(availabilityUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ online: false });
    expect(request.request.headers.get('Idempotency-Key')).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
    request.flush({ online: false, shift: null });

    expect(availability.isOnline()).toBe(false);
    expect(driverStatus.openShift()).toBeNull();
    expect(toast.current()).toBeNull();
  });

  it('updates the switch only after posting availability succeeds', () => {
    availability.setOnline(true).subscribe();

    const request = http.expectOne(availabilityUrl);
    expect(availability.isOnline()).toBe(false);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ online: true });
    expect(request.request.headers.get('Idempotency-Key')).toMatch(/^[A-Za-z0-9_-]{8,128}$/);

    request.flush({ online: true, shift: openShift });

    expect(availability.isOnline()).toBe(true);
    expect(driverStatus.openShift()?.id).toBe('shift-1');
  });

  it('keeps the current switch and resyncs when going offline is rejected', () => {
    driverStatus.applyAvailability({ online: true, shift: openShift });

    let failed = false;
    availability.setOnline(false).subscribe({
      error: () => {
        failed = true;
      },
    });

    const post = http.expectOne(availabilityUrl);
    expect(availability.isOnline()).toBe(true);
    post.flush(
      { error: { code: 'INVALID_STATE', message: 'Finish your trip', details: { taskId: 'task-1' } } },
      { status: 409, statusText: 'Conflict' }
    );

    const refresh = http.expectOne(availabilityUrl);
    expect(refresh.request.method).toBe('GET');
    refresh.flush({ online: true, shift: openShift });

    expect(failed).toBe(true);
    expect(availability.isOnline()).toBe(true);
    expect(toast.current()).toContain('رحلة نشطة');
  });

  it('applies the refetched offline state when the shift was closed', () => {
    driverStatus.applyAvailability({ online: true, shift: openShift });

    availability.setOnline(true).subscribe({ error: () => undefined });

    http.expectOne(availabilityUrl).flush(
      { error: { code: 'INVALID_STATE', message: 'Shift closed' } },
      { status: 409, statusText: 'Conflict' }
    );

    http.expectOne(availabilityUrl).flush({ online: false, shift: null });

    expect(availability.isOnline()).toBe(false);
    expect(driverStatus.openShift()).toBeNull();
    expect(toast.current()).toContain('تم إغلاق الشيفت');
  });
});

describe('availabilitySyncInterceptor', () => {
  let availability: AvailabilityService;
  let http: HttpTestingController;
  let toast: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([availabilitySyncInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    availability = TestBed.inject(AvailabilityService);
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => {
    http.verify();
  });

  it('refetches availability when a location ping returns 409 INVALID_STATE', () => {
    availability.load().subscribe();
    http.expectOne(availabilityUrl).flush({ online: true, shift: openShift });

    TestBed.inject(HttpClient).post(`${environment.apiUrl}/v1/captain/locations`, { pings: [] }).subscribe({
      error: () => undefined,
    });

    http
      .expectOne(`${environment.apiUrl}/v1/captain/locations`)
      .flush(
        { error: { code: 'INVALID_STATE', message: 'Offline' } },
        { status: 409, statusText: 'Conflict' }
      );

    http.expectOne(availabilityUrl).flush({ online: false, shift: null });

    expect(availability.isOnline()).toBe(false);
    expect(toast.current()).toContain('إشارة الموقع');
  });
});
