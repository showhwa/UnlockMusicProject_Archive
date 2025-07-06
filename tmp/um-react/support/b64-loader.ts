import { readFile } from 'node:fs/promises';
import { Plugin } from 'vite';

export const base64Loader: Plugin = {
  name: 'base64-loader',
  async transform(_: unknown, id: string) {
    const [path, query] = id.split('?');
    if (query != 'base64') return null;

    const data = await readFile(path);
    const base64 = data.toString('base64');

    return `export default '${base64}';`;
  },
};
