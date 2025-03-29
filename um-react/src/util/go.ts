export async function go<T = unknown, E = Error>(promise: Promise<T>): Promise<[T, null] | [null, E]> {
  try {
    return [await promise, null];
  } catch (error: unknown) {
    return [null, error as E];
  }
}
