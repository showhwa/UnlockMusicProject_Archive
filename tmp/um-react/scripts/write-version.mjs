/* eslint-env node */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let commitHash = process.env.GIT_COMMIT || 'unknown';
try {
  commitHash = execSync('git rev-parse --short HEAD').toString('utf-8').trim();
} catch (e) {
  console.error('Failed to get commit hash:', e);
}

const pkgJson = JSON.parse(readFileSync(__dirname + '/../package.json', 'utf-8'));
const pkgVer = `${pkgJson.version ?? 'unknown'}-${commitHash}` + '\n';
writeFileSync(__dirname + '/../dist/version.txt', pkgVer, 'utf-8');
