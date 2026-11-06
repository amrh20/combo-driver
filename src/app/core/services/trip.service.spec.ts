import { signal, WritableSignal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { CAPTAIN_NETWORK_MESSAGE } from '../http/captain-error';
import { CaptainOffer, CaptainTask, RealtimeMessage, TaskFlags, TaskStop } from '../models';
import { AuthService } from './auth';
import { AvailabilityService } from './availability.service';
import { CaptainLocationService } from './captain-location.service';
import { DriverWalletService } from './driver-wallet.service';
import { RealtimeService } from './realtime.service';
import { ToastService } from './toast.service';
import { TripService } from './trip.service';

const offersUrl = `${environment.apiUrl}/v1/captain/offers/current`;
const tasksUrl = `${environment.apiUrl}/v1/captain/tasks/current`;

describe('TripService', () => {
  let trip: TripService;
  let http: HttpTestingController;
  let toast: ToastService;
  let authed: WritableSignal<boolean>;
  let online: WritableSignal<boolean>;
  let cashBlocked: WritableSignal<boolean>;
  let messages$: Subject<RealtimeMessage>;
  let connected$: Subject<void>;
  let startRealtime: ReturnType<typeof vi.fn>;
  let setOnline: ReturnType<typeof vi.fn>;
  let loadWallet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    authed = signal(false);
    online = signal(false);
    cashBlocked = signal(false);
    messages$ = new Subject();
    connected$ = new Subject();
    startRealtime = vi.fn();
    setOnline = vi.fn(() => of({ online: true, shift: null }));
    loadWallet = vi.fn(() => of(undefined));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { isAuthenticated: authed.asReadonly() },
        },
        {
          provide: AvailabilityService,
          useValue: {
            isOnline: online.asReadonly(),
            updating: signal(false),
            setOnline,
          },
        },
        {
          provide: DriverWalletService,
          useValue: {
            isCashBlocked: cashBlocked.asReadonly(),
            load: loadWallet,
          },
        },
        {
          provide: RealtimeService,
          useValue: {
            start: startRealtime,
            stop: vi.fn(),
            messages$,
            connected$,
          },
        },
        {
          provide: CaptainLocationService,
          useValue: { current: () => of({ lat: 30.1, lng: 31.2 }) },
        },
      ],
    });

    trip = TestBed.inject(TripService);
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    TestBed.flushEffects();
  });

  afterEach(() => {
    http.verify();
  });

  it('loads the current task and offer when the captain is online', () => {
    goOnline(liveOffer());

    expect(startRealtime).toHaveBeenCalled();
    expect(trip.offer()?.id).toBe('offer-1');
    expect(trip.offerCard()?.id).toBe('CMB-1');
    expect(trip.screen()).toBe('IDLE');
  });

  it('keeps an offer after expiresAt has passed', () => {
    const current = liveOffer();
    current.expiresAt = new Date(Date.now() - 5_000).toISOString();
    goOnline(current);

    expect(trip.offer()?.id).toBe('offer-1');
    expect(trip.offerCard()?.id).toBe('CMB-1');
  });

  it('polls the current offer while online and idle', () => {
    vi.useFakeTimers();
    goOnline(null);

    vi.advanceTimersByTime(10_000);
    http.expectOne(offersUrl).flush(liveOffer());
    expect(trip.offer()?.id).toBe('offer-1');

    vi.useRealTimers();
  });

  it('refetches the active task when order.modified arrives, without a toast', () => {
    goOnline(null);
    messages$.next({ event: 'order.modified', id: 'evt-mod', data: { orderId: 'order-1' } });

    http.expectOne(tasksUrl).flush(null);
    expect(toast.current()).toBeNull();
  });

  it('completes a vendor stop as multipart invoice via stops/{stopId}/complete', () => {
    goOnline(null, vendorTask());
    const file = new File([new Uint8Array([1, 2, 3])], 'invoice.png', { type: 'image/png' });
    let closed = false;
    trip.confirmShop('task-1', 'stop-vendor', file, () => {
      closed = true;
    });

    const req = http.expectOne(`${environment.apiUrl}/v1/captain/tasks/task-1/stops/stop-vendor/complete`);
    expect(req.request.method).toBe('POST');
    const body = req.request.body as FormData;
    expect(body.get('invoice')).toBe(file);
    expect(req.request.headers.get('Idempotency-Key')).toBeTruthy();
    req.flush(customerTask());
    expect(closed).toBe(true);
    expect(toast.current()).toBe('تم تأكيد تجهيز الطلب');
    expect(trip.screen()).toBe('CUSTOMER');
    expect(trip.pendingAction()).toBeNull();
  });

  it('fetches the current offer when offer.created arrives and refetches after reconnect', () => {
    goOnline(null);
    messages$.next({ event: 'offer.created', id: 'evt-1', data: {} });

    http.expectOne(offersUrl).flush(liveOffer());
    expect(trip.offer()?.id).toBe('offer-1');

    connected$.next();
    http.expectOne(tasksUrl).flush(null);
    http.expectOne(offersUrl).flush(null);
    expect(trip.offer()).toBeNull();
  });

  it('accepts an offer with an idempotency key and replaces the card with the task', () => {
    goOnline(liveOffer());
    trip.acceptOffer();
    trip.acceptOffer();

    const request = http.expectOne(`${environment.apiUrl}/v1/captain/offers/offer-1/accept`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    expect(request.request.headers.get('Idempotency-Key')).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
    request.flush(vendorTask());

    expect(trip.screen()).toBe('VENDOR');
    expect(trip.offer()).toBeNull();
    expect(trip.pendingAction()).toBeNull();
  });

  it('declines an offer with a reason', () => {
    goOnline(liveOffer());
    trip.declineOffer('  بعيد عن موقعي  ');

    const request = http.expectOne(`${environment.apiUrl}/v1/captain/offers/offer-1/decline`);
    expect(request.request.body).toEqual({ reason: 'بعيد عن موقعي' });
    expect(request.request.headers.get('Idempotency-Key')).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
    request.flush(null);

    expect(trip.offer()).toBeNull();
  });

  it('completes a pending vendor that is not currentStopId', () => {
    goOnline(null, multiVendorTask());
    trip.completeCurrentStop('stop-vendor-2');

    const pickup = http.expectOne(
      `${environment.apiUrl}/v1/captain/tasks/task-1/stops/stop-vendor-2/complete`,
    );
    expect(pickup.request.body).toEqual({ location: { lat: 30.1, lng: 31.2 } });
    pickup.flush(multiVendorTask('stop-vendor-2'));
    expect(trip.pendingAction()).toBeNull();
  });

  it('completes a known pending stop and sends cash in piastres for a cash delivery', () => {
    goOnline(null, vendorTask());
    trip.completeCurrentStop('stop-other');
    http.expectNone(`${environment.apiUrl}/v1/captain/tasks/task-1/stops/stop-other/complete`);

    trip.completeCurrentStop('stop-vendor');
    const pickup = http.expectOne(`${environment.apiUrl}/v1/captain/tasks/task-1/stops/stop-vendor/complete`);
    expect(pickup.request.body).toEqual({ location: { lat: 30.1, lng: 31.2 } });
    expect(pickup.request.headers.get('Idempotency-Key')).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
    pickup.flush(customerTask());

    expect(trip.screen()).toBe('CUSTOMER');
    trip.arriveAtCustomer();
    const arrive = http.expectOne(`${environment.apiUrl}/v1/captain/tasks/task-1/stops/stop-customer/arrive`);
    expect(arrive.request.body).toEqual({ location: { lat: 30.1, lng: 31.2 } });
    arrive.flush(customerTask('ARRIVED'));
    expect(trip.screen()).toBe('COLLECTION');

    trip.completeCurrentStop('stop-customer');
    const deliver = http.expectOne(`${environment.apiUrl}/v1/captain/tasks/task-1/stops/stop-customer/complete`);
    expect(deliver.request.body).toEqual({
      location: { lat: 30.1, lng: 31.2 },
      cashCollected: 25000,
    });
    deliver.flush(customerTask('DONE', 'COMPLETED'));
    expect(trip.screen()).toBe('IDLE');
    expect(loadWallet).toHaveBeenCalled();
    http.expectOne(offersUrl).flush(null);
  });

  it('does not go online when company cash is at the hard limit', () => {
    cashBlocked.set(true);
    trip.toggleOnline();

    expect(setOnline).not.toHaveBeenCalled();
    expect(toast.current()).toContain('تخطيت الحد الأقصى للعهدة');
  });

  it('shows the backend 409 message and reloads the current task', () => {
    goOnline(null, vendorTask());
    trip.completeCurrentStop('stop-vendor');

    http.expectOne(`${environment.apiUrl}/v1/captain/tasks/task-1/stops/stop-vendor/complete`).flush(
      { error: { code: 'INVALID_STATE', message: 'استنى موظف الهب' } },
      { status: 409, statusText: 'Conflict' },
    );

    expect(toast.current()).toBe('استنى موظف الهب');
    http.expectOne(tasksUrl).flush(vendorTask());
    expect(trip.screen()).toBe('VENDOR');
    expect(trip.pendingAction()).toBeNull();
  });

  it('asks for farReason after 422 OUTSIDE_GEOFENCE and resubmits it', () => {
    goOnline(null, customerTask('ARRIVED'));
    expect(trip.screen()).toBe('COLLECTION');
    trip.completeCurrentStop('stop-customer');

    const first = http.expectOne(`${environment.apiUrl}/v1/captain/tasks/task-1/stops/stop-customer/complete`);
    const firstKey = first.request.headers.get('Idempotency-Key');
    first.flush(
      {
        error: {
          code: 'OUTSIDE_GEOFENCE',
          message: 'You are far from the customer',
          details: { distanceMeters: 350, maxMeters: 200 },
        },
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );

    expect(trip.farPrompt()).toEqual({
      taskId: 'task-1',
      stopId: 'stop-customer',
      distanceMeters: 350,
      maxMeters: 200,
    });
    expect(toast.current()).toBeNull();

    trip.submitFarReason('ا');
    http.expectNone(`${environment.apiUrl}/v1/captain/tasks/task-1/stops/stop-customer/complete`);

    trip.submitFarReason('العميل قابلني عند البوابة');
    const retry = http.expectOne(`${environment.apiUrl}/v1/captain/tasks/task-1/stops/stop-customer/complete`);
    expect(retry.request.body).toEqual({
      location: { lat: 30.1, lng: 31.2 },
      cashCollected: 25000,
      farReason: 'العميل قابلني عند البوابة',
    });
    expect(retry.request.headers.get('Idempotency-Key')).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
    expect(retry.request.headers.get('Idempotency-Key')).not.toBe(firstKey);
    retry.flush(customerTask('DONE', 'COMPLETED'));
    expect(trip.farPrompt()).toBeNull();
    http.expectOne(offersUrl).flush(null);
  });

  it('shows the Arabic network message when the server cannot be reached', () => {
    goOnline(liveOffer());
    trip.acceptOffer();

    http.expectOne(`${environment.apiUrl}/v1/captain/offers/offer-1/accept`).error(new ProgressEvent('error'));
    expect(toast.current()).toBe(CAPTAIN_NETWORK_MESSAGE);
    expect(trip.pendingAction()).toBeNull();
  });

  function goOnline(offer: CaptainOffer | null, task: CaptainTask | null = null): void {
    authed.set(true);
    online.set(true);
    TestBed.flushEffects();
    http.expectOne(tasksUrl).flush(task);
    http.expectOne(offersUrl).flush(offer);
  }
});

