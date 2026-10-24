import { signal, WritableSignal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CASH_IN_HAND_LIMIT_MESSAGE } from '../../../core/models';
import { CaptainLocationService } from '../../../core/services/captain-location.service';
import { DriverWalletService } from '../../../core/services/driver-wallet.service';
import { GoogleMapsLoaderService } from '../../../core/services/google-maps-loader.service';
import { TripService } from '../../../core/services/trip.service';
import { ActiveTripView } from '../../../core/trip/screen-state';
import { ComboMap } from '../../../shared/components';
import { Home } from './home';

describe('Home', () => {
  it('binds the live map to customer coordinates and the captain GPS point', async () => {
    const startWatch = vi.fn();
    const stopWatch = vi.fn();
    const tripView = signal<ActiveTripView>(customerTrip());
    const fixture = await createHome({
      screen: 'CUSTOMER',
      tripView,
      startWatch,
      stopWatch,
    });

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).not.toContain('Map Placeholder');
    expect(startWatch).toHaveBeenCalled();

    const mapDe = fixture.debugElement.query((de) => de.componentInstance instanceof ComboMap);
    const map = mapDe.componentInstance as ComboMap;
    expect(map.destinationLat()).toBe(30.2);
    expect(map.destinationLng()).toBe(31.2);
    expect(map.originLat()).toBe(30.05);
    expect(map.originLng()).toBe(31.24);
    expect(map.fallbackEtaMinutes()).toBe(0);
    expect(map.etaMinutes()).toBeNull();
  });

  it('shows a cash warning at 150 EGP and a hard stop at 200 EGP', async () => {
    const cashWarning = signal(true);
    const cashBlocked = signal(false);
    const fixture = await createHome({
      screen: 'IDLE',
      cashWarning,
      cashBlocked,
    });
    const html = fixture.nativeElement as HTMLElement;

    expect(html.textContent).toContain('تنبيه العهدة');
    expect(html.textContent).toContain('اقتربت من الحد الأقصى للعهدة');
    expect(html.querySelector('.home-screen__toggle')).not.toBeNull();

    cashBlocked.set(true);
    fixture.detectChanges();

    expect(html.textContent).toContain(CASH_IN_HAND_LIMIT_MESSAGE);
    expect(html.querySelector('.home-screen__toggle')).toBeNull();
    expect(html.textContent).not.toContain('تنبيه العهدة');
  });

  it('shows a white collection card with the cash amount and delivery actions', async () => {
    const tripView = signal<ActiveTripView>({
      ...customerTrip(),
      collectsCash: true,
      cashPiastres: 14700,
    });
    const fixture = await createHome({
      screen: 'COLLECTION',
      tripView,
    });
    const html = fixture.nativeElement as HTMLElement;

    expect(html.querySelector('.collection-card.driver-card')).not.toBeNull();
    expect(html.querySelector('.collection-card__checklist')).toBeNull();
    expect(html.textContent).toContain('المبلغ المطلوب تحصيله');
    expect(html.textContent).toContain('147 ج.م');
    expect(html.textContent).toContain('تم التحصيل والتسليم');
    expect(html.textContent).toContain('يوجد مشكلة في التسليم');
    expect(html.textContent).toContain('مريم');
    expect(html.textContent).not.toContain('برجاء تحصيل');
    expect(html.textContent).not.toContain('وصلت لموقع العميل');
    expect(html.textContent).not.toContain('حصّل المبلغ نقدًا');
    expect(html.textContent).not.toContain('سلّم الطلب وأكّد الاستلام');
  });
});

async function createHome(options: {
  screen: 'IDLE' | 'CUSTOMER' | 'COLLECTION';
  tripView?: WritableSignal<ActiveTripView | null>;
  startWatch?: ReturnType<typeof vi.fn>;
  stopWatch?: ReturnType<typeof vi.fn>;
  cashWarning?: WritableSignal<boolean>;
  cashBlocked?: WritableSignal<boolean>;
}) {
  const startWatch = options.startWatch ?? vi.fn();
  const stopWatch = options.stopWatch ?? vi.fn();
  const tripView = options.tripView ?? signal<ActiveTripView | null>(null);
  const cashWarning = options.cashWarning ?? signal(false);
  const cashBlocked = options.cashBlocked ?? signal(false);

  await TestBed.configureTestingModule({
    imports: [Home],
    providers: [
      provideHttpClient(),
      provideRouter([]),
      {
        provide: TripService,
        useValue: {
          isOnline: signal(true).asReadonly(),
          availabilityUpdating: signal(false).asReadonly(),
          screen: signal(options.screen).asReadonly(),
          stateLabel: signal('جاهز').asReadonly(),
          offerCard: signal(null).asReadonly(),
          tripView: tripView.asReadonly(),
          pendingAction: signal(null).asReadonly(),
          pendingStopId: signal(null).asReadonly(),
          synced: signal(true).asReadonly(),
          farPrompt: signal(null).asReadonly(),
          task: signal(null).asReadonly(),
          toggleOnline: vi.fn(),
          forceOffline: vi.fn(),
          acceptOffer: vi.fn(),
          declineOffer: vi.fn(),
          completeCurrentStop: vi.fn(),
          arriveAtCustomer: vi.fn(),
          reportIssue: vi.fn(),
          submitFarReason: vi.fn(),
          dismissFarPrompt: vi.fn(),
        },
      },
      {
        provide: DriverWalletService,
        useValue: {
          isCashWarning: cashWarning.asReadonly(),
          isCashBlocked: cashBlocked.asReadonly(),
          load: vi.fn(() => of(undefined)),
        },
      },
      {
        provide: CaptainLocationService,
        useValue: {
          point: signal({ lat: 30.05, lng: 31.24 }).asReadonly(),
          startWatch,
          stopWatch,
        },
      },
      {
        provide: GoogleMapsLoaderService,
        useValue: { load: vi.fn(() => Promise.reject(new Error('offline'))) },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(Home);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

function customerTrip(): ActiveTripView {
  return {
    taskId: 'task-1',
    orderNumber: 'CMB-1',
    mode: 'DELIVER_ONLY',
    modeLabel: 'توصيل',
    hubName: 'هب',
    hubAddress: '',
    hubLat: 30.1,
    hubLng: 31.1,
    hubTitle: 'نقطة التجميع',
    hubActionLabel: 'تأكيد',
    vendorStops: [],
    pickedUpCount: 0,
    vendorsCount: 1,
    itemsCount: 2,
    customerName: 'مريم',
    customerPhone: '01000000000',
    customerAddress: 'التجمع',
    customerLandmark: '',
    customerInstructions: null,
    orderNotes: null,
    callBeforeDelivery: false,
    customerLat: 30.2,
    customerLng: 31.2,
    etaMinutes: 0,
    cashPiastres: 0,
    collectsCash: false,
    currentStopId: 'stop-customer',
  };
}
