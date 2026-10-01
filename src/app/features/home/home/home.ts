import { Component, computed, inject, signal } from '@angular/core';

import { DELIVERY_ISSUE_OPTIONS } from '../../../core/mocks/driver.mock';
import { DeliveryIssueType } from '../../../core/models';
import { AuthService } from '../../../core/services/auth';
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
  private readonly auth = inject(AuthService);
  private readonly trip = inject(TripService);

  readonly order = this.trip.order;
  readonly isOnline = this.trip.isOnline;
  readonly hasIncomingOrder = this.trip.hasIncomingOrder;
  readonly tripState = this.trip.tripState;
  readonly allShopsPickedUp = this.trip.allShopsPickedUp;
  readonly pickedUpShopCount = this.trip.pickedUpShopCount;
  readonly reportedIssue = this.trip.reportedIssue;
  readonly currentUserRole = this.auth.currentUserRole;
  readonly issueOptions = DELIVERY_ISSUE_OPTIONS;
  readonly canCollectFromStores = computed(() => this.currentUserRole() !== 'DELIVERY');
  readonly canDeliverToCustomer = computed(() => this.currentUserRole() !== 'COLLECTOR');
  /** Delivery riders receive one bag from the hub, so store count is hidden. */
  readonly showOfferStores = computed(() => this.currentUserRole() !== 'DELIVERY');
  /** Collectors stay at the hub and do not see customer-facing offer data. */
  readonly showOfferDistance = computed(() => this.currentUserRole() !== 'COLLECTOR');
  readonly showOfferDropoff = computed(() => this.currentUserRole() !== 'COLLECTOR');
  readonly showOfferCash = computed(() => this.currentUserRole() !== 'COLLECTOR');
  readonly offerEarningsLabel = computed(() =>
    this.currentUserRole() === 'COLLECTOR' ? 'مكافأة التجميع' : 'أرباح التوصيل'
  );
  readonly showOfferMeta = computed(
    () => this.showOfferStores() || this.showOfferDistance() || this.showOfferCash()
  );
  readonly storeCollectionActionLabel = computed(() =>
    this.currentUserRole() === 'COLLECTOR'
      ? 'تسليم الطلب في نقطة التجميع'
      : 'بدء التوصيل للعميل'
  );

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
      case 'HUB_PICKUP':
        return 'استلام من نقطة التجميع';
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

  completeStoreCollection(): void {
    if (this.currentUserRole() === 'COLLECTOR') {
      this.trip.completeCollectorHandover();
      return;
    }

    this.trip.markPickedUp();
  }

  confirmHubPickup(): void {
    this.trip.confirmHubPickup();
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
