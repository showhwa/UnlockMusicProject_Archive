// This is a dummy module for vite/rollup to resolve.
export function createRequire() {
  const _ = import('radash'); // we need to import something, so vite don't complain on build
  throw new Error('this is a dummy module. Do not use');
}
