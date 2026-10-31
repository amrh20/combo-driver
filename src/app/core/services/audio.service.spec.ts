import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { AudioService } from './audio.service';

describe('AudioService', () => {
  let service: AudioService;
  let play: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    play = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal(
      'Audio',
      vi.fn(function MockAudio(this: { play: typeof play }, src: string) {
        this.play = play;
        expect(src).toBe('assets/sounds/new-order.mp3');
      }),
    );

    TestBed.configureTestingModule({});
    service = TestBed.inject(AudioService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('plays the new-order asset', () => {
    service.playNewOrderSound();
    expect(play).toHaveBeenCalledOnce();
  });

  it('swallows autoplay rejections', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    play.mockRejectedValue(new DOMException('NotAllowedError'));

    service.playNewOrderSound();
    await Promise.resolve();

    expect(warn).toHaveBeenCalledWith('Audio play blocked:', expect.any(DOMException));
  });
});
