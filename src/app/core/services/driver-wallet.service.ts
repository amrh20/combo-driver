import { Injectable, computed, signal } from '@angular/core';

import { driverTransactions } from '../mocks/driver.mock';
import {
  ActiveDriverOrder,
  LedgerTransaction,
  SettlementBucket,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class DriverWalletService {
  /** Ledger is the single source of truth for all wallet balances. */
  private readonly transactions = signal<LedgerTransaction[]>([...driverTransactions]);

  readonly ledgerTransactions = this.transactions.asReadonly();

  readonly unremittedCash = computed(() =>
    this.reduceBucket(
      this.transactions(),
      (txn) => (txn.type === 'CASH_COLLECTION' ? txn.amount : 0),
      'CASH'
    )
  );

  readonly earnings = computed(() =>
    this.reduceBucket(
      this.transactions(),
      (txn) => (txn.type === 'ORDER_DELIVERY' ? txn.amount : 0),
      'EARNINGS'
    )
  );

  readonly bonus = computed(() =>
    this.reduceBucket(
      this.transactions(),
      (txn) => (txn.type === 'BONUS' ? txn.amount : 0),
      'BONUS'
    )
  );

  readonly advances = computed(() =>
    this.reduceBucket(
      this.transactions(),
      (txn) => (txn.type === 'ADVANCE' ? txn.amount : 0),
      'ADVANCE'
    )
  );

  /** Records cash + earnings ledger rows for a successful delivery. */
  recordSuccessfulDelivery(order: ActiveDriverOrder): void {
    const now = Date.now();
    const occurredAt = new Date(now).toISOString();

    this.appendMany([
      {
        id: `TXN-${order.id}-CASH-${now}`,
        type: 'CASH_COLLECTION',
        amount: order.finalCashTotal,
        description: 'تحصيل نقدي من العميل',
        orderId: order.id,
        occurredAt,
      },
      {
        id: `TXN-${order.id}-DEL-${now + 1}`,
        type: 'ORDER_DELIVERY',
        amount: order.expectedEarnings,
        description: `أرباح توصيل — طلب ${order.id}`,
        orderId: order.id,
        occurredAt: new Date(now + 1000).toISOString(),
      },
    ]);
  }

  /** Settles company cash by appending a CASH settlement equal to current balance. */
  clearUnremittedCash(): void {
    const amount = this.unremittedCash();
    if (amount <= 0) {
      return;
    }

    this.appendSettlement(amount, 'توريد عهدة نقدية للهب', 'CASH');
  }

  /** Settles personal net payout by zeroing earnings, bonus, and advances via settlements. */
  clearNetPayout(): void {
    const earnings = this.earnings();
    const bonus = this.bonus();
    const advances = this.advances();

    if (earnings <= 0 && bonus <= 0 && advances <= 0) {
      return;
    }

    const stamp = Date.now();
    const rows: LedgerTransaction[] = [];

    if (earnings > 0) {
      rows.push(
        this.buildSettlement(
          `TXN-SETTLE-EARN-${stamp}`,
          earnings,
          'قبض مستحقات الأرباح',
          'EARNINGS'
        )
      );
    }

    if (bonus > 0) {
      rows.push(
        this.buildSettlement(
          `TXN-SETTLE-BONUS-${stamp + 1}`,
          bonus,
          'قبض البونص',
          'BONUS'
        )
      );
    }

    if (advances > 0) {
      rows.push(
        this.buildSettlement(
          `TXN-SETTLE-ADV-${stamp + 2}`,
          advances,
          'تسوية السلف مع المستحقات',
          'ADVANCE'
        )
      );
    }

    this.appendMany(rows);
  }

  private reduceBucket(
    transactions: LedgerTransaction[],
    creditOf: (txn: LedgerTransaction) => number,
    bucket: SettlementBucket
  ): number {
    return transactions.reduce((sum, txn) => {
      const credit = creditOf(txn);
      const debit =
        txn.type === 'SETTLEMENT' && txn.settles === bucket ? txn.amount : 0;
      return sum + credit - debit;
    }, 0);
  }

  private appendSettlement(
    amount: number,
    description: string,
    settles: SettlementBucket
  ): void {
    this.appendMany([
      this.buildSettlement(`TXN-SETTLE-${settles}-${Date.now()}`, amount, description, settles),
    ]);
  }

  private buildSettlement(
    id: string,
    amount: number,
    description: string,
    settles: SettlementBucket
  ): LedgerTransaction {
    return {
      id,
      type: 'SETTLEMENT',
      amount,
      description,
      occurredAt: new Date().toISOString(),
      settles,
    };
  }

  private appendMany(rows: LedgerTransaction[]): void {
    this.transactions.update((list) => [...rows, ...list]);
  }
}
