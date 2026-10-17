import { spawnSync } from 'node:child_process';
const desktop = process.argv.includes('--desktop');
const command = desktop
  ? ['scripts/desktop.mjs', 'build']
  : [
      'node_modules/vite/bin/vite.js',
      'build',
      '--config',
      'apps/game/vite.config.ts',
      '--outDir',
      'dist-private',
    ];
const check = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit'], {
  stdio: 'inherit',
});
if (check.status !== 0) process.exit(check.status ?? 1);
const result = spawnSync(process.execPath, command, {
  stdio: 'inherit',
  env: { ...process.env, BIRTHRIGHT_PRIVATE_BUILD: '1' },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
