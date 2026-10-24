import { Injectable } from '@angular/core';

import { isGoogleMapsConfigured, resolveGoogleMapsApiKey } from '../config/google-maps.config';

@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  load(): Promise<typeof google> {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('Google Maps is only available in the browser.'));
    }

    if (!isGoogleMapsConfigured()) {
      return Promise.reject(new Error('Google Maps API key is not configured.'));
    }

    if (window.google?.maps?.Map) {
      return this.withLibraries(window.google);
    }

    if (window.__comboGoogleMapsLoadPromise) {
      return window.__comboGoogleMapsLoadPromise;
    }

    window.__comboGoogleMapsLoadPromise = new Promise<typeof google>((resolve, reject) => {
      const key = resolveGoogleMapsApiKey();
      const callbackName = '__comboMapsInit';
      (window as unknown as Record<string, () => void>)[callbackName] = () => {
        delete (window as unknown as Record<string, unknown>)[callbackName];
        if (window.google?.maps) {
          resolve(window.google);
          return;
        }

        reject(new Error('Google Maps failed to initialize.'));
      };

      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.src =
        `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}` +
        `&language=ar&v=weekly&callback=${callbackName}`;
      script.onerror = () => {
        window.__comboGoogleMapsLoadPromise = undefined;
        reject(new Error('Failed to load Google Maps script.'));
      };
      document.head.appendChild(script);
    }).then((mapsGoogle) => this.withLibraries(mapsGoogle));

    return window.__comboGoogleMapsLoadPromise;
  }

  private async withLibraries(mapsGoogle: typeof google): Promise<typeof google> {
    const importer = mapsGoogle.maps.importLibrary;
    if (importer) {
      await Promise.all([importer('maps'), importer('routes').catch(() => undefined)]);
    }

    return mapsGoogle;
  }
}
