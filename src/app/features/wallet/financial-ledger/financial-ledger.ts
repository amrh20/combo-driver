import { Component, computed, inject, signal } from '@angular/core';

import { TRANSACTION_TYPE_LABELS, LedgerTransaction, TransactionType } from '../../../core/models';
import { DriverWalletService } from '../../../core/services/driver-wallet.service';
import { ComboButton } from '../../../shared/components';
import { formatMoney } from '../../../shared/utils/format';

type PeriodFilter = 'today' | 'week' | 'month';

type AmountTone = 'positive' | 'negative' | 'neutral';

@Component({
  selector: 'app-financial-ledger',
  imports: [ComboButton],
  templateUrl: './financial-ledger.html',
  styleUrl: './financial-ledger.scss',
})
export class FinancialLedger {
  private readonly wallet = inject(DriverWalletService);

  readonly periodFilter = signal<PeriodFilter>('today');
  readonly selectedDate = signal('');

  readonly filteredTransactions = computed(() => {
    const customDate = this.selectedDate();
    const transactions = this.wallet.ledgerTransactions();

    if (customDate) {
      return this.sortTransactions(
        transactions.filter((txn) => this.toDateKey(txn.occurredAt) === customDate)
      );
    }

    const range = this.getPeriodRange(this.periodFilter());
    return this.sortTransactions(
      transactions.filter((txn) => {
        const occurredAt = new Date(txn.occurredAt);
        return occurredAt >= range.start && occurredAt <= range.end;
      })
    );
  });

  readonly periodSummary = computed(() => {
    return this.filteredTransactions().reduce(
      (acc, txn) => {
        const tone = this.getAmountTone(txn.type);

        if (tone === 'positive') {
          acc.credits += txn.amount;
        }

        if (tone === 'negative') {
          acc.debits += txn.amount;
        }

        return acc;
      },
      { credits: 0, debits: 0 }
    );
  });

  selectPeriod(period: PeriodFilter): void {
    this.periodFilter.set(period);
    this.selectedDate.set('');
  }

  onDateChange(value: string): void {
    this.selectedDate.set(value);
  }

  clearDateFilter(): void {
    this.selectedDate.set('');
  }

  typeLabel(type: TransactionType): string {
    return TRANSACTION_TYPE_LABELS[type];
  }

  formatMoney = formatMoney;

  formatTime(occurredAt: string): string {
    return new Date(occurredAt).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDate(occurredAt: string): string {
    return new Date(occurredAt).toLocaleDateString('ar-EG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  amountPrefix(type: TransactionType): string {
    const tone = this.getAmountTone(type);
    if (tone === 'positive') return '+';
    if (tone === 'negative') return '−';
    return '';
  }

  amountTone(type: TransactionType): AmountTone {
    return this.getAmountTone(type);
  }

  isPeriodActive(period: PeriodFilter): boolean {
    return !this.selectedDate() && this.periodFilter() === period;
  }

  private getAmountTone(type: TransactionType): AmountTone {
    if (type === 'ORDER_DELIVERY' || type === 'BONUS') {
      return 'positive';
    }

    if (type === 'ADVANCE') {
      return 'negative';
    }

    return 'neutral';
  }

  private getPeriodRange(period: PeriodFilter): { start: Date; end: Date } {
    const end = this.endOfDay(new Date());
    const start = new Date(end);

    if (period === 'today') {
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }

    if (period === 'week') {
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }

    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  private endOfDay(date: Date): Date {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  private toDateKey(occurredAt: string): string {
    const date = new Date(occurredAt);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private sortTransactions(transactions: LedgerTransaction[]): LedgerTransaction[] {
    return [...transactions].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );
  }
}
