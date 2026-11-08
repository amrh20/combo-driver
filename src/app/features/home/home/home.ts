import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DELIVERY_ISSUE_OPTIONS } from '../../../core/constants/delivery-issue-options';
import {
  CASH_IN_HAND_LIMIT_MESSAGE,
  CASH_IN_HAND_WARNING_MESSAGE,
  DeliveryIssueType,
} from '../../../core/models';
import { CaptainLocationService } from '../../../core/services/captain-location.service';
import { DriverWalletService } from '../../../core/services/driver-wallet.service';
import { TripService } from '../../../core/services/trip.service';
import { ShopStopView } from '../../../core/trip/screen-state';
import { ComboBottomSheet, ComboButton, ComboMap } from '../../../shared/components';
import { formatNumber, formatPiastres } from '../../../shared/utils/format';
import { openExternalNavigation } from '../../../shared/utils/navigation';

@Component({
  selector: 'app-home',
  imports: [ComboButton, ComboBottomSheet, ComboMap],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private readonly trip = inject(TripService);
  private readonly location = inject(CaptainLocationService);
  private readonly wallet = inject(DriverWalletService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isOnline = this.trip.isOnline;
  readonly availabilityUpdating = this.trip.availabilityUpdating;
  readonly screen = this.trip.screen;
  readonly stateLabel = this.trip.stateLabel;
  readonly offerCard = this.trip.offerCard;
  readonly tripView = this.trip.tripView;
  readonly pendingAction = this.trip.pendingAction;
  readonly pendingStopId = this.trip.pendingStopId;
  readonly synced = this.trip.synced;
  readonly farPrompt = this.trip.farPrompt;
  readonly captainPoint = this.location.point;
  readonly issueOptions = DELIVERY_ISSUE_OPTIONS;
  readonly isCashWarning = this.wallet.isCashWarning;
  readonly isCashBlocked = this.wallet.isCashBlocked;
  readonly cashWarningMessage = CASH_IN_HAND_WARNING_MESSAGE;
  readonly cashLimitMessage = CASH_IN_HAND_LIMIT_MESSAGE;

  private readonly cashOfflineAttempted = signal(false);

  constructor() {
    effect(() => {
      if (this.farPrompt()) {
        return;
      }

      untracked(() => this.farReason.set(''));
    });

    effect((onCleanup) => {
      if (this.screen() !== 'CUSTOMER') {
        return;
      }

      this.location.startWatch();
      onCleanup(() => this.location.stopWatch());
    });

    effect(() => {
      const blocked = this.isCashBlocked();
      const idle = this.screen() === 'IDLE';
      const online = this.isOnline();
      const updating = this.availabilityUpdating();
      const synced = this.synced();

      if (!blocked) {
        untracked(() => this.cashOfflineAttempted.set(false));
        return;
      }

      if (!synced || !idle || !online || updating || this.cashOfflineAttempted()) {
        return;
      }

      untracked(() => {
        this.cashOfflineAttempted.set(true);
        this.trip.forceOffline();
      });
    });
  }

  ngOnInit(): void {
    this.wallet.load().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  readonly confirmSheetOpen = signal(false);
  readonly confirmShopName = signal('');
  readonly confirmStopId = signal('');
  readonly confirmFileName = signal('');
  readonly confirmDragging = signal(false);
  private confirmFile: File | null = null;
  private readonly invoiceInput = viewChild<ElementRef<HTMLInputElement>>('invoiceInput');

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
    if (this.isCashBlocked() && !this.isOnline()) {
      return;
    }

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

  openConfirmSheet(shop: ShopStopView): void {
    if (this.pendingAction() || shop.isDone || !shop.stopId) {
      return;
    }

    this.confirmStopId.set(shop.stopId);
    this.confirmShopName.set(shop.shopName);
    this.clearConfirmSelection();
    this.confirmSheetOpen.set(true);
  }

  closeConfirmSheet(): void {
    if (this.pendingAction() === 'confirm') {
      return;
    }

    this.confirmSheetOpen.set(false);
    this.confirmStopId.set('');
    this.confirmShopName.set('');
    this.clearConfirmSelection();
  }

  onConfirmFile(input: HTMLInputElement): void {
    this.setConfirmFile(input.files?.[0] ?? null);
  }

  onConfirmDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.confirmDragging.set(true);
  }

  onConfirmDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.confirmDragging.set(true);
  }

  onConfirmDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.confirmDragging.set(false);
  }

  onConfirmDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.confirmDragging.set(false);

    const file = event.dataTransfer?.files?.[0] ?? null;
    if (!file || !file.type.startsWith('image/')) {
      return;
    }

    this.setConfirmFile(file);
  }

  canSubmitConfirm(): boolean {
    return this.pendingAction() === null && this.confirmFile !== null;
  }

  submitConfirm(): void {
    const trip = this.tripView();
    const file = this.confirmFile;
    const stopId = this.confirmStopId();
    if (!trip || !file || !stopId || this.pendingAction()) {
      return;
    }

    this.trip.confirmShop(trip.taskId, stopId, file, () => {
      this.confirmSheetOpen.set(false);
      this.confirmStopId.set('');
      this.confirmShopName.set('');
      this.clearConfirmSelection();
    });
  }

  private setConfirmFile(file: File | null): void {
    this.confirmFile = file;
    this.confirmFileName.set(file?.name ?? '');
  }

  private clearConfirmSelection(): void {
    this.setConfirmFile(null);
    this.confirmDragging.set(false);
    const input = this.invoiceInput()?.nativeElement;
    if (input) {
      input.value = '';
    }
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

  callCustomer(phone: string): void {
    if (!phone) {
      return;
    }

    window.location.assign(`tel:${phone}`);
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
