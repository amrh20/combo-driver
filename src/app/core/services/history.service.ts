import { Injectable, signal } from '@angular/core';

import { formatArabicDateTime } from '../mocks/date-helpers';
import { completedDriverOrders } from '../mocks/driver.mock';
import { CompletedDriverOrder, HistoryOrderStatus } from '../models';

@Injectable({
  providedIn: 'root',
})
export class HistoryService {
  private readonly orders = signal<CompletedDriverOrder[]>([...completedDriverOrders]);

  readonly historyOrders = this.orders.asReadonly();

  recordCompletedOrder(orderId: string, profit: number): void {
    this.prepend({
      id: orderId,
      profit,
      status: 'COMPLETED',
      occurredAt: new Date().toISOString(),
    });
  }

  recordCancelledOrder(orderId: string): void {
    this.prepend({
      id: orderId,
      profit: 0,
      status: 'CANCELLED',
      occurredAt: new Date().toISOString(),
    });
  }

  private prepend(partial: {
    id: string;
    profit: number;
    status: HistoryOrderStatus;
    occurredAt: string;
  }): void {
    const entry: CompletedDriverOrder = {
      ...partial,
      date: formatArabicDateTime(partial.occurredAt),
    };

    this.orders.update((list) => [entry, ...list.filter((order) => order.id !== entry.id)]);
  }
}
