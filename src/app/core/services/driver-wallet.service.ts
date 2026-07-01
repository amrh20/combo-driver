import { Injectable, signal } from '@angular/core';

import { ActiveDriverOrder, driverWalletState } from '../mocks/driver.mock';

@Injectable({
  providedIn: 'root',
})
export class DriverWalletService {
  readonly unremittedCash = signal(driverWalletState.unremittedCash);
  readonly earnings = signal(driverWalletState.earnings);
  readonly bonus = signal(driverWalletState.bonus);
  readonly advances = signal(driverWalletState.advances);

  recordSuccessfulDelivery(order: ActiveDriverOrder): void {
    this.unremittedCash.update((value) => value + order.cashToCollect);
    this.earnings.update((value) => value + order.deliveryFee);
  }

  clearUnremittedCash(): void {
    this.unremittedCash.set(0);
  }

  clearNetPayout(): void {
    this.earnings.set(0);
    this.bonus.set(0);
    this.advances.set(0);
  }
}
