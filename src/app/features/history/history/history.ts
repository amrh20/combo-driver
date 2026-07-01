import { Component, computed, signal } from '@angular/core';

import {
  CompletedDriverOrder,
  HistoryOrderStatus,
  HistoryTimeFilter,
  completedDriverOrders,
} from '../../../core/mocks/driver.mock';

@Component({
  selector: 'app-history',
  imports: [],
  templateUrl: './history.html',
  styleUrl: './history.scss',
})
export class History {
  private readonly orders = completedDriverOrders;

  readonly activeTimeFilter = signal<HistoryTimeFilter>('today');
  readonly activeStatusFilter = signal<HistoryOrderStatus>('COMPLETED');

  readonly filteredOrders = computed(() => {
    const timeFilter = this.activeTimeFilter();
    const statusFilter = this.activeStatusFilter();
    const range = this.getTimeRange(timeFilter);

    return this.orders
      .filter((order) => order.status === statusFilter)
      .filter((order) => {
        if (!range) {
          return true;
        }

        const occurredAt = new Date(order.occurredAt);
        return occurredAt >= range.start && occurredAt <= range.end;
      })
      .sort(
        (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      );
  });

  readonly filteredSummary = computed(() => {
    const orders = this.filteredOrders();

    return {
      orderCount: orders.length,
      totalProfit: orders.reduce((sum, order) => sum + order.profit, 0),
    };
  });

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

  formatProfit(value: number): string {
    return `${value.toLocaleString('ar-EG')} ج.م`;
  }

  statusLabel(status: HistoryOrderStatus): string {
    return status === 'COMPLETED' ? 'مكتمل' : 'ملغي';
  }

  isCancelled(order: CompletedDriverOrder): boolean {
    return order.status === 'CANCELLED';
  }

  private getTimeRange(filter: HistoryTimeFilter): { start: Date; end: Date } | null {
    if (filter === 'all') {
      return null;
    }

    const end = this.endOfDay(new Date());
    const start = new Date(end);

    if (filter === 'today') {
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }

    if (filter === 'week') {
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
}
