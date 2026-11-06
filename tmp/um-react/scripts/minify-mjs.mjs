import { minify } from 'terser';
import { readFileSync, writeFileSync, readdirSync } from 'fs';

const assetsDir = 'dist/um-react.assets';

for (const file of readdirSync(assetsDir)) {
  if (!/\.(mjs|js)$/.test(file)) {
    continue;
  }

  console.log(`minifying ${file}...`);
  const isModule = /\.mjs$/.test(file);

  const output = await minify(readFileSync(`${assetsDir}/${file}`, 'utf-8'), {
    compress: true,
    mangle: true,
    module: isModule,
  });

  writeFileSync(`${assetsDir}/${file}`, output.code);
}
