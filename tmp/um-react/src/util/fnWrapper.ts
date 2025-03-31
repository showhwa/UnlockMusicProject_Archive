export async function wrapFunctionCall<R = unknown>(
  pre: () => void,
  post: () => void,
  fn: () => Promise<R>,
): Promise<R> {
  pre();

  try {
    return await fn();
  } finally {
    post();
  }
}
