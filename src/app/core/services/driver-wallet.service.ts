import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, switchMap, tap } from 'rxjs';

import { piastresToEgp } from '../../shared/utils/format';
import { environment } from '../../../environments/environment';
import { CursorPage, collectCursorPages } from '../http/cursor-page';
import { idempotencyHeaders } from '../http/idempotency';
import {
  CASH_IN_HAND_LIMIT_EGP,
  CASH_IN_HAND_WARNING_EGP,
  CaptainWallet,
  CashSettlement,
  CashSettlementStatus,
  DriverWalletState,
  LedgerTransaction,
  SettlementTransaction,
} from '../models';

const WALLET_URL = `${environment.apiUrl}/v1/captain/wallet`;
const SETTLE_URL = `${environment.apiUrl}/v1/captain/wallet/settle`;
const SETTLE_PAYOUT_URL = `${environment.apiUrl}/v1/captain/wallet/settle-payout`;
const SETTLEMENT_HISTORY_URL = `${environment.apiUrl}/v1/captain/wallet/history`;
const PAGE_LIMIT = '100';

const EMPTY_WALLET: DriverWalletState = {
  unremittedCash: 0,
  earnings: 0,
  bonus: 0,
  advances: 0,
};

@Injectable({
  providedIn: 'root',
})
export class DriverWalletService {
  private readonly http = inject(HttpClient);

  /** Bumped on logout so an in-flight response cannot restore the previous captain. */
  private generation = 0;

  private readonly balances = signal<DriverWalletState>(EMPTY_WALLET);
  /** No ledger list endpoint yet. The screen reads this and shows its empty state. */
  private readonly transactions = signal<LedgerTransaction[]>([]);
  private readonly settlementsState = signal<CashSettlement[]>([]);
  private readonly pendingCash = signal(false);

  readonly ledgerTransactions = this.transactions.asReadonly();
  readonly settlements = this.settlementsState.asReadonly();
  readonly loading = signal(false);

  readonly unremittedCash = computed(() => this.balances().unremittedCash);
  /** Company cash / العهدة. Same bucket as `unremittedCash`. */
  readonly companyCashBalance = this.unremittedCash;
  readonly earnings = computed(() => this.balances().earnings);
  readonly bonus = computed(() => this.balances().bonus);
  readonly advances = computed(() => this.balances().advances);
  readonly hasPendingCashSettlement = this.pendingCash.asReadonly();

  /** EGP. Each bucket is divided by 100 before this sum. */
  readonly netPayout = computed(() => this.earnings() + this.bonus() - this.advances());

  readonly isCashWarning = computed(() => {
    const cash = this.unremittedCash();
    return cash >= CASH_IN_HAND_WARNING_EGP && cash < CASH_IN_HAND_LIMIT_EGP;
  });

  readonly isCashBlocked = computed(() => this.unremittedCash() >= CASH_IN_HAND_LIMIT_EGP);

  /** `GET /v1/captain/wallet`. Stores balances in EGP. */
  load(options?: { settlements?: boolean }): Observable<void> {
    const generation = this.generation;
    this.loading.set(true);

    const afterWallet = options?.settlements
      ? this.readSettlements(generation).pipe(catchError(() => of(undefined)))
      : of(undefined);

    return this.readWallet(generation).pipe(
      catchError(() => of(undefined)),
      switchMap(() => afterWallet),
      finalize(() => {
        if (generation === this.generation) {
          this.loading.set(false);
        }
      }),
    );
  }

  /**
   * Asks ops to take the current company-cash balance.
   * The row stays PENDING and the balance does not move until they confirm.
   */
  settleCash(): Observable<void> {
    const generation = this.generation;

    return this.http
      .post<SettlementTransaction>(SETTLE_URL, {}, { headers: idempotencyHeaders(crypto.randomUUID()) })
      .pipe(
        tap((row) => this.applySettlementIfCurrent(generation, row)),
        switchMap(() => this.readWallet(generation).pipe(catchError(() => of(undefined)))),
      );
  }

  /** Pays out earnings, bonus, and advances together. Applied immediately. */
  settlePayout(): Observable<void> {
    const generation = this.generation;

    return this.http
      .post<CaptainWallet>(SETTLE_PAYOUT_URL, {}, { headers: idempotencyHeaders(crypto.randomUUID()) })
      .pipe(
        tap((wallet) => this.applyIfCurrent(generation, wallet)),
        switchMap(() => this.readWallet(generation).pipe(catchError(() => of(undefined)))),
      );
  }

