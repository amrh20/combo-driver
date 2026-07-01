import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth';
import { ComboButton } from '../../../shared/components';

@Component({
  selector: 'app-login',
  imports: [ComboButton, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly errorMessage = signal('');
  readonly form = this.fb.nonNullable.group({
    phone: ['01000000000', [Validators.required, Validators.minLength(8)]],
    password: ['driver123', [Validators.required, Validators.minLength(6)]]
  });

  submit(): void {
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('برجاء إدخال رقم الهاتف وكلمة المرور.');
      return;
    }

    const { phone, password } = this.form.getRawValue();

    if (!this.authService.login(phone, password)) {
      this.errorMessage.set('بيانات الدخول غير صحيحة.');
      return;
    }

    void this.router.navigate(['/home']);
  }
}
