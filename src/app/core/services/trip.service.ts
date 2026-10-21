import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, finalize, switchMap } from 'rxjs';

import { API_BASE_URL } from '../config/api';
import { classifyCaptainError } from '../http/captain-error';
import { idempotencyHeaders } from '../http/idempotency';
import {
  ArriveStopBody,
  CaptainOffer,
  CaptainTask,
  DeliveryIssueType,
  GeofencePrompt,
  RealtimeMessage,
  StopCompletionBody,
  TripAction,
  TripScreen,
} from '../models';
import {
  ActiveTripView,
  OfferCardView,
  buildOfferCard,
  buildTripView,
  isActiveCaptainTask,
  screenFromTask,
  stateLabel,
} from '../trip/screen-state';
import { AuthService } from './auth';
import { AvailabilityService } from './availability.service';
import { CaptainLocationService } from './captain-location.service';
import { RealtimeService } from './realtime.service';
import { ToastService } from './toast.service';

const OFFERS_URL = `${API_BASE_URL}/v1/captain/offers/current`;
const TASKS_URL = `${API_BASE_URL}/v1/captain/tasks/current`;

@Injectable({
  providedIn: 'root',
})
export class TripService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly availability = inject(AvailabilityService);
  private readonly location = inject(CaptainLocationService);
  private readonly realtime = inject(RealtimeService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly offerState = signal<CaptainOffer | null>(null);
  private readonly taskState = signal<CaptainTask | null>(null);

  private offerEpoch = 0;
  private taskEpoch = 0;
  /** Offer responses that arrive before the first task read are applied after it. */
  private heldOffer: CaptainOffer | null | undefined;
  private taskKnown = false;
  private readonly onOnline = (): void => this.refetchAfterReconnect();

  readonly pendingAction = signal<TripAction | null>(null);
  readonly farPrompt = signal<GeofencePrompt | null>(null);
  /** False until the first `tasks/current` read settles, so a reload does not flash IDLE. */
  readonly synced = signal(false);

  readonly isOnline = this.availability.isOnline;
  readonly availabilityUpdating = this.availability.updating;
  readonly offer = this.offerState.asReadonly();
  readonly task = this.taskState.asReadonly();
  readonly screen = computed<TripScreen>(() => screenFromTask(this.taskState()));
  readonly tripView = computed<ActiveTripView | null>(() => {
    const task = this.taskState();
    return isActiveCaptainTask(task) ? buildTripView(task) : null;
  });
  readonly offerCard = computed<OfferCardView | null>(() => {
    const offer = this.offerState();
    return offer ? buildOfferCard(offer) : null;
  });
  readonly stateLabel = computed(() =>
    this.synced()
      ? stateLabel(this.screen(), this.taskState()?.flags.mode ?? null, this.isOnline())
      : 'جاري تحميل الرحلة',
  );

  constructor() {
    effect(() => {
      const authed = this.auth.isAuthenticated();
      const online = this.availability.isOnline();
      untracked(() => this.syncConnection(authed, online));
    });

    this.realtime.connected$.pipe(takeUntilDestroyed()).subscribe(() => this.refetchAfterReconnect());
    this.realtime.messages$.pipe(takeUntilDestroyed()).subscribe((message) => this.onRealtimeMessage(message));

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onOnline);
    }

    this.destroyRef.onDestroy(() => {
      this.realtime.stop();
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', this.onOnline);
      }
    });
  }

  toggleOnline(): void {
    if (this.availability.updating()) {
      return;
    }

    this.availability.setOnline(!this.isOnline()).subscribe({
      error: () => undefined,
    });
  }

  acceptOffer(): void {
    const offer = this.offerState();
    if (!offer || this.pendingAction()) {
      return;
    }

    const key = crypto.randomUUID();
    this.pendingAction.set('accept');

    this.http
      .post<CaptainTask>(`${API_BASE_URL}/v1/captain/offers/${offer.id}/accept`, {}, {
        headers: idempotencyHeaders(key),
      })
      .pipe(finalize(() => this.release('accept')))
      .subscribe({
        next: (task) => {
          this.farPrompt.set(null);
          this.applyAuthoritativeTask(task);
        },
        error: (error: unknown) => this.handleActionError(error),
      });
  }

  declineOffer(reason: string): void {
    const offer = this.offerState();
    const trimmed = reason.trim();
    if (!offer || !trimmed || this.pendingAction()) {
      return;
    }

    const key = crypto.randomUUID();
    this.pendingAction.set('decline');

    this.http
      .post<void>(
        `${API_BASE_URL}/v1/captain/offers/${offer.id}/decline`,
        { reason: trimmed },
        { headers: idempotencyHeaders(key) },
      )
      .pipe(finalize(() => this.release('decline')))
      .subscribe({
        next: () => {
          if (this.offerState()?.id === offer.id) {
            this.offerState.set(null);
          }
        },
        error: (error: unknown) => this.handleActionError(error),
      });
  }

  /** Completes the stop only when it is `currentStopId`. */
  completeCurrentStop(stopId: string, farReason?: string): void {
    const task = this.taskState();
    if (!task || task.currentStopId !== stopId || this.pendingAction()) {
      return;
    }

    const key = crypto.randomUUID();
    this.pendingAction.set('complete');

    this.location
      .current()
      .pipe(
        switchMap((location) =>
          this.http.post<CaptainTask>(
            `${API_BASE_URL}/v1/captain/tasks/${task.id}/stops/${stopId}/complete`,
            completionBody(task, location, farReason),
            { headers: idempotencyHeaders(key) },
          ),
        ),
        finalize(() => this.release('complete')),
      )
      .subscribe({
        next: (nextTask) => {
          this.farPrompt.set(null);
          this.applyAuthoritativeTask(nextTask);
        },
        error: (error: unknown) => this.handleActionError(error, task.id, stopId),
      });
  }

  arriveAtCustomer(): void {
    const task = this.taskState();
    const stopId = task?.currentStopId;
    if (!task || !stopId || this.screen() !== 'CUSTOMER' || this.pendingAction()) {
      return;
    }

    const key = crypto.randomUUID();
    this.pendingAction.set('arrive');

    this.location
      .current()
      .pipe(
        switchMap((location) => {
          const body: ArriveStopBody = location ? { location } : {};
          return this.http.post<CaptainTask>(
            `${API_BASE_URL}/v1/captain/tasks/${task.id}/stops/${stopId}/arrive`,
            body,
            { headers: idempotencyHeaders(key) },
          );
        }),
        finalize(() => this.release('arrive')),
      )
      .subscribe({
        next: (nextTask) => this.applyAuthoritativeTask(nextTask),
        error: (error: unknown) => this.handleActionError(error),
      });
  }

  submitFarReason(reason: string): void {
    const prompt = this.farPrompt();
    const trimmed = reason.trim();
    if (!prompt || trimmed.length < 2) {
      return;
    }

    this.completeCurrentStop(prompt.stopId, trimmed);
  }

  dismissFarPrompt(): void {
    if (this.pendingAction()) {
      return;
    }

    this.farPrompt.set(null);
  }

  reportIssue(type: DeliveryIssueType): void {
    const task = this.taskState();
    if (!task || task.openIssue || this.pendingAction()) {
      return;
    }

    if (this.screen() !== 'CUSTOMER' && this.screen() !== 'COLLECTION') {
      return;
    }

    const key = crypto.randomUUID();
    this.pendingAction.set('issue');

    this.location
      .current()
      .pipe(
        switchMap((location) =>
          this.http.post<CaptainTask>(
            `${API_BASE_URL}/v1/captain/tasks/${task.id}/issues`,
            {
              type,
              note: null,
              photoUrl: null,
              ...(location ? { location } : {}),
            },
            { headers: idempotencyHeaders(key) },
          ),
        ),
        finalize(() => this.release('issue')),
      )
      .subscribe({
        next: (nextTask) => this.applyAuthoritativeTask(nextTask),
        error: (error: unknown) => this.handleActionError(error),
      });
  }

  private syncConnection(authed: boolean, online: boolean): void {
    if (!authed) {
      this.realtime.stop();
      this.clearLocal();
      return;
    }

    this.realtime.start();
    this.refreshTask();

    if (!online) {
      this.offerState.set(null);
      return;
    }

    if (!this.taskState()) {
      this.refreshOffer();
    }
  }

  private refetchAfterReconnect(): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }

    this.refreshTask();
    if (this.availability.isOnline()) {
      this.refreshOffer();
    }
  }

  private onRealtimeMessage(message: RealtimeMessage): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }

    switch (message.event) {
      case 'offer.created':
        this.refreshOffer();
        buzzIncomingOffer();
        break;
      case 'offer.expired':
      case 'offer.cancelled':
        this.offerState.set(null);
        break;
      case 'task.assigned':
      case 'task.released':
      case 'task.cancelled':
      case 'task.completed':
      case 'issue.resolved':
        this.refreshTask();
        if (message.event === 'task.released' || message.event === 'task.cancelled') {
          this.toast.show('تم سحب الرحلة أو إلغاؤها.');
        }
        break;
      default:
        break;
    }
  }

  private refreshOffer(): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }

    const epoch = ++this.offerEpoch;
    this.http
      .get<CaptainOffer | null>(OFFERS_URL)
      .pipe(catchError(() => EMPTY))
      .subscribe((offer) => {
        if (epoch !== this.offerEpoch) {
          return;
        }

        this.applyOffer(offer);
      });
  }

  private refreshTask(): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }

    const epoch = ++this.taskEpoch;
    this.http
      .get<CaptainTask | null>(TASKS_URL)
      .pipe(
        catchError(() => EMPTY),
        finalize(() => {
          if (epoch !== this.taskEpoch) {
            return;
          }

          if (!this.taskKnown) {
            this.taskKnown = true;
            this.flushHeldOffer();
          }

          this.synced.set(true);
        }),
      )
      .subscribe((task) => {
        if (epoch !== this.taskEpoch) {
          return;
        }

        this.applyPolledTask(task);
      });
  }

  private applyOffer(offer: CaptainOffer | null): void {
    if (!this.taskKnown) {
      this.heldOffer = offer;
      return;
    }

    this.commitOffer(offer);
  }

  private commitOffer(offer: CaptainOffer | null): void {
    if (this.taskState() || !offer) {
      this.offerState.set(null);
      return;
    }

    this.offerState.set(offer);
  }

  private applyPolledTask(task: CaptainTask | null): void {
    this.taskKnown = true;

    if (!isActiveCaptainTask(task)) {
      const hadTask = this.taskState() !== null;
      this.taskState.set(null);
      if (hadTask && this.availability.isOnline() && !this.pendingAction()) {
        this.heldOffer = undefined;
        this.refreshOffer();
        return;
      }

      this.flushHeldOffer();
      return;
    }

    this.taskState.set(task);
    this.offerState.set(null);
    this.flushHeldOffer();
  }

  private flushHeldOffer(): void {
    if (this.heldOffer === undefined) {
      return;
    }

    const held = this.heldOffer;
    this.heldOffer = undefined;
    this.commitOffer(held);
  }

  private applyAuthoritativeTask(task: CaptainTask): void {
    this.taskEpoch += 1;
    this.offerEpoch += 1;

    if (!isActiveCaptainTask(task)) {
      this.taskState.set(null);
      if (this.availability.isOnline()) {
        this.refreshOffer();
      }
      return;
    }

    this.taskState.set(task);
    this.offerState.set(null);
  }

  private handleActionError(error: unknown, taskId?: string, stopId?: string): void {
    const classified = classifyCaptainError(error);

    if (classified.kind === 'outside-geofence' && taskId && stopId) {
      this.farPrompt.set({
        taskId,
        stopId,
        distanceMeters: classified.distanceMeters,
        maxMeters: classified.maxMeters,
      });
      return;
    }

    if (classified.kind === 'invalid-state') {
      this.farPrompt.set(null);
      this.toast.show(classified.message);
      this.refreshTask();
      return;
    }

    this.toast.show(classified.message);
  }

  private release(action: TripAction): void {
    if (this.pendingAction() === action) {
      this.pendingAction.set(null);
    }
  }

  private clearLocal(): void {
    this.offerEpoch += 1;
    this.taskEpoch += 1;
    this.heldOffer = undefined;
    this.taskKnown = false;
    this.synced.set(false);
    this.offerState.set(null);
    this.taskState.set(null);
    this.pendingAction.set(null);
    this.farPrompt.set(null);
  }
}

function completionBody(
  task: CaptainTask,
  location: { lat: number; lng: number } | undefined,
  farReason?: string,
): StopCompletionBody {
  const stop = task.stops.find((item) => item.id === task.currentStopId);
  const body: StopCompletionBody = {};

  if (location) {
    body.location = location;
  }

  if (stop?.kind === 'CUSTOMER' && task.flags.collectsCash) {
    body.cashCollected = task.cashToCollect;
  }

  if (farReason) {
    body.farReason = farReason;
  }

  return body;
}

function buzzIncomingOffer(): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(180);
  }
}