  clear(): void {
    this.generation += 1;
    this.balances.set(EMPTY_WALLET);
    this.transactions.set([]);
    this.settlementsState.set([]);
    this.pendingCash.set(false);
    this.loading.set(false);
  }

  private readWallet(generation: number): Observable<void> {
    return this.http.get<CaptainWallet | null>(WALLET_URL).pipe(
      tap((wallet) => this.applyIfCurrent(generation, wallet)),
      map(() => undefined),
    );
  }

  private readSettlements(generation: number): Observable<void> {
    return collectCursorPages<SettlementTransaction>((cursor) =>
      this.http.get<CursorPage<SettlementTransaction>>(SETTLEMENT_HISTORY_URL, {
        params: pageParams(cursor),
      }),
    ).pipe(
      tap((rows) => {
        if (generation !== this.generation) {
          return;
        }

        const settlements = rows.map(toCashSettlement).filter((row): row is CashSettlement => row !== null);
        this.settlementsState.set(settlements);
        this.pendingCash.set(settlements.some((row) => row.status === 'PENDING'));
      }),
      map(() => undefined),
    );
  }

  /**
   * A failed refresh keeps the last known balances so a blip cannot lift the cash block.
   * An empty body still zeros the screen.
   */
  private applyIfCurrent(generation: number, wallet: CaptainWallet | null | undefined): void {
    if (generation !== this.generation) {
      return;
    }

    if (!wallet) {
      this.balances.set(EMPTY_WALLET);
      this.pendingCash.set(false);
      return;
    }

    this.balances.set({
      unremittedCash: piastresToEgp(readCashPiastres(wallet)),
      earnings: piastresToEgp(asPiastres(wallet.earnings)),
      bonus: piastresToEgp(asPiastres(wallet.bonus)),
      advances: piastresToEgp(asPiastres(wallet.advances)),
    });
    this.pendingCash.set(isPendingSettlement(wallet.pendingSettlement));

    const pending = toCashSettlement(wallet.pendingSettlement);
    if (pending) {
      this.prependSettlement(pending);
    }
  }

  private applySettlementIfCurrent(generation: number, row: SettlementTransaction): void {
    if (generation !== this.generation) {
      return;
    }

    const settlement = toCashSettlement(row);
    if (!settlement) {
      return;
    }

    this.prependSettlement(settlement);
    this.pendingCash.set(settlement.status === 'PENDING');
  }

  private prependSettlement(settlement: CashSettlement): void {
    this.settlementsState.update((current) => {
      if (current.some((row) => row.id === settlement.id)) {
        return current.map((row) => (row.id === settlement.id ? settlement : row));
      }

      return [settlement, ...current];
    });
  }
}

function pageParams(cursor?: string): Record<string, string> {
  const params: Record<string, string> = { limit: PAGE_LIMIT };

  if (cursor) {
    params['cursor'] = cursor;
  }

  return params;
}

function readCashPiastres(wallet: CaptainWallet): number {
  const record = wallet as CaptainWallet & Record<string, unknown>;
  return asPiastres(
    record.companyCashBalance ??
      record['company_cash_balance'] ??
      record.unremittedCash ??
      record['unremitted_cash'],
  );
}

function isPendingSettlement(value: SettlementTransaction | null | undefined): boolean {
  return toCashSettlement(value)?.status === 'PENDING';
}

function toCashSettlement(value: SettlementTransaction | null | undefined | unknown): CashSettlement | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const amount = piastresToEgp(asPiastres(record['amount']));
  const status = readSettlementStatus(record['status']);
  const occurredAt = readText(record['createdAt'] ?? record['occurredAt']);

  if (amount <= 0 || !status) {
    return null;
  }

  return {
    id: readText(record['id']) || crypto.randomUUID(),
    amount,
    occurredAt: occurredAt || new Date().toISOString(),
    status,
  };
}

function readSettlementStatus(value: unknown): CashSettlementStatus | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === 'PENDING' || normalized === 'CONFIRMED' || normalized === 'REJECTED') {
    return normalized;
  }

  return null;
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asPiastres(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value);
  }

  return Number.NaN;
}
