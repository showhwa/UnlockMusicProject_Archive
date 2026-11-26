import { dequal } from 'dequal';
import { Settings } from '~protocol';

/**
 * Merge backend settings into the current slice, preserving object identity for
 * unchanged subtrees so selectors do not re-render needlessly.
 */
export function mergeSettings(previous: Settings, next: Settings): Settings {
  if (dequal(previous, next)) return previous;
  return new Settings({
    ...next,
    bin: dequal(previous.bin, next.bin) ? previous.bin : next.bin,
    ffmpeg: dequal(previous.ffmpeg, next.ffmpeg) ? previous.ffmpeg : next.ffmpeg,
  });
}