function flags(mode: TaskFlags['mode']): TaskFlags {
  return {
    mode,
    labelAr: mode,
    requiresCollection: mode !== 'DELIVER_ONLY',
    requiresHubStop: true,
    requiresDelivery: mode !== 'COLLECT_ONLY',
    collectsCash: mode !== 'COLLECT_ONLY',
    isRoleOverride: false,
  };
}

function liveOffer(): CaptainOffer {
  return {
    id: 'offer-1',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    task: {
      id: 'task-1',
      orderNumber: 'CMB-1',
      flags: flags('COLLECT_AND_DELIVER'),
      pickupHubName: 'هب التجمع',
      hub: { id: 'hub-1', name: 'هب التجمع', address: null, location: { lat: 1, lng: 2 } },
      dropoffArea: 'التجمع',
      vendorsCount: 1,
      itemsCount: 2,
      cashToCollect: 15000,
      expectedEarnings: 0,
      expectedCaptainProfit: 2000,
      totalDistanceMeters: 1000,
      etaMinutes: 8,
    },
  };
}

function vendorStop(): TaskStop {
  return {
    id: 'stop-vendor',
    seq: 1,
    kind: 'VENDOR',
    status: 'PENDING',
    location: { lat: 30, lng: 31 },
    shop: {
      subOrderId: 'sub-1',
      vendorId: 'vendor-1',
      name: 'متجر',
      phone: null,
      status: 'READY_FOR_PICKUP',
      notes: null,
      itemsCount: 1,
      items: [],
      subtotal: 0,
    },
  };
}

