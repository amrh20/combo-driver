import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CashSettlementStatus } from '../../../core/models';
import { formatArabicDateTime } from '../../../core/mocks/date-helpers';
import { AuthService } from '../../../core/services/auth';
import { DriverWalletService } from '../../../core/services/driver-wallet.service';
import { ToastService } from '../../../core/services/toast.service';
import { ComboButton } from '../../../shared/components';
import { formatMoney } from '../../../shared/utils/format';

type ConfirmAction = 'remit' | 'payout' | null;

@Component({
  selector: 'app-wallet',
  imports: [ComboButton],
  templateUrl: './wallet.html',
  styleUrl: './wallet.scss',
})
export class Wallet implements OnInit {
  private readonly walletService = inject(DriverWalletService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentUserRole = this.auth.currentUserRole;
  readonly showCashRemittance = computed(
    () => this.currentUserRole() === 'DELIVERY' || this.currentUserRole() === 'BOTH'
  );
  readonly showEarnings = this.auth.showPerTripEarnings;
  readonly earningsLabel = computed(() =>
    this.currentUserRole() === 'COLLECTOR' ? 'مكافأة التجميع' : 'أرباح التوصيل'
  );

  readonly loading = this.walletService.loading;
  readonly unremittedCash = this.walletService.companyCashBalance;
  readonly earnings = this.walletService.earnings;
  readonly bonus = this.walletService.bonus;
  readonly advances = this.walletService.advances;
  readonly netPayout = this.walletService.netPayout;
  readonly settlements = this.walletService.settlements;
  readonly hasPendingCashSettlement = this.walletService.hasPendingCashSettlement;
  readonly pendingConfirm = signal<ConfirmAction>(null);
  readonly settling = signal(false);
  readonly cashActionDisabled = computed(
    () =>
      this.loading() ||
      this.settling() ||
      this.hasPendingCashSettlement() ||
      this.unremittedCash() <= 0,
  );

  readonly confirmTitle = computed(() => {
    switch (this.pendingConfirm()) {
      case 'remit':
        return 'تأكيد توريد الكاش';
      case 'payout':
        return 'تأكيد قبض المستحقات';
      default:
        return '';
    }
  });

  readonly confirmMessage = computed(() => {
    switch (this.pendingConfirm()) {
      case 'remit':
        return `هل تم توريد ${formatMoney(this.unremittedCash())} للعمليات؟ سيُرسل الطلب للتأكيد، والعهدة تبقى كما هي حتى يؤكدها فريق العمليات.`;
      case 'payout':
        return `هل تم قبض ${formatMoney(this.netPayout())} من المستحقات؟ سيتم تصفير الصافي المستحق.`;
      default:
        return '';
    }
  });

  formatMoney = formatMoney;
  formatSettlementDate = formatArabicDateTime;

  ngOnInit(): void {
    this.walletService
      .load({ settlements: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  cashActionLabel(): string {
    return this.hasPendingCashSettlement() ? 'في انتظار تأكيد العمليات' : ' توريد الكاش ';
  }

  settlementStatusLabel(status: CashSettlementStatus): string {
    switch (status) {
      case 'PENDING':
        return 'قيد الانتظار';
      case 'REJECTED':
        return 'مرفوض';
      default:
        return 'تم التأكيد';
    }
  }

  openRemitConfirm(): void {
    if (this.cashActionDisabled()) {
      return;
    }

    this.pendingConfirm.set('remit');
  }

  openPayoutConfirm(): void {
    if (this.settling() || this.netPayout() <= 0) {
      return;
    }

    this.pendingConfirm.set('payout');
  }

  closeConfirm(): void {
    if (this.settling()) {
      return;
    }

    this.pendingConfirm.set(null);
  }

  confirmAction(): void {
    const action = this.pendingConfirm();

    if (!action || this.settling()) {
      return;
    }

    this.settling.set(true);

    const request = action === 'remit' ? this.walletService.settleCash() : this.walletService.settlePayout();

    request.subscribe({
      next: () => {
        this.settling.set(false);
        this.pendingConfirm.set(null);
      },
      error: (error: unknown) => {
        this.settling.set(false);

        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.pendingConfirm.set(null);
          this.walletService.load({ settlements: true }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
              if (action === 'remit' && this.hasPendingCashSettlement()) {
                this.toast.show('طلب التوريد قيد انتظار تأكيد العمليات.');
                return;
              }

              this.toast.show(action === 'remit' ? 'العهدة صفر بالفعل.' : 'لا توجد مستحقات للقبض.');
            },
            error: () => undefined,
          });
          return;
        }

        this.toast.show(settlementErrorMessage(error));
      },
    });
  }
}

function settlementErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 0) {
    return 'تعذر الاتصال بالخادم. تأكد أن الخدمة تعمل.';
  }

  return 'تعذر تنفيذ التسوية. حاول مرة أخرى.';
}
