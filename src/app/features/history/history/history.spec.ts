import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CaptainEmploymentType, CaptainProfile, CompletedDriverOrder } from '../../../core/models';
import { AuthService } from '../../../core/services/auth';
import { HistoryService } from '../../../core/services/history.service';
import { History } from './history';

describe('History', () => {
  it('shows trip earnings for freelancer captains', async () => {
    const fixture = await createHistory('FREELANCER', sampleOrder());
    const html = fixture.nativeElement as HTMLElement;

    expect(html.textContent).toContain('إجمالي الأرباح');
    expect(html.textContent).toContain('ربح الكابتن');
    expect(html.textContent).toContain('العميل:');
    expect(html.textContent).not.toContain('العهدة المحصّلة');
  });

  it('shows company cash instead of earnings for fixed captains', async () => {
    const fixture = await createHistory('FIXED', sampleOrder());
    const html = fixture.nativeElement as HTMLElement;

    expect(html.textContent).toContain('إجمالي العهدة المحصّلة');
    expect(html.textContent).toContain('العهدة المحصّلة');
    expect(html.textContent).toContain('290 ج.م');
    expect(html.textContent).not.toContain('إجمالي الأرباح');
    expect(html.textContent).not.toContain('ربح الكابتن');
    expect(html.textContent).not.toContain('العميل:');
  });
});

async function createHistory(
  employmentType: CaptainEmploymentType,
  order: CompletedDriverOrder,
) {
  const captain = signal<CaptainProfile>({
    id: 'cap-1',
    phone: '01000000000',
    fullName: 'أحمد',
    role: 'DELIVERY',
    vehicleType: 'MOTORCYCLE',
    status: 'ACTIVE',
    hubId: null,
    mustChangePassword: false,
    employmentType,
  });

  await TestBed.configureTestingModule({
    imports: [History],
    providers: [
      {
        provide: AuthService,
        useValue: {
          currentUserRole: signal('DELIVERY').asReadonly(),
          showPerTripEarnings: signal(employmentType === 'FREELANCER').asReadonly(),
          captain: captain.asReadonly(),
        },
      },
      {
        provide: HistoryService,
        useValue: {
          loading: signal(false).asReadonly(),
          historyOrders: signal([order]).asReadonly(),
          load: () => of(undefined),
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(History);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

function sampleOrder(): CompletedDriverOrder {
  return {
    id: 'trip-1',
    orderNumber: 'CMB-1',
    date: '21 أكتوبر 2026',
    occurredAt: '2026-10-21T12:00:00.000Z',
    status: 'COMPLETED',
    customerName: 'مريم',
    shopsCount: 2,
    paymentMethod: 'COD',
    captainProfit: 1500,
    customerTotal: 29000,
    cashCollected: 0,
  };
}
