import { basename } from 'node:path';
import { readFile } from 'node:fs/promises';
import { Plugin } from 'vite';
import tar from 'tar-stream';

export const macCommandLoader: Plugin = {
  name: 'mac-command-loader',
  async transform(_: unknown, id: string) {
    const [path, query] = id.split('?');
    if (!query || !query.includes('mac-command')) return null;

    const params = new URLSearchParams(query);

    // Mac .command packer.
    // - Create a tarball with the given file (a+x)
    // - Encode to base64

    const tarball = tar.pack();
    const name = params.get('name') || `${basename(path)}.command`;
    const data = await readFile(path);
    tarball.entry({ name, mode: 0o755 }, data);
    tarball.finalize();

    const chunks: Buffer[] = [];
    for await (const chunk of tarball) {
      chunks.push(chunk as Buffer);
    }
    const dataBuffer = Buffer.concat(chunks);
    const base64 = dataBuffer.toString('base64');

    return `
      export const tarball     = ${JSON.stringify(base64)};
      export const commandName = ${JSON.stringify(name)};
      export const tarName     = ${JSON.stringify(`${name}.tar`)};
    `;
  },
};
