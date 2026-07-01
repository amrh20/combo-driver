import { Component, computed, inject, signal } from '@angular/core';

import { DELIVERY_ISSUE_OPTIONS, DeliveryIssueType } from '../../../core/mocks/driver.mock';
import { TripService } from '../../../core/services/trip.service';
import { ComboBottomSheet, ComboButton } from '../../../shared/components';

@Component({
  selector: 'app-home',
  imports: [ComboButton, ComboBottomSheet],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly trip = inject(TripService);

  readonly order = this.trip.order;
  readonly isOnline = this.trip.isOnline;
  readonly hasIncomingOrder = this.trip.hasIncomingOrder;
  readonly tripState = this.trip.tripState;
  readonly issueOptions = DELIVERY_ISSUE_OPTIONS;

  readonly issueSheetOpen = signal(false);
  readonly selectedIssue = signal<DeliveryIssueType | null>(null);

  readonly stateLabel = computed(() => {
    switch (this.tripState()) {
      case 'HEADING_TO_HUB':
        return 'في الطريق إلى الهب';
      case 'HEADING_TO_CUSTOMER':
        return 'في الطريق إلى العميل';
      case 'COLLECTION':
        return 'التحصيل والتسليم';
      case 'ISSUE_REPORTED':
        return 'طلب معلّق — بانتظار الدعم';
      default:
        return this.isOnline() ? 'متاح لاستلام الطلبات' : 'غير متصل';
    }
  });

  toggleOnline(): void {
    this.trip.toggleOnline();
  }

  acceptOrder(): void {
    this.trip.acceptOrder();
  }

  rejectOrder(): void {
    this.trip.rejectOrder();
  }

  markPickedUp(): void {
    this.trip.markPickedUp();
  }

  markArrived(): void {
    this.trip.markArrived();
  }

  completeDelivery(): void {
    this.trip.completeDelivery();
  }

  openIssueSheet(): void {
    this.selectedIssue.set(null);
    this.issueSheetOpen.set(true);
  }

  closeIssueSheet(): void {
    this.issueSheetOpen.set(false);
    this.selectedIssue.set(null);
  }

  selectIssue(issue: DeliveryIssueType): void {
    this.selectedIssue.set(issue);
  }

  confirmIssueReport(): void {
    const issue = this.selectedIssue();

    if (!issue) {
      return;
    }

    this.trip.reportDeliveryIssue(issue);
    this.closeIssueSheet();
  }
}
