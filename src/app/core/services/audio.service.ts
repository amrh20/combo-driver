import { Injectable } from '@angular/core';

const NEW_ORDER_SOUND_URL = 'assets/sounds/new-order.mp3';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  playNewOrderSound(): void {
    if (typeof Audio === 'undefined') {
      return;
    }

    const audio = new Audio(NEW_ORDER_SOUND_URL);
    void Promise.resolve(audio.play()).catch((err) => console.warn('Audio play blocked:', err));
  }
}
