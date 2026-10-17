import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const Ajv = require('ajv');
const file = path.resolve('apps/game/src-tauri/tauri.conf.json');
const config = JSON.parse(fs.readFileSync(file, 'utf8'));
const schema = JSON.parse(
  fs.readFileSync(require.resolve('@tauri-apps/cli/config.schema.json'), 'utf8'),
);
if (config.$schema !== 'https://schema.tauri.app/config/2' || !schema.properties.build)
  throw new Error('Wrong Tauri schema');
const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addFormat('double', { type: 'number', validate: Number.isFinite });
for (const [format, min, max] of [
  ['uint8', 0, 255],
  ['uint32', 0, 4294967295],
  ['int32', -2147483648, 2147483647],
  ['int64', Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
])
  ajv.addFormat(format, {
    type: 'number',
    validate: (value) => Number.isSafeInteger(value) && value >= min && value <= max,
  });
ajv.addFormat('uuid', /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i);
if (!ajv.validate(schema, config)) throw new Error(JSON.stringify(ajv.errors, null, 2));
if (config.build.devUrl !== 'http://127.0.0.1:5173' || config.build.frontendDist !== '../dist')
  throw new Error('Frontend path mismatch');
if (!fs.existsSync(path.resolve(path.dirname(file), config.build.frontendDist, 'index.html')))
  throw new Error('Build the frontend first');
if (!fs.existsSync(path.resolve(path.dirname(file), config.bundle.icon[0])))
  throw new Error('Missing app icon');
for (const field of ['beforeDevCommand', 'beforeBuildCommand']) {
  const command = config.build[field];
  if (!command.startsWith('npm --prefix ../.. run '))
    throw new Error('Unexpected frontend command');
  const directory = path.resolve(path.dirname(file), '..', '../..');
  if (!fs.existsSync(path.join(directory, 'package.json')))
    throw new Error('Invalid command directory');
}
console.log('PASS: full Tauri 2 JSON schema, frontend paths, build commands, and icon.');
for (const command of ['cargo', 'rustc']) {
  const result = spawnSync(command, ['--version'], { encoding: 'utf8' });
  console.log(
    result.status === 0
      ? result.stdout.trim()
      : `${command}: UNAVAILABLE — native build is untested`,
  );
}
