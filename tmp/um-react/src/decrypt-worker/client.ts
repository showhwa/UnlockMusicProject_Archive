import { WorkerClientBus } from '~/util/WorkerEventBus';
import type { WorkerActionMap } from './actions';
import { DecryptionQueue } from '~/util/DecryptionQueue';

// TODO: Worker pool?
export const workerClient = new Worker(new URL('./worker', import.meta.url), { type: 'module' });

// FIXME: report the error so is obvious to the user.
workerClient.addEventListener('error', console.error);

export const workerClientBus = new WorkerClientBus<WorkerActionMap>(workerClient);
export const decryptionQueue = new DecryptionQueue(workerClientBus);
