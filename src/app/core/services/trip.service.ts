import { Injectable, inject, signal } from '@angular/core';

import {
  DeliveryIssueType,
  TripState,
  activeDriverOrder,
} from '../mocks/driver.mock';
import { DriverStatusService } from './driver-status.service';
import { DriverWalletService } from './driver-wallet.service';

@Injectable({
  providedIn: 'root',
})
export class TripService {
  private readonly driverStatus = inject(DriverStatusService);
  private readonly wallet = inject(DriverWalletService);

  readonly order = activeDriverOrder;
  readonly tripState = signal<TripState>('IDLE');
  readonly hasIncomingOrder = signal(true);
  readonly reportedIssue = signal<DeliveryIssueType | null>(null);

  toggleOnline(): void {
    this.driverStatus.toggleOnline();
    this.hasIncomingOrder.set(true);
  }

  acceptOrder(): void {
    this.driverStatus.goOnline();
    this.tripState.set('HEADING_TO_HUB');
    this.reportedIssue.set(null);
  }

  rejectOrder(): void {
    this.hasIncomingOrder.set(false);
  }

  markPickedUp(): void {
    this.tripState.set('HEADING_TO_CUSTOMER');
  }

  markArrived(): void {
    this.tripState.set('COLLECTION');
  }

  completeDelivery(): void {
    this.wallet.recordSuccessfulDelivery(this.order);
    this.tripState.set('IDLE');
    this.reportedIssue.set(null);
    this.driverStatus.goOnline();
    this.hasIncomingOrder.set(true);
  }

  reportDeliveryIssue(issue: DeliveryIssueType): void {
    this.reportedIssue.set(issue);
    this.tripState.set('ISSUE_REPORTED');
  }

  readonly isOnline = this.driverStatus.isOnline;
}
