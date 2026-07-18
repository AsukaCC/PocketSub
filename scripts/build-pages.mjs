import { copyFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = process.cwd();
const expoCli = join(projectRoot, 'node_modules', 'expo', 'bin', 'cli');
const outputRoot = join(projectRoot, 'dist');

rmSync(outputRoot, { recursive: true, force: true });

const result = spawnSync(
  process.execPath,
  [expoCli, 'export', '--platform', 'web', '--output-dir', 'dist'],
  {
    cwd: projectRoot,
    env: {
      ...process.env,
      CI: '1',
      GITHUB_PAGES: 'true',
    },
    stdio: 'inherit',
  }
);

if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const indexFile = join(outputRoot, 'index.html');
if (!existsSync(indexFile)) {
  throw new Error('Expo export did not create dist/index.html');
}

writeFileSync(join(outputRoot, '.nojekyll'), '');
copyFileSync(indexFile, join(outputRoot, '404.html'));
