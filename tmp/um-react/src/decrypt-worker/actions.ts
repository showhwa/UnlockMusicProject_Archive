import type { DecryptionResult } from './constants';
import type {
  DecryptCommandPayload,
  FetchMusicExNamePayload,
  GetQingTingFMDeviceKeyPayload,
  ParseKugouHeaderPayload,
  ParseKugouHeaderResponse,
  ParseKuwoHeaderPayload,
  ParseKuwoHeaderResponse,
} from './types';

export type WorkerActionMap = {
  DECRYPT: { req: DecryptCommandPayload; res: DecryptionResult };
  FIND_QMC_MUSICEX_NAME: { req: FetchMusicExNamePayload; res: string | null };
  KUWO_PARSE_HEADER: { req: ParseKuwoHeaderPayload; res: ParseKuwoHeaderResponse };
  KUGOU_PARSE_HEADER: { req: ParseKugouHeaderPayload; res: ParseKugouHeaderResponse };
  QINGTING_FM_GET_DEVICE_KEY: { req: GetQingTingFMDeviceKeyPayload; res: string };
  VERSION: { req: null; res: string };
};

export type WorkerActionName = keyof WorkerActionMap;
