import { Injectable, computed, inject, signal } from '@angular/core';

import { activeDriverOrder } from '../mocks/driver.mock';
import {
  ActiveDriverOrder,
  DeliveryIssueType,
  ShopSubOrder,
  TripState,
} from '../models';
import { DriverStatusService } from './driver-status.service';
import { DriverWalletService } from './driver-wallet.service';
import { HistoryService } from './history.service';

function cloneActiveOrder(): ActiveDriverOrder {
  return structuredClone(activeDriverOrder);
}

@Injectable({
  providedIn: 'root',
})
export class TripService {
  private readonly driverStatus = inject(DriverStatusService);
  private readonly wallet = inject(DriverWalletService);
  private readonly history = inject(HistoryService);

  readonly order = signal<ActiveDriverOrder>(cloneActiveOrder());
  readonly tripState = signal<TripState>('IDLE');
  readonly hasIncomingOrder = signal(true);
  readonly reportedIssue = signal<DeliveryIssueType | null>(null);

  readonly allShopsPickedUp = computed(() =>
    this.order().subOrders.every((shop) => shop.status === 'PICKED_UP')
  );

  readonly pickedUpShopCount = computed(
    () => this.order().subOrders.filter((shop) => shop.status === 'PICKED_UP').length
  );

  toggleOnline(): void {
    this.driverStatus.toggleOnline();
    this.hasIncomingOrder.set(true);
  }

  acceptOrder(): void {
    this.driverStatus.goOnline();
    this.resetSubOrders();
    this.tripState.set('HEADING_TO_HUB');
    this.reportedIssue.set(null);
  }

  rejectOrder(): void {
    this.hasIncomingOrder.set(false);
  }

  markShopPickedUp(shopId: string): void {
    this.order.update((current) => ({
      ...current,
      subOrders: current.subOrders.map((shop) =>
        shop.shopId === shopId ? { ...shop, status: 'PICKED_UP' as const } : shop
      ),
    }));
  }

  /** Starts delivery to customer — gated by allShopsPickedUp in the UI. */
  markPickedUp(): void {
    if (!this.allShopsPickedUp()) {
      return;
    }

    this.tripState.set('HEADING_TO_CUSTOMER');
  }

  markArrived(): void {
    this.tripState.set('COLLECTION');
  }

  /**
   * Atomic success path:
   * 1) CASH_COLLECTION + ORDER_DELIVERY ledger rows
   * 2) COMPLETED history record
   * 3) Reset trip to IDLE
   */
  completeDelivery(): void {
    const current = this.order();

    this.wallet.recordSuccessfulDelivery(current);
    this.history.recordCompletedOrder(current.id, current.expectedEarnings);

    this.resetTripAfterOutcome();
  }

  reportDeliveryIssue(issue: DeliveryIssueType): void {
    this.reportedIssue.set(issue);
    this.tripState.set('ISSUE_REPORTED');
  }

  /**
   * Closes a failed delivery without any ledger credits.
   * Moves the order to History as CANCELLED and returns to IDLE.
   */
  resolveFailedDelivery(): void {
    const current = this.order();
    this.history.recordCancelledOrder(current.id);
    this.resetTripAfterOutcome();
  }

  readonly isOnline = this.driverStatus.isOnline;

  private resetTripAfterOutcome(): void {
    this.tripState.set('IDLE');
    this.reportedIssue.set(null);
    this.driverStatus.goOnline();
    this.hasIncomingOrder.set(true);
    this.order.set(cloneActiveOrder());
  }

  private resetSubOrders(): void {
    this.order.update((current) => ({
      ...current,
      subOrders: current.subOrders.map(
        (shop): ShopSubOrder => ({ ...shop, status: 'PENDING' })
      ),
    }));
  }
}
