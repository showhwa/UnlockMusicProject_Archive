export interface DecryptCommandOptions {
  fileName: string;
  qmc2Key?: string;
  kwm2key?: string;
  kugouKey?: string;
  qingTingAndroidKey?: string;
}

export interface DecryptCommandPayload {
  id: string;
  blobURI: string;
  options: DecryptCommandOptions;
}

export interface FetchMusicExNamePayload {
  blobURI: string;
}

export interface ParseKuwoHeaderPayload {
  blobURI: string;
}

export type ParseKuwoHeaderResponse = null | {
  resourceId: number;
  qualityId: number;
};

export interface ParseKugouHeaderPayload {
  blobURI: string;
}

export type ParseKugouHeaderResponse = null | {
  version: number;
  audioHash: string;
};

export interface GetQingTingFMDeviceKeyPayload {
  product: string;
  device: string;
  manufacturer: string;
  brand: string;
  board: string;
  model: string;
}
