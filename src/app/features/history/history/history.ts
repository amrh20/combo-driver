import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  CompletedDriverOrder,
  HistoryOrderStatus,
  HistoryTimeFilter,
  OrderPaymentMethod,
} from '../../../core/models';
import { AuthService } from '../../../core/services/auth';
import { HistoryService } from '../../../core/services/history.service';
import { formatMoney, formatPiastres } from '../../../shared/utils/format';

@Component({
  selector: 'app-history',
  imports: [],
  templateUrl: './history.html',
  styleUrl: './history.scss',
})
export class History {
  private readonly historyService = inject(HistoryService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentUserRole = this.auth.currentUserRole;
  readonly earningsBadgeLabel = computed(() =>
    this.currentUserRole() === 'COLLECTOR' ? 'مكافأة التجميع' : 'ربح الكابتن',
  );

  readonly loading = this.historyService.loading;
  readonly activeTimeFilter = signal<HistoryTimeFilter>('today');
  readonly activeStatusFilter = signal<HistoryOrderStatus>('COMPLETED');

  readonly filteredOrders = computed(() => {
    const statusFilter = this.activeStatusFilter();

    return this.historyService
      .historyOrders()
      .filter((order) => order.status === statusFilter)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  });

  readonly filteredSummary = computed(() => {
    const orders = this.filteredOrders();

    return {
      orderCount: orders.length,
      totalProfit: orders.reduce((sum, order) => sum + this.orderProfitEgp(order), 0),
    };
  });

  constructor() {
    effect(() => {
      const period = this.activeTimeFilter();
      untracked(() => {
        this.historyService.load(period).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
      });
    });
  }

  selectTimeFilter(filter: HistoryTimeFilter): void {
    this.activeTimeFilter.set(filter);
  }

  selectStatusFilter(filter: HistoryOrderStatus): void {
    this.activeStatusFilter.set(filter);
  }

  isTimeFilterActive(filter: HistoryTimeFilter): boolean {
    return this.activeTimeFilter() === filter;
  }

  isStatusFilterActive(filter: HistoryOrderStatus): boolean {
    return this.activeStatusFilter() === filter;
  }

  formatProfit = formatMoney;

  /** `captainProfit` is integer piastres. Missing values display as 0 EGP. */
  orderProfitEgp(order: CompletedDriverOrder): number {
    return (order.captainProfit || 0) / 100;
  }

  /** `customerTotal` is integer piastres, shown as EGP. */
  formatCustomerTotal(order: CompletedDriverOrder): string {
    return formatPiastres(order.customerTotal || 0);
  }

  paymentLabel(method: OrderPaymentMethod | null): string {
    switch (method) {
      case 'COD':
        return 'كاش';
      case 'CARD':
        return 'بطاقة';
      case 'WALLET':
        return 'محفظة';
      default:
        return '—';
    }
  }

  statusLabel(status: HistoryOrderStatus): string {
    return status === 'COMPLETED' ? 'مكتمل' : 'ملغي';
  }

  isCancelled(order: CompletedDriverOrder): boolean {
    return order.status === 'CANCELLED';
  }
}
