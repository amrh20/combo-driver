import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth';
import { ComboButton, ComboPasswordInput } from '../../../shared/components';

@Component({
  selector: 'app-change-password',
  imports: [ComboButton, ComboPasswordInput, ReactiveFormsModule, RouterLink],
  templateUrl: './change-password.html',
  styleUrl: './change-password.scss',
})
export class ChangePassword {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly statusMessage = signal('');
  readonly hasSuccess = signal(false);
  readonly form = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required, Validators.minLength(6)]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  submit(): void {
    this.statusMessage.set('');
    this.hasSuccess.set(false);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.statusMessage.set('كل الحقول مطلوبة، وكلمة المرور لا تقل عن 6 أحرف.');
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.form.getRawValue();
    const changed = this.authService.changePassword(currentPassword, newPassword, confirmPassword);

    this.hasSuccess.set(changed);
    this.statusMessage.set(changed ? 'تم تغيير كلمة المرور بنجاح.' : 'تأكد من تطابق كلمة المرور الجديدة.');
  }
}
