import { Component, computed, inject, signal } from '@angular/core';

import { DriverWalletService } from '../../../core/services/driver-wallet.service';
import { ComboButton } from '../../../shared/components';
import { formatMoney } from '../../../shared/utils/format';

type ConfirmAction = 'remit' | 'payout' | null;

@Component({
  selector: 'app-wallet',
  imports: [ComboButton],
  templateUrl: './wallet.html',
  styleUrl: './wallet.scss',
})
export class Wallet {
  private readonly walletService = inject(DriverWalletService);

  readonly unremittedCash = this.walletService.unremittedCash;
  readonly earnings = this.walletService.earnings;
  readonly bonus = this.walletService.bonus;
  readonly advances = this.walletService.advances;

  readonly netPayout = computed(
    () => this.earnings() + this.bonus() - this.advances()
  );

  readonly pendingConfirm = signal<ConfirmAction>(null);

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
        return `هل تم توريد ${formatMoney(this.unremittedCash())} للهب؟ سيتم تصفير العهدة الحالية.`;
      case 'payout':
        return `هل تم قبض ${formatMoney(this.netPayout())} من المستحقات؟ سيتم تصفير الصافي المستحق.`;
      default:
        return '';
    }
  });

  formatMoney = formatMoney;

  openRemitConfirm(): void {
    if (this.unremittedCash() <= 0) {
      return;
    }

    this.pendingConfirm.set('remit');
  }

  openPayoutConfirm(): void {
    if (this.netPayout() <= 0) {
      return;
    }

    this.pendingConfirm.set('payout');
  }

  closeConfirm(): void {
    this.pendingConfirm.set(null);
  }

  confirmAction(): void {
    const action = this.pendingConfirm();

    if (action === 'remit') {
      this.walletService.clearUnremittedCash();
    }

    if (action === 'payout') {
      this.walletService.clearNetPayout();
    }

    this.pendingConfirm.set(null);
  }
}
