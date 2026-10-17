import { spawnSync } from 'node:child_process';
const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run'], {
  stdio: 'inherit',
  env: { ...process.env, BIRTHRIGHT_PRIVATE_REFERENCE_TESTS: '1' },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
