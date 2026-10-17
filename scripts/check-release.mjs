import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('apps/game/dist');
const files = [];
async function visit(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) await visit(target);
    else files.push(target);
  }
}
await visit(root);
const forbidden = files.filter(
  (file) =>
    /\.(pdf|exe|bin|cue|dat|res|scn|sav|wad|ava|inv|nfo)$/i.test(file) ||
    /reference|original|readme/i.test(path.relative(root, file)),
);
if (forbidden.length)
  throw new Error(`Unexpected private/reference content: ${forbidden.join(', ')}`);
let size = 0;
for (const file of files) size += (await stat(file)).size;
console.log(
  `PASS: ${files.length} static frontend files, ${size} bytes; no original/reference file formats or paths bundled.`,
);
