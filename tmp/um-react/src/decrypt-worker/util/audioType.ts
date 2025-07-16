import { detectAudioType } from '@unlock-music/crypto';

export function detectAudioExtension(buffer: Uint8Array): string {
  let neededLength = 0x100;
  let extension = 'bin';
  while (neededLength !== 0) {
    console.debug('AudioDetect: read %d bytes', neededLength);
    const detectResult = detectAudioType(buffer.subarray(0, neededLength));
    extension = detectResult.audioType;
    neededLength = detectResult.needMore;
    detectResult.free();
  }
  return extension;
}

export function isDataLooksLikeAudio(buffer: Uint8Array): boolean {
  if (buffer.byteLength < 0x20) {
    return false;
  }
  const detectResult = detectAudioType(buffer.subarray(0, 0x20));

  // If we have needMore != 0, that means we have a valid header (ID3 for example).
  const ok = detectResult.needMore !== 0 || detectResult.audioType !== 'bin';
  detectResult.free();
  return ok;
}

const AudioMimeType: Record<string, string> = {
  mp3: 'audio/mpeg',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  wma: 'audio/x-ms-wma',
  wav: 'audio/x-wav',
  dff: 'audio/x-dff',
};

export function getMimeTypeFromExt(ext: string) {
  return AudioMimeType[ext] || 'application/octet-stream';
}
