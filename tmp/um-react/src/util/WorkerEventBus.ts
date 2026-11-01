import { nanoid } from 'nanoid';
import { DecryptError } from '~/decrypt-worker/util/DecryptError';

type WorkerActionEntry = { req: unknown; res: unknown };
type WorkerServerHandler<P, R> = (payload: P) => R | Promise<R>;

export interface SerializedError {
  message: string;
  stack?: string;
  code?: string;
  name?: string;
}

interface WorkerClientRequestPayload<P = unknown> {
  requestId: string;
  action: string;
  payload: P;
}

interface WorkerServerResponsePayload<R = unknown> {
  requestId: string;
  result: R | null;
  error: SerializedError | null;
}

export function serializeError(err: unknown): SerializedError {
  if (err instanceof DecryptError) {
    return err.toJSON();
  }
  if (err instanceof Error) {
    const withCode = err as Error & { code?: string };
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: withCode.code,
    };
  }
  return { message: String(err) };
}

export class WorkerClientBus<TMap extends Record<string, WorkerActionEntry>> {
  private idPromiseMap = new Map<string, [(data: never) => void, (error: Error) => void]>();

  constructor(private worker: Worker) {
    worker.addEventListener('message', this.eventHandler);
  }

  eventHandler = (e: MessageEvent<WorkerServerResponsePayload>) => {
    const { requestId, result, error } = e.data;
    const actionPromise = this.idPromiseMap.get(requestId);
    if (!actionPromise) {
      console.error('could not fetch worker promise for request: %s', requestId);
      return;
    }
    this.idPromiseMap.delete(requestId);

    const [resolve, reject] = actionPromise;
    if (error) {
      const wrappedError = new Error(error.message, { cause: error });
      wrappedError.stack = error.stack;
      Object.assign(wrappedError, { code: error.code ?? null });
      reject(wrappedError);
    } else {
      resolve(result as never);
    }
  };

  async request<K extends keyof TMap & string>(actionName: K, payload: TMap[K]['req']): Promise<TMap[K]['res']> {
    return new Promise((resolve, reject) => {
      const requestId = `request://${actionName}/${nanoid()}`;
      this.idPromiseMap.set(requestId, [resolve, reject]);
      this.worker.postMessage({
        requestId,
        action: actionName,
        payload,
      } satisfies WorkerClientRequestPayload);
    });
  }
}

export class WorkerServerBus<TMap extends Record<string, WorkerActionEntry> = Record<string, WorkerActionEntry>> {
  private handlers = new Map<string, WorkerServerHandler<unknown, unknown>>();

  addEventHandler<K extends keyof TMap & string>(
    actionName: K,
    handler: WorkerServerHandler<TMap[K]['req'], TMap[K]['res']>,
  ) {
    this.handlers.set(actionName, handler);
  }

  onmessage = async (e: MessageEvent<WorkerClientRequestPayload>) => {
    const { requestId, action, payload } = e.data;
    const handler = this.handlers.get(action);

    let result: unknown = null;
    let error: SerializedError | null = null;

    if (!handler) {
      error = serializeError(new Error('Handler missing for action ' + action));
    } else {
      try {
        result = await handler(payload);
      } catch (err: unknown) {
        error = serializeError(err);
      }
    }

    postMessage({ requestId, result, error } satisfies WorkerServerResponsePayload);
  };
}
