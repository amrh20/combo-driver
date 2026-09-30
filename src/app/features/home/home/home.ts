import { Component, computed, inject, signal } from '@angular/core';

import { DELIVERY_ISSUE_OPTIONS } from '../../../core/mocks/driver.mock';
import { DeliveryIssueType } from '../../../core/models';
import { TripService } from '../../../core/services/trip.service';
import { ComboBottomSheet, ComboButton } from '../../../shared/components';
import { formatMoney, formatNumber } from '../../../shared/utils/format';
import { openExternalNavigation } from '../../../shared/utils/navigation';

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
  readonly allShopsPickedUp = this.trip.allShopsPickedUp;
  readonly pickedUpShopCount = this.trip.pickedUpShopCount;
  readonly reportedIssue = this.trip.reportedIssue;
  readonly issueOptions = DELIVERY_ISSUE_OPTIONS;

  readonly issueSheetOpen = signal(false);
  readonly selectedIssue = signal<DeliveryIssueType | null>(null);

  /** Independent accordion open state per shop card (shopId → expanded). */
  private readonly expandedShopIds = signal<ReadonlySet<string>>(new Set());

  formatMoney = formatMoney;
  formatNumber = formatNumber;

  isShopExpanded(shopId: string): boolean {
    return this.expandedShopIds().has(shopId);
  }

  toggleShopDetails(shopId: string): void {
    this.expandedShopIds.update((current) => {
      const next = new Set(current);
      if (next.has(shopId)) {
        next.delete(shopId);
      } else {
        next.add(shopId);
      }
      return next;
    });
  }

  readonly reportedIssueLabel = computed(() => {
    const issue = this.reportedIssue();
    if (!issue) {
      return null;
    }

    return this.issueOptions.find((option) => option.type === issue)?.label ?? null;
  });

  readonly stateLabel = computed(() => {
    switch (this.tripState()) {
      case 'HEADING_TO_HUB':
        return 'استلام من المتاجر';
      case 'HEADING_TO_CUSTOMER':
        return 'في الطريق إلى العميل';
      case 'COLLECTION':
        return 'التحصيل والتسليم';
      case 'ISSUE_REPORTED':
        return 'طلب معلّق — بانتظار الإغلاق';
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

  markShopPickedUp(shopId: string): void {
    this.trip.markShopPickedUp(shopId);
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

  openNavigation(lat: number, lng: number): void {
    openExternalNavigation(lat, lng);
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

  resolveFailedDelivery(): void {
    this.trip.resolveFailedDelivery();
  }
}
