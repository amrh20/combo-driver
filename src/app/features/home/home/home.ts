import { Component, computed, effect, inject, signal, untracked } from '@angular/core';

import { DELIVERY_ISSUE_OPTIONS } from '../../../core/mocks/driver.mock';
import { DeliveryIssueType } from '../../../core/models';
import { TripService } from '../../../core/services/trip.service';
import { ComboBottomSheet, ComboButton } from '../../../shared/components';
import { formatNumber, formatPiastres } from '../../../shared/utils/format';
import { openExternalNavigation } from '../../../shared/utils/navigation';

@Component({
  selector: 'app-home',
  imports: [ComboButton, ComboBottomSheet],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly trip = inject(TripService);

  readonly isOnline = this.trip.isOnline;
  readonly availabilityUpdating = this.trip.availabilityUpdating;
  readonly screen = this.trip.screen;
  readonly stateLabel = this.trip.stateLabel;
  readonly offerCard = this.trip.offerCard;
  readonly tripView = this.trip.tripView;
  readonly pendingAction = this.trip.pendingAction;
  readonly synced = this.trip.synced;
  readonly farPrompt = this.trip.farPrompt;
  readonly issueOptions = DELIVERY_ISSUE_OPTIONS;

  constructor() {
    effect(() => {
      if (this.farPrompt()) {
        return;
      }

      untracked(() => this.farReason.set(''));
    });
  }

  readonly issueSheetOpen = signal(false);
  readonly selectedIssue = signal<DeliveryIssueType | null>(null);
  readonly declineSheetOpen = signal(false);
  readonly declineReason = signal('');
  readonly farReason = signal('');

  private readonly expandedShopIds = signal<ReadonlySet<string>>(new Set());

  readonly reportedIssueLabel = computed(() => {
    const issue = this.trip.task()?.openIssue;
    if (!issue) {
      return null;
    }

    return this.issueOptions.find((option) => option.type === issue.type)?.label ?? issue.type;
  });

  readonly farDistanceLabel = computed(() => {
    const prompt = this.farPrompt();
    if (!prompt || prompt.distanceMeters === null) {
      return 'الموقع غير متاح أو بعيد عن العميل. اكتب أين تم التسليم.';
    }

    const max = prompt.maxMeters === null ? '' : ` (الحد ${formatNumber(prompt.maxMeters)} متر)`;
    return `أنت على بعد ${formatNumber(prompt.distanceMeters)} متر من موقع العميل${max}.`;
  });

  formatPiastres = formatPiastres;
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

  toggleOnline(): void {
    this.trip.toggleOnline();
  }

  acceptOffer(): void {
    this.trip.acceptOffer();
  }

  openDeclineSheet(): void {
    if (this.pendingAction()) {
      return;
    }

    this.declineReason.set('');
    this.declineSheetOpen.set(true);
  }

  closeDeclineSheet(): void {
    if (this.pendingAction() === 'decline') {
      return;
    }

    this.declineSheetOpen.set(false);
    this.declineReason.set('');
  }

  onDeclineInput(value: string): void {
    this.declineReason.set(value);
  }

  confirmDecline(): void {
    const reason = this.declineReason().trim();
    if (!reason) {
      return;
    }

    this.declineSheetOpen.set(false);
    this.declineReason.set('');
    this.trip.declineOffer(reason);
  }

  completeStop(stopId: string): void {
    this.trip.completeCurrentStop(stopId);
  }

  arriveAtCustomer(): void {
    this.trip.arriveAtCustomer();
  }

  completeDelivery(): void {
    const stopId = this.tripView()?.currentStopId;
    if (!stopId) {
      return;
    }

    this.trip.completeCurrentStop(stopId);
  }

  openNavigation(lat: number, lng: number): void {
    openExternalNavigation(lat, lng);
  }

  openIssueSheet(): void {
    if (this.pendingAction()) {
      return;
    }

    this.selectedIssue.set(null);
    this.issueSheetOpen.set(true);
  }

  closeIssueSheet(): void {
    if (this.pendingAction() === 'issue') {
      return;
    }

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

    this.issueSheetOpen.set(false);
    this.selectedIssue.set(null);
    this.trip.reportIssue(issue);
  }

  onFarReasonInput(value: string): void {
    this.farReason.set(value);
  }

  confirmFarReason(): void {
    this.trip.submitFarReason(this.farReason());
  }

  closeFarPrompt(): void {
    this.trip.dismissFarPrompt();
    this.farReason.set('');
  }
}
