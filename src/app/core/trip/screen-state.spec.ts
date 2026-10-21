import { CaptainOffer, CaptainTask, TaskFlags, TaskStop } from '../models';
import {
  buildOfferCard,
  buildTripView,
  currentStopOf,
  hubActionLabel,
  screenFromTask,
} from './screen-state';

describe('captain screen state', () => {
  it('stays idle without a live task', () => {
    expect(screenFromTask(null)).toBe('IDLE');
    expect(screenFromTask(task({ status: 'COMPLETED', currentStopId: null }))).toBe('IDLE');
  });

  it('follows the current stop and ignores the captain role', () => {
    const vendor = task();
    expect(screenFromTask(vendor)).toBe('VENDOR');
    expect(currentStopOf(vendor)?.id).toBe('stop-vendor');

    expect(screenFromTask(task({
      flags: flags('DELIVER_ONLY'),
      currentStopId: 'stop-hub',
      stops: [hubStop(), customerStop()],
    }))).toBe('HUB');

    expect(screenFromTask(task({
      flags: flags('COLLECT_ONLY'),
      currentStopId: 'stop-hub',
      stops: [vendorStop('DONE'), hubStop()],
    }))).toBe('HUB');

    expect(screenFromTask(task({
      currentStopId: 'stop-customer',
      stops: [vendorStop('DONE'), hubStop('DONE'), customerStop()],
    }))).toBe('CUSTOMER');

    expect(screenFromTask(task({
      currentStopId: 'stop-customer',
      stops: [customerStop('ARRIVED')],
    }))).toBe('COLLECTION');
  });

  it('shows an open issue ahead of the current stop', () => {
    expect(screenFromTask(task({
      openIssue: {
        id: 'issue-1',
        taskId: 'task-1',
        type: 'CUSTOMER_UNREACHABLE',
        note: null,
        createdAt: '2026-10-18T12:00:00.000Z',
      },
    }))).toBe('ISSUE');
  });

  it('builds the offer card from flags', () => {
    const card = buildOfferCard(offer());
    expect(card.id).toBe('CMB-1');
    expect(card.showDropoff).toBe(true);
    expect(card.showCash).toBe(true);
    expect(card.distanceKm).toBe(4.2);
    expect(card.earningsLabel).toBe('أرباح التوصيل');

    const collectOnly = offer();
    collectOnly.task.flags = flags('COLLECT_ONLY');
    collectOnly.task.dropoffArea = null;
    const collectCard = buildOfferCard(collectOnly);
    expect(collectCard.showDropoff).toBe(false);
    expect(collectCard.showCash).toBe(false);
    expect(collectCard.showStores).toBe(true);
    expect(collectCard.earningsLabel).toBe('مكافأة التجميع');
  });

  it('labels the hub action from flags.mode and only marks the current shop', () => {
    expect(hubActionLabel('DELIVER_ONLY')).toBe('تأكيد استلام الطلب من نقطة التجميع');
    expect(hubActionLabel('COLLECT_ONLY')).toBe('تسليم الطلب في نقطة التجميع');
    expect(hubActionLabel('COLLECT_AND_DELIVER')).toBe('بدء التوصيل للعميل');

    const view = buildTripView(task({
      stops: [vendorStop('DONE', 'stop-done'), vendorStop('PENDING', 'stop-vendor'), hubStop()],
    }));
    expect(view.vendorStops.map((shop) => shop.isCurrent)).toEqual([false, true]);
    expect(view.pickedUpCount).toBe(1);
    expect(view.vendorStops[1]?.statusLabel).toBe('بانتظار الاستلام');
    expect(view.vendorStops[0]?.statusLabel).toBe('تم الاستلام');
  });
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

function vendorStop(status: TaskStop['status'] = 'PENDING', id = 'stop-vendor'): TaskStop {
  return {
    id,
    seq: 1,
    kind: 'VENDOR',
    status,
    location: { lat: 30, lng: 31 },
    shop: {
      subOrderId: `sub-${id}`,
      vendorId: 'vendor-1',
      name: 'متجر',
      phone: null,
      status: 'READY_FOR_PICKUP',
      notes: null,
      itemsCount: 2,
      items: [{ id: 'item-1', name: 'قهوة', unitPrice: 2500, quantity: 2 }],
      subtotal: 5000,
    },
  };
}

function hubStop(status: TaskStop['status'] = 'PENDING'): TaskStop {
  return {
    id: 'stop-hub',
    seq: 2,
    kind: 'HUB',
    status,
    location: { lat: 30.1, lng: 31.1 },
    shop: null,
  };
}

function customerStop(status: TaskStop['status'] = 'PENDING'): TaskStop {
  return {
    id: 'stop-customer',
    seq: 3,
    kind: 'CUSTOMER',
    status,
    location: { lat: 30.2, lng: 31.2 },
    shop: null,
  };
}

function task(overrides: Partial<CaptainTask> = {}): CaptainTask {
  return {
    id: 'task-1',
    status: 'ASSIGNED',
    flags: flags('COLLECT_AND_DELIVER'),
    order: { id: 'order-1', orderNumber: 'CMB-1', notes: null, callBeforeDelivery: false },
    hub: { id: 'hub-1', name: 'هب التجمع', address: 'شارع التسعين', location: { lat: 30.1, lng: 31.1 } },
    customer: {
      name: 'مريم',
      phone: '01000000000',
      address: 'التجمع',
      floor: null,
      apartment: null,
      landmark: 'بجوار الصيدلية',
      deliveryInstructions: null,
      location: { lat: 30.2, lng: 31.2 },
    },
    cashToCollect: 15000,
    stops: [vendorStop(), hubStop(), customerStop()],
    currentStopId: 'stop-vendor',
    openIssue: null,
    totalDistanceMeters: 4200,
    etaMinutes: 12,
    expectedEarnings: 0,
    ...overrides,
  };
}

function offer(expiresAt = '2026-10-18T12:01:00.000Z'): CaptainOffer {
  return {
    id: 'offer-1',
    expiresAt,
    task: {
      id: 'task-1',
      orderNumber: 'CMB-1',
      flags: flags('COLLECT_AND_DELIVER'),
      pickupHubName: 'هب التجمع',
      hub: { id: 'hub-1', name: 'هب التجمع', address: 'شارع التسعين', location: { lat: 30.1, lng: 31.1 } },
      dropoffArea: 'التجمع',
      vendorsCount: 1,
      itemsCount: 2,
      cashToCollect: 15000,
      expectedEarnings: 0,
      totalDistanceMeters: 4200,
      etaMinutes: 12,
    },
  };
}
