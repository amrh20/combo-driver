import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { availabilitySyncInterceptor } from './core/interceptors/availability-sync.interceptor';
import { AuthService } from './core/services/auth';
import { AvailabilityService } from './core/services/availability.service';
import { DriverWalletService } from './core/services/driver-wallet.service';
import { TripService } from './core/services/trip.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor, availabilitySyncInterceptor])),
    provideRouter(routes),
    provideAppInitializer(() => {
      const auth = inject(AuthService);
      const availability = inject(AvailabilityService);
      const wallet = inject(DriverWalletService);
      inject(TripService);

      if (!auth.isAuthenticated()) {
        return;
      }

      return firstValueFrom(auth.fetchProfile())
        .then(() => firstValueFrom(availability.load()).catch(() => undefined))
        .then(() => firstValueFrom(wallet.load()).catch(() => undefined))
        .catch(() => firstValueFrom(auth.logout()));
    })
  ]
};
