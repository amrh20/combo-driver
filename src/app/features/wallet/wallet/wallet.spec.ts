import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CaptainEmploymentType, CaptainProfile } from '../../../core/models';
import { AuthService } from '../../../core/services/auth';
import { DriverWalletService } from '../../../core/services/driver-wallet.service';
import { ToastService } from '../../../core/services/toast.service';
import { Wallet } from './wallet';

describe('Wallet', () => {
  it('hides net payout for a fixed captain and keeps company cash', async () => {
    const fixture = await createWallet('FIXED');
    const html = fixture.nativeElement as HTMLElement;

    expect(html.textContent).toContain('العهدة الحالية');
    expect(html.textContent).toContain('توريد الكاش');
    expect(html.textContent).not.toContain('مستحقاتي');
    expect(html.textContent).not.toContain('الصافي المستحق');
  });

  it('shows net payout only for a freelancer captain', async () => {
    const fixture = await createWallet('FREELANCER');
    const html = fixture.nativeElement as HTMLElement;

    expect(html.textContent).toContain('العهدة الحالية');
    expect(html.textContent).toContain('توريد الكاش');
    expect(html.textContent).toContain('مستحقاتي');
    expect(html.textContent).toContain('الصافي المستحق');
  });

  it('hides net payout when employment type is missing', async () => {
    const fixture = await createWallet(undefined);
    const html = fixture.nativeElement as HTMLElement;

    expect(html.textContent).toContain('العهدة الحالية');
    expect(html.textContent).not.toContain('مستحقاتي');
  });
});

async function createWallet(employmentType: CaptainEmploymentType | undefined) {
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
    imports: [Wallet],
    providers: [
      provideRouter([]),
      {
        provide: AuthService,
        useValue: {
          currentUserRole: signal('DELIVERY').asReadonly(),
          captain: captain.asReadonly(),
          showPerTripEarnings: signal(employmentType === 'FREELANCER').asReadonly(),
        },
      },
      {
        provide: DriverWalletService,
        useValue: {
          loading: signal(false).asReadonly(),
          companyCashBalance: signal(150).asReadonly(),
          earnings: signal(40).asReadonly(),
          bonus: signal(10).asReadonly(),
          advances: signal(5).asReadonly(),
          netPayout: signal(45).asReadonly(),
          settlements: signal([]).asReadonly(),
          hasPendingCashSettlement: signal(false).asReadonly(),
          load: () => of(undefined),
        },
      },
      {
        provide: ToastService,
        useValue: { show: () => undefined },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(Wallet);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}
