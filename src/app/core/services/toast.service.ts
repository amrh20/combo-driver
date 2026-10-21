import { Injectable, signal } from '@angular/core';

const TOAST_DURATION_MS = 4000;

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly message = signal<string | null>(null);
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  readonly current = this.message.asReadonly();

  show(text: string): void {
    this.message.set(text);

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }

    this.hideTimer = setTimeout(() => this.dismiss(), TOAST_DURATION_MS);
  }

  dismiss(): void {
    this.message.set(null);

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
