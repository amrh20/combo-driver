import { Component, inject } from '@angular/core';

import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'combo-toast',
  templateUrl: './combo-toast.html',
  styleUrl: './combo-toast.scss',
})
export class ComboToast {
  private readonly toast = inject(ToastService);

  readonly message = this.toast.current;

  dismiss(): void {
    this.toast.dismiss();
  }
}
