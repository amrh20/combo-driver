import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../config/api';
import { DriverWalletService } from './driver-wallet.service';

const walletUrl = `${API_BASE_URL}/v1/captain/wallet`;
const settleUrl = `${API_BASE_URL}/v1/captain/wallet/settle`;
const settlePayoutUrl = `${API_BASE_URL}/v1/captain/wallet/settle-payout`;
const historyUrl = `${API_BASE_URL}/v1/captain/wallet/history`;

const piastres = {
  companyCashBalance: 95050,
  unremittedCash: 95050,
  earnings: 20000,
  bonus: 5000,
  advances: 8000,
  pendingSettlement: null,
};

describe('DriverWalletService', () => {
  let wallet: DriverWalletService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    wallet = TestBed.inject(DriverWalletService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('divides piastres by 100 and derives net payout in EGP', () => {
    wallet.load().subscribe();

    const request = http.expectOne(walletUrl);
    expect(request.request.method).toBe('GET');
    request.flush(piastres);

    expect(wallet.unremittedCash()).toBe(950.5);
    expect(wallet.companyCashBalance()).toBe(950.5);
    expect(wallet.earnings()).toBe(200);
    expect(wallet.bonus()).toBe(50);
    expect(wallet.advances()).toBe(80);
    expect(wallet.netPayout()).toBe(170);
    expect(wallet.loading()).toBe(false);
  });

  it('posts a cash settlement that stays pending until ops confirm', () => {
    wallet.load().subscribe();
    http.expectOne(walletUrl).flush(piastres);

    wallet.settleCash().subscribe();

    const post = http.expectOne(settleUrl);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({});
    expect(post.request.headers.get('Idempotency-Key')).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
    post.flush({
      id: 'set-1',
      captainId: 'cap-1',
      amount: 95050,
      status: 'PENDING',
      createdAt: '2026-10-24T12:00:00.000Z',
    });

    http.expectOne(walletUrl).flush({
      ...piastres,
      pendingSettlement: {
        id: 'set-1',
        captainId: 'cap-1',
        amount: 95050,
        status: 'PENDING',
        createdAt: '2026-10-24T12:00:00.000Z',
      },
    });

    expect(wallet.unremittedCash()).toBe(950.5);
    expect(wallet.hasPendingCashSettlement()).toBe(true);
    expect(wallet.settlements()[0]).toEqual({
      id: 'set-1',
      amount: 950.5,
      occurredAt: '2026-10-24T12:00:00.000Z',
      status: 'PENDING',
    });
  });

  it('posts an empty payout settlement with its own idempotency key', () => {
    wallet.settlePayout().subscribe();

    const post = http.expectOne(settlePayoutUrl);
    expect(post.request.body).toEqual({});
    const firstKey = post.request.headers.get('Idempotency-Key');
    post.flush({ ...piastres, earnings: 0, bonus: 0, advances: 0 });
    http.expectOne(walletUrl).flush({ ...piastres, earnings: 0, bonus: 0, advances: 0 });

    wallet.settlePayout().subscribe();
    const retry = http.expectOne(settlePayoutUrl);
    expect(retry.request.headers.get('Idempotency-Key')).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
    expect(retry.request.headers.get('Idempotency-Key')).not.toBe(firstKey);
    retry.flush({ ...piastres, earnings: 0, bonus: 0, advances: 0 });
    http.expectOne(walletUrl).flush({ ...piastres, earnings: 0, bonus: 0, advances: 0 });

    expect(wallet.netPayout()).toBe(0);
  });

  it('leaves the current balances in place when settlement is already zero', () => {
    wallet.load().subscribe();
    http.expectOne(walletUrl).flush(piastres);

    let status = 0;
    wallet.settleCash().subscribe({
      error: (error: HttpErrorResponse) => {
        status = error.status;
      },
    });

    http.expectOne(settleUrl).flush(
      { error: { code: 'CONFLICT', message: 'There is no company cash to remit' } },
      { status: 409, statusText: 'Conflict' },
    );

    expect(status).toBe(409);
    expect(wallet.unremittedCash()).toBe(950.5);
    http.expectNone(walletUrl);
  });

  it('keeps the last known balances when a refresh fails', () => {
    wallet.load().subscribe();
    http.expectOne(walletUrl).flush(piastres);

    let failed = false;
    wallet.load().subscribe({
      error: () => {
        failed = true;
      },
    });
    http.expectOne(walletUrl).flush(
      { error: { message: 'nope' } },
      { status: 500, statusText: 'Server Error' },
    );

    expect(failed).toBe(false);
    expect(wallet.unremittedCash()).toBe(950.5);
    expect(wallet.earnings()).toBe(200);
    expect(wallet.isCashBlocked()).toBe(true);
    expect(wallet.loading()).toBe(false);
  });

  it('reads companyCashBalance as the current عهدة and flags the 150 / 200 limits', () => {
    wallet.load().subscribe();
    http.expectOne(walletUrl).flush({
      companyCashBalance: 15000,
      unremittedCash: 15000,
      earnings: 0,
      bonus: 0,
      advances: 0,
      pendingSettlement: null,
    });

    expect(wallet.companyCashBalance()).toBe(150);
    expect(wallet.isCashWarning()).toBe(true);
    expect(wallet.isCashBlocked()).toBe(false);

    wallet.load().subscribe();
    http.expectOne(walletUrl).flush({
      companyCashBalance: 20000,
      unremittedCash: 20000,
      earnings: 0,
      bonus: 0,
      advances: 0,
      pendingSettlement: null,
    });

    expect(wallet.unremittedCash()).toBe(200);
    expect(wallet.isCashWarning()).toBe(false);
    expect(wallet.isCashBlocked()).toBe(true);
  });

  it('treats a pending settlement as waiting for ops confirmation', () => {
    wallet.load().subscribe();
    http.expectOne(walletUrl).flush({
      companyCashBalance: 18000,
      unremittedCash: 18000,
      earnings: 0,
      bonus: 0,
      advances: 0,
      pendingSettlement: {
        id: 'set-1',
        captainId: 'cap-1',
        amount: 18000,
        status: 'PENDING',
        createdAt: '2026-10-24T12:00:00.000Z',
      },
    });

    expect(wallet.hasPendingCashSettlement()).toBe(true);
    expect(wallet.settlements()).toEqual([
      {
        id: 'set-1',
        amount: 180,
        occurredAt: '2026-10-24T12:00:00.000Z',
        status: 'PENDING',
      },
    ]);
  });

  it('loads settlement history when asked and ignores a missing list endpoint', () => {
    wallet.load({ settlements: true }).subscribe();
    http.expectOne(walletUrl).flush(piastres);
    http.expectOne((req) => req.url === historyUrl).flush(
      { error: { message: 'not found' } },
      { status: 404, statusText: 'Not Found' },
    );

    expect(wallet.unremittedCash()).toBe(950.5);
    expect(wallet.settlements()).toEqual([]);
  });

  it('maps wallet history rows into the settlement list', () => {
    wallet.load({ settlements: true }).subscribe();
    http.expectOne(walletUrl).flush(piastres);
    http.expectOne((req) => req.url === historyUrl).flush({
      items: [
        {
          id: 'set-2',
          captainId: 'cap-1',
          amount: 5000,
          status: 'CONFIRMED',
          createdAt: '2026-10-23T09:00:00.000Z',
        },
      ],
      nextCursor: null,
    });

    expect(wallet.settlements()).toEqual([
      {
        id: 'set-2',
        amount: 50,
        occurredAt: '2026-10-23T09:00:00.000Z',
        status: 'CONFIRMED',
      },
    ]);
  });

  it('keeps zero balances when the wallet body is empty', () => {
    wallet.load().subscribe();
    http.expectOne(walletUrl).flush(null);

    expect(wallet.unremittedCash()).toBe(0);
    expect(wallet.earnings()).toBe(0);
    expect(wallet.netPayout()).toBe(0);
    expect(wallet.loading()).toBe(false);
  });

  it('ignores a wallet response that arrives after logout', () => {
    wallet.load().subscribe();
    const request = http.expectOne(walletUrl);
    wallet.clear();
    request.flush(piastres);

    expect(wallet.unremittedCash()).toBe(0);
    expect(wallet.earnings()).toBe(0);
  });
});
