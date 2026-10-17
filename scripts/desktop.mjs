import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const cli = path.join(path.dirname(require.resolve('@tauri-apps/cli/package.json')), 'tauri.js');
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: path.resolve('apps/game'),
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