function customerStop(status: TaskStop['status']): TaskStop {
  return {
    id: 'stop-customer',
    seq: 2,
    kind: 'CUSTOMER',
    status,
    location: { lat: 30.2, lng: 31.2 },
    shop: null,
  };
}

function vendorTask(): CaptainTask {
  return {
    id: 'task-1',
    status: 'IN_PROGRESS',
    flags: flags('COLLECT_AND_DELIVER'),
    order: { id: 'order-1', orderNumber: 'CMB-1', notes: null, callBeforeDelivery: false },
    hub: { id: 'hub-1', name: 'هب', address: 'عنوان', location: { lat: 30.1, lng: 31.1 } },
    customer: null,
    cashToCollect: 0,
    stops: [vendorStop()],
    currentStopId: 'stop-vendor',
    openIssue: null,
    totalDistanceMeters: 1000,
    etaMinutes: 8,
    expectedEarnings: 0,
  };
}

function shopStop(id: string, seq: number, status: TaskStop['status'] = 'PENDING'): TaskStop {
  return {
    id,
    seq,
    kind: 'VENDOR',
    status,
    location: { lat: 30, lng: 31 },
    shop: {
      subOrderId: `sub-${id}`,
      vendorId: `vendor-${seq}`,
      name: 'متجر',
      phone: null,
      status: 'READY_FOR_PICKUP',
      notes: null,
      itemsCount: 1,
      items: [],
      subtotal: 0,
    },
  };
}

