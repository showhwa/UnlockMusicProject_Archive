import { NetEaseCloudMusicDecipher } from '~/decrypt-worker/decipher/NetEaseCloudMusic.ts';
import { TransparentDecipher } from './decipher/Transparent.ts';
import type { DecryptCommandOptions } from '~/decrypt-worker/types.ts';
import { QQMusicV1Decipher, QQMusicV2Decipher } from '~/decrypt-worker/decipher/QQMusic.ts';
import { KuwoMusicDecipher } from '~/decrypt-worker/decipher/KuwoMusic.ts';
import { KugouMusicDecipher } from '~/decrypt-worker/decipher/KugouMusic.ts';
import { XimalayaAndroidDecipher, XimalayaPCDecipher } from '~/decrypt-worker/decipher/Ximalaya.ts';
import { XiamiDecipher } from '~/decrypt-worker/decipher/XiamiMusic.ts';
import { QignTingFMDecipher } from '~/decrypt-worker/decipher/QingTingFM.ts';
import { Migu3DKeylessDecipher } from '~/decrypt-worker/decipher/Migu3d.ts';

export enum Status {
  OK = 0,
  NOT_THIS_CIPHER = 1,
  FAILED = 2,
}

export type DecipherResult = DecipherOK | DecipherNotOK;

export interface DecipherNotOK {
  status: Exclude<Status, Status.OK>;
  message?: string;
}

export interface DecipherOK {
  status: Status.OK;
  message?: string;
  data: Uint8Array<ArrayBuffer>;
  overrideExtension?: string;
  cipherName: string;
}

export interface DecipherInstance {
  cipherName: string;

  decrypt(buffer: Uint8Array, options: DecryptCommandOptions): Promise<DecipherResult | DecipherOK>;
}

export type DecipherFactory = () => DecipherInstance;

export const allCryptoFactories: DecipherFactory[] = [
  /// File with fixed headers goes first.

  // NCM (*.ncm)
  NetEaseCloudMusicDecipher.make,

  // KGM (*.kgm, *.vpr)
  KugouMusicDecipher.make,

  // KWMv1 (*.kwm)
  KuwoMusicDecipher.make,

  // Ximalaya PC (*.xm)
  XimalayaPCDecipher.make,

  // Xiami (*.xm)
  XiamiDecipher.make,

  // QingTingFM Android (*.qta)
  QignTingFMDecipher.make,

  /// File with a fixed footer goes second

  // QMCv2 (*.mflac)
  QQMusicV2Decipher.createWithUserKey,
  QQMusicV2Decipher.createWithEmbeddedEKey,

  /// File without an obvious header or footer goes last.

  // Migu3D/Keyless (*.wav; *.m4a)
  Migu3DKeylessDecipher.make,

  // Crypto that does not implement "checkBySignature" or need to decrypt the entire file and then check audio type,
  //   should be moved to the bottom of the list for performance reasons.

  // QMCv1 (*.qmcflac)
  QQMusicV1Decipher.create,

  // Ximalaya (Android)
  XimalayaAndroidDecipher.makeX2M,
  XimalayaAndroidDecipher.makeX3M,

  // Transparent crypto (not encrypted)
  TransparentDecipher.make,
];
