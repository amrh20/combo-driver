import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';

import { ApiErrorBody } from '../../../core/models';
import { AuthService, landingPath } from '../../../core/services/auth';
import { AvailabilityService } from '../../../core/services/availability.service';
import { DriverWalletService } from '../../../core/services/driver-wallet.service';
import { ToastService } from '../../../core/services/toast.service';
import { ComboButton, ComboPasswordInput } from '../../../shared/components';

@Component({
  selector: 'app-login',
  imports: [ComboButton, ComboPasswordInput, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly availability = inject(AvailabilityService);
  private readonly wallet = inject(DriverWalletService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly errorMessage = signal('');
  readonly submitting = signal(false);
  readonly form = this.fb.nonNullable.group({
    phone: ['', [Validators.required, Validators.minLength(8)]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    this.errorMessage.set('');

    if (this.submitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('برجاء إدخال رقم الهاتف وكلمة المرور.');
      return;
    }

    const { phone, password } = this.form.getRawValue();
    this.submitting.set(true);

    this.authService
      .login(phone, password)
      .pipe(
        switchMap(() => this.authService.fetchProfile()),
        switchMap((profile) =>
          this.availability.load().pipe(
            catchError(() => of(null)),
            switchMap(() =>
              this.wallet.load().pipe(
                catchError(() => of(undefined)),
                switchMap(() => of(profile)),
              ),
            ),
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (profile) => {
          this.submitting.set(false);
          void this.router.navigate([landingPath(profile.role)]);
        },
        error: (error: unknown) => {
          this.authService.logout().subscribe(() => {
            this.submitting.set(false);
            const message = loginErrorMessage(error);
            this.errorMessage.set(message);
            this.toast.show(message);
          });
        },
      });
  }
}

function loginErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'تعذر تسجيل الدخول. حاول مرة أخرى.';
  }

  const code = (error.error as ApiErrorBody | null)?.error?.code;

  if (code === 'ACCOUNT_BLOCKED' || (error.status === 403 && code !== 'PASSWORD_CHANGE_REQUIRED')) {
    return 'تم إيقاف حسابك من قبل الإدارة. يرجى التواصل مع الدعم.';
  }

  if (code === 'PASSWORD_CHANGE_REQUIRED') {
    return 'يلزم تغيير كلمة المرور قبل المتابعة.';
  }

  if (error.status === 401 || code === 'INVALID_CREDENTIALS') {
    return 'بيانات الدخول غير صحيحة. تأكد من رقم الهاتف وكلمة المرور.';
  }

  if (error.status === 0) {
    return 'تعذر الاتصال بالخادم. تأكد أن الخدمة تعمل.';
  }

  return 'تعذر تسجيل الدخول. حاول مرة أخرى.';
}
