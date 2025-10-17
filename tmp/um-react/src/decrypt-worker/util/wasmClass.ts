import { isPromise } from 'radash';

export function withWasmClass<T extends { free: () => void }, R>(instance: T, cb: (inst: T) => R): R {
  let isAsync = false;
  try {
    const resp = cb(instance);
    if (resp && isPromise(resp)) {
      isAsync = true;
      resp.finally(() => instance.free()).catch(() => {});
    }
    return resp;
  } finally {
    if (!isAsync) {
      instance.free();
    }
  }
}
