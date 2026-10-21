import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (isAnonymousAuthRequest(request.url)) {
    return next(request);
  }

  const accessToken = inject(AuthService).readAccessToken();

  if (!accessToken) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: { Authorization: `Bearer ${accessToken}` },
    })
  );
};

function isAnonymousAuthRequest(url: string): boolean {
  return url.includes('/v1/auth/captain/login') || url.includes('/v1/auth/refresh');
}
