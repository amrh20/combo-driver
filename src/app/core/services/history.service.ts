import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, tap } from 'rxjs';

import { API_BASE_URL } from '../config/api';
import { CursorPage, collectCursorPages } from '../http/cursor-page';
import { formatArabicDateTime } from '../mocks/date-helpers';
import {
  CaptainOrderHistoryItem,
  CompletedDriverOrder,
  HistoryTimeFilter,
  OrderPaymentMethod,
} from '../models';
import { ToastService } from './toast.service';

const HISTORY_URL = `${API_BASE_URL}/v1/captain/orders/history`;
const PAGE_LIMIT = '100';

@Injectable({
  providedIn: 'root',
})
export class HistoryService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  private requestSeq = 0;
  private readonly orders = signal<CompletedDriverOrder[]>([]);

  readonly historyOrders = this.orders.asReadonly();
  readonly loading = signal(false);

  /**
   * `GET /v1/captain/orders/history?period=`.
   * The API returns completed trips only. `captainProfit` stays in piastres.
   */
  load(period: HistoryTimeFilter): Observable<void> {
    const requestId = ++this.requestSeq;
    this.loading.set(true);
    this.orders.set([]);

    return collectCursorPages<CaptainOrderHistoryItem>((cursor) =>
      this.http.get<CursorPage<CaptainOrderHistoryItem>>(HISTORY_URL, {
        params: pageParams(period, cursor),
      }),
    ).pipe(
      tap((items) => {
        if (requestId === this.requestSeq) {
          this.orders.set(items.map(toHistoryOrder));
        }
      }),
      map(() => undefined),
      catchError(() => {
        if (requestId === this.requestSeq) {
          this.orders.set([]);
          this.toast.show('تعذر تحميل سجل الطلبات.');
        }

        return of(undefined);
      }),
      finalize(() => {
        if (requestId === this.requestSeq) {
          this.loading.set(false);
        }
      }),
    );
  }

  clear(): void {
    this.requestSeq += 1;
    this.orders.set([]);
    this.loading.set(false);
  }
}

function pageParams(period: HistoryTimeFilter, cursor?: string): Record<string, string> {
  const params: Record<string, string> = { period, limit: PAGE_LIMIT };

  if (cursor) {
    params['cursor'] = cursor;
  }

  return params;
}

function toHistoryOrder(item: CaptainOrderHistoryItem): CompletedDriverOrder {
  const raw = item as CaptainOrderHistoryItem & {
    order?: {
      captainProfit?: unknown;
      orderNumber?: string;
      customerName?: unknown;
      shopsCount?: unknown;
      paymentMethod?: unknown;
      customerTotal?: unknown;
    };
  };

  return {
    id: item.id,
    orderNumber: item.orderNumber || raw.order?.orderNumber || item.id,
    date: formatArabicDateTime(item.occurredAt),
    occurredAt: item.occurredAt,
    status: item.status,
    customerName: readText(raw.customerName ?? raw.order?.customerName),
    shopsCount: readCount(raw.shopsCount ?? raw.order?.shopsCount),
    paymentMethod: readPaymentMethod(raw.paymentMethod ?? raw.order?.paymentMethod),
    /** Piastres. The screen divides by 100. Prefer the flat field, then `order.captainProfit`. */
    captainProfit: readPiastres(raw.captainProfit ?? raw.order?.captainProfit),
    customerTotal: readPiastres(raw.customerTotal ?? raw.order?.customerTotal),
  };
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readCount(value: unknown): number {
  const count = typeof value === 'string' ? Number(value) : value;

  return typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 ? count : 0;
}

function readPaymentMethod(value: unknown): OrderPaymentMethod | null {
  return value === 'COD' || value === 'CARD' || value === 'WALLET' ? value : null;
}

function readPiastres(value: unknown): number {
  const amount = typeof value === 'string' ? Number(value) : value;

  return typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
}
