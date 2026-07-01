import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';

import { AuthService } from './core/services/auth';

const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated() || router.createUrlTree(['/auth/login']);
};

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login').then((m) => m.Login)
      },
      {
        path: 'change-password',
        loadComponent: () =>
          import('./features/auth/change-password/change-password').then(
            (m) => m.ChangePassword
          )
      },
      { path: '', pathMatch: 'full', redirectTo: 'login' }
    ]
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    canActivate: [authGuard],
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('./features/home/home/home').then((m) => m.Home)
      },
      {
        path: 'wallet',
        loadComponent: () =>
          import('./features/wallet/wallet/wallet').then((m) => m.Wallet)
      },
      {
        path: 'wallet/ledger',
        loadComponent: () =>
          import('./features/wallet/financial-ledger/financial-ledger').then(
            (m) => m.FinancialLedger
          )
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./features/history/history/history').then((m) => m.History)
      },
      {
        path: 'shifts',
        loadComponent: () =>
          import('./features/shift-tracker/shift-tracker/shift-tracker').then(
            (m) => m.ShiftTracker
          )
      },
      { path: '', pathMatch: 'full', redirectTo: 'home' }
    ]
  },
  { path: '**', redirectTo: 'home' }
];
