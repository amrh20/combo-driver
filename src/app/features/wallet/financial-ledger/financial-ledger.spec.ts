import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { CaptainEmploymentType, CaptainProfile, LedgerTransaction } from '../../../core/models';
import { AuthService } from '../../../core/services/auth';
import { DriverWalletService } from '../../../core/services/driver-wallet.service';
import { FinancialLedger } from './financial-ledger';

describe('FinancialLedger', () => {
  it('shows earnings summary and delivery rows for freelancers', async () => {
    const fixture = await createLedger('FREELANCER', sampleTransactions());
    const html = fixture.nativeElement as HTMLElement;

    expect(html.textContent).toContain('الحركات المالية');
    expect(html.textContent).toContain('إضافات');
    expect(html.textContent).toContain('أرباح توصيل');
    expect(html.textContent).toContain('بونص');
  });

  it('shows only company cash rows for fixed captains', async () => {
    const fixture = await createLedger('FIXED', sampleTransactions());
    const html = fixture.nativeElement as HTMLElement;

    expect(html.textContent).toContain('حركات العهدة');
    expect(html.textContent).toContain('إجمالي العهدة المحصّلة');
    expect(html.textContent).toContain('تحصيل نقدي');
    expect(html.textContent).not.toContain('إضافات');
    expect(html.textContent).not.toContain('أرباح توصيل');
    expect(html.textContent).not.toContain('بونص');
  });
});

async function createLedger(
  employmentType: CaptainEmploymentType,
  transactions: LedgerTransaction[],
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
    imports: [FinancialLedger],
    providers: [
      provideRouter([]),
      {
        provide: AuthService,
        useValue: {
          showPerTripEarnings: signal(employmentType === 'FREELANCER').asReadonly(),
          captain: captain.asReadonly(),
        },
      },
      {
        provide: DriverWalletService,
        useValue: {
          ledgerTransactions: signal(transactions).asReadonly(),
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(FinancialLedger);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

function sampleTransactions(): LedgerTransaction[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  return [
    {
      id: 'cash-1',
      type: 'CASH_COLLECTION',
      amount: 120,
      description: 'تحصيل طلب CMB-1',
      orderId: 'CMB-1',
      occurredAt: today.toISOString(),
    },
    {
      id: 'earn-1',
      type: 'ORDER_DELIVERY',
      amount: 25,
      description: 'أرباح توصيل',
      orderId: 'CMB-1',
      occurredAt: today.toISOString(),
    },
    {
      id: 'bonus-1',
      type: 'BONUS',
      amount: 10,
      description: 'بونص',
      occurredAt: today.toISOString(),
    },
  ];
}