function multiVendorTask(completedId?: string): CaptainTask {
  const first = shopStop(
    'stop-vendor-1',
    1,
    completedId === 'stop-vendor-1' ? 'DONE' : 'PENDING',
  );
  const second = shopStop(
    'stop-vendor-2',
    2,
    completedId === 'stop-vendor-2' ? 'DONE' : 'PENDING',
  );
  return {
    ...vendorTask(),
    stops: [first, second],
    currentStopId: first.status === 'PENDING' ? first.id : second.id,
  };
}

function customerTask(status: TaskStop['status'] = 'PENDING', taskStatus: CaptainTask['status'] = 'IN_PROGRESS'): CaptainTask {
  const active = taskStatus === 'ASSIGNED' || taskStatus === 'IN_PROGRESS';
  return {
    id: 'task-1',
    status: taskStatus,
    flags: flags('DELIVER_ONLY'),
    order: { id: 'order-1', orderNumber: 'CMB-1', notes: null, callBeforeDelivery: false },
    hub: { id: 'hub-1', name: 'هب', address: 'عنوان', location: { lat: 30.1, lng: 31.1 } },
    customer: {
      name: 'مريم',
      phone: '010',
      address: 'التجمع',
      floor: null,
      apartment: null,
      landmark: null,
      deliveryInstructions: null,
      location: { lat: 30.2, lng: 31.2 },
    },
    cashToCollect: 25000,
    stops: [customerStop(status)],
    currentStopId: active ? 'stop-customer' : null,
    openIssue: null,
    totalDistanceMeters: 1000,
    etaMinutes: 8,
    expectedEarnings: 0,
  };
}
