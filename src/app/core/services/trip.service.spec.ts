import { TestBed } from '@angular/core/testing';

import { AuthService, DriverRole } from './auth';
import { TripService } from './trip.service';

describe('TripService role-based flow', () => {
  let auth: AuthService;
  let trip: TripService;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    auth = TestBed.inject(AuthService);
    trip = TestBed.inject(TripService);
  });

  function loginAs(role: DriverRole): void {
    expect(auth.login('01000000000', 'driver123', role)).toBe(true);
  }

  function collectAllShops(): void {
    for (const shop of trip.order().subOrders) {
      trip.markShopPickedUp(shop.shopId);
    }
  }

  it('starts a collector at store collection and ends after hub handover', () => {
    loginAs('COLLECTOR');

    trip.acceptOrder();
    expect(trip.tripState()).toBe('HEADING_TO_HUB');

    collectAllShops();
    trip.completeCollectorHandover();

    expect(trip.tripState()).toBe('IDLE');
    expect(trip.hasIncomingOrder()).toBe(false);
  });

  it('starts a delivery driver at hub pickup before customer delivery', () => {
    loginAs('DELIVERY');

    trip.acceptOrder();
    expect(trip.tripState()).toBe('HUB_PICKUP');

    trip.confirmHubPickup();
    expect(trip.tripState()).toBe('HEADING_TO_CUSTOMER');
  });

  it('keeps the full collection and delivery flow for both roles', () => {
    loginAs('BOTH');

    trip.acceptOrder();
    expect(trip.tripState()).toBe('HEADING_TO_HUB');

    collectAllShops();
    trip.markPickedUp();

    expect(trip.tripState()).toBe('HEADING_TO_CUSTOMER');
  });

  it('persists the selected demo role', () => {
    loginAs('DELIVERY');

    expect(auth.currentUserRole()).toBe('DELIVERY');
    expect(window.localStorage.getItem('combo-driver-mock-role')).toBe('DELIVERY');
  });
});
