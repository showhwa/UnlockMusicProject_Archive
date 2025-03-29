import { WorkerServerBus } from '~/util/WorkerEventBus';
import { DECRYPTION_WORKER_ACTION_NAME } from './constants';
import { getUmcVersion } from '@unlock-music/crypto';

import { workerDecryptHandler } from './worker/decrypt.ts';
import { workerParseMusicExMediaName } from './worker/qmcv2_parser.ts';
import { workerGetQtfmDeviceKey } from '~/decrypt-worker/worker/qtfm_device_key.ts';
import { workerParseKuwoHeader } from '~/decrypt-worker/worker/kuwo_header_parse.ts';
import { workerParseKugouHeader } from '~/decrypt-worker/worker/kugou_parse_header.ts';

const bus = new WorkerServerBus();
onmessage = bus.onmessage;

bus.addEventHandler(DECRYPTION_WORKER_ACTION_NAME.DECRYPT, workerDecryptHandler);
bus.addEventHandler(DECRYPTION_WORKER_ACTION_NAME.FIND_QMC_MUSICEX_NAME, workerParseMusicExMediaName);
bus.addEventHandler(DECRYPTION_WORKER_ACTION_NAME.VERSION, getUmcVersion);
bus.addEventHandler(DECRYPTION_WORKER_ACTION_NAME.KUWO_PARSE_HEADER, workerParseKuwoHeader);
bus.addEventHandler(DECRYPTION_WORKER_ACTION_NAME.KUGOU_PARSE_HEADER, workerParseKugouHeader);
bus.addEventHandler(DECRYPTION_WORKER_ACTION_NAME.QINGTING_FM_GET_DEVICE_KEY, workerGetQtfmDeviceKey);
