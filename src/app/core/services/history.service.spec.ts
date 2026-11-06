import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { CaptainOrderHistoryItem } from '../models';
import { HistoryService } from './history.service';
import { ToastService } from './toast.service';

const historyUrl = `${environment.apiUrl}/v1/captain/orders/history`;

function historyItem(id: string, captainProfit: number): CaptainOrderHistoryItem {
  return {
    id,
    orderId: `order-${id}`,
    orderNumber: `CMB-${id}`,
    occurredAt: '2026-10-21T12:00:00.000Z',
    status: 'COMPLETED',
    customerName: 'عميل',
    shopsCount: 2,
    paymentMethod: 'COD',
    captainProfit,
    customerTotal: 29000,
  };
}

describe('HistoryService', () => {
  let history: HistoryService;
  let http: HttpTestingController;
  let toast: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    history = TestBed.inject(HistoryService);
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads the selected period and keeps captain profit in piastres', () => {
    history.load('week').subscribe();

    const request = http.expectOne(
      (call) =>
        call.url === historyUrl &&
        call.params.get('period') === 'week' &&
        !call.params.has('cursor'),
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('limit')).toBe('100');
    request.flush({ items: [historyItem('1', 1500)], nextCursor: null });

    const order = history.historyOrders()[0];
    expect(order?.orderNumber).toBe('CMB-1');
    expect(order?.captainProfit).toBe(1500);
    expect(order?.customerName).toBe('عميل');
    expect(order?.shopsCount).toBe(2);
    expect(order?.paymentMethod).toBe('COD');
    expect(order?.customerTotal).toBe(29000);
    expect(order?.status).toBe('COMPLETED');
    expect(history.loading()).toBe(false);
  });

  it('follows nextCursor and ignores a slower response from the previous period', () => {
    history.load('today').subscribe();
    const today = http.expectOne((call) => call.params.get('period') === 'today');

    history.load('month').subscribe();
    const month = http.expectOne(
      (call) => call.params.get('period') === 'month' && !call.params.has('cursor'),
    );

    today.flush({ items: [historyItem('stale', 100)], nextCursor: null });
    month.flush({
      items: [historyItem('a', 2000)],
      nextCursor: 'a',
    });

    const next = http.expectOne((call) => call.params.get('cursor') === 'a');
    next.flush({ items: [historyItem('b', 500)], nextCursor: null });

    expect(history.historyOrders().map((order) => order.id)).toEqual(['a', 'b']);
    expect(history.historyOrders()[1]?.captainProfit).toBe(500);
  });

  it('reads captainProfit from the order payload, including numeric strings', () => {
    history.load('today').subscribe();
    http
      .expectOne((call) => call.params.get('period') === 'today')
      .flush({
        items: [
          {
            id: 'nested',
            orderId: 'order-nested',
            occurredAt: '2026-10-21T12:00:00.000Z',
            status: 'COMPLETED',
            customerTotal: 29000,
            order: { orderNumber: 'CMB-nested', captainProfit: '1800' },
          },
        ],
        nextCursor: null,
      });

    const order = history.historyOrders()[0];
    expect(order?.orderNumber).toBe('CMB-nested');
    expect(order?.captainProfit).toBe(1800);
    expect((order?.captainProfit || 0) / 100).toBe(18);
  });

  it('clears the list and toasts when history cannot be loaded', () => {
    history.load('all').subscribe();
    http
      .expectOne((call) => call.params.get('period') === 'all')
      .flush({ error: { message: 'nope' } }, { status: 500, statusText: 'Server Error' });

    expect(history.historyOrders()).toEqual([]);
    expect(toast.current()).toBe('تعذر تحميل سجل الطلبات.');
    expect(history.loading()).toBe(false);
  });
});
