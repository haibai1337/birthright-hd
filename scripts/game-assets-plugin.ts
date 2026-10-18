import { createReadStream } from 'node:fs';
import { cp, copyFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Plugin, Connect } from 'vite';

/** One original-asset route in development and the compiled browser/Tauri application. */
export function gameAssetsPlugin(root: string): Plugin {
  let building = false;
  let buildDirectory = path.resolve(root, 'apps/game/dist');
  const prefix = '/original/',
    directory = path.resolve(root, 'reference/assets'),
    campaign = path.resolve(root, 'reference/extracted/anuire/anuire.research.json');
  const serve = (server: { middlewares: Connect.Server }) => {
    server.middlewares.use(prefix, async (req, res, next) => {
      try {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.statusCode = 405;
          res.end();
          return;
        }
        const relative = decodeURIComponent((req.url ?? '').split('?')[0]!).replace(/^\/+/, ''),
          file = ['anuire.research.json', 'economy.research.json', 'magic.research.json'].includes(
            relative,
          )
            ? path.join(path.dirname(campaign), relative)
            : path.resolve(directory, relative || 'catalog.html');
        const base = await realpath(
            ['anuire.research.json', 'economy.research.json', 'magic.research.json'].includes(
              relative,
            )
              ? path.dirname(campaign)
              : directory,
          ),
          resolved = await realpath(file);
        if (!resolved.startsWith(base + path.sep)) {
          res.statusCode = 403;
          res.end();
          return;
        }
        const info = await stat(resolved);
        if (!info.isFile()) {
          next();
          return;
        }
        const mime: Record<string, string> = {
          '.png': 'image/png',
          '.svg': 'image/svg+xml',
          '.css': 'text/css; charset=utf-8',
          '.wav': 'audio/wav',
          '.json': 'application/json',
          '.html': 'text/html; charset=utf-8',
          '.txt': 'text/plain',
        };
        res.setHeader(
          'Content-Type',
          mime[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
        );
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Accept-Ranges', 'bytes');
        let start = 0,
          end = info.size - 1;
        if (req.headers.range) {
          const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
          if (!range) {
            res.statusCode = 416;
            res.end();
            return;
          }
          start = Number(range[1]);
          if (range[2]) end = Math.min(end, Number(range[2]));
          if (start > end) {
            res.statusCode = 416;
            res.setHeader('Content-Range', `bytes */${info.size}`);
            res.end();
            return;
          }
          res.statusCode = 206;
          res.setHeader('Content-Range', `bytes ${start}-${end}/${info.size}`);
        }
        res.setHeader('Content-Length', end - start + 1);
        if (req.method === 'HEAD') res.end();
        else createReadStream(resolved, { start, end }).on('error', next).pipe(res);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
          res.statusCode = 404;
          res.end();
        } else next(e);
      }
    });
  };
  return {
    name: 'original-game-assets',
    configResolved(config) {
      building = config.command === 'build';
      buildDirectory = path.resolve(config.root, config.build.outDir);
    },
    configureServer: serve,
    async buildStart() {
      if (!building) return;
      try {
        await stat(path.join(directory, 'runtime.json'));
        await stat(campaign);
      } catch {
        this.error(
          'Original assets or Anuire data are missing. Run npm run assets:import before building.',
        );
      }
    },
    async closeBundle() {
      if (!building) return;
      const out = buildDirectory;
      await cp(directory, path.join(out, 'original'), { recursive: true });
      await copyFile(campaign, path.join(out, 'original/anuire.research.json'));
      try {
        await copyFile(
          path.join(path.dirname(campaign), 'economy.research.json'),
          path.join(out, 'original/economy.research.json'),
        );
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
      }
      try {
        await copyFile(
          path.join(path.dirname(campaign), 'magic.research.json'),
          path.join(out, 'original/magic.research.json'),
        );
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
      }
    },
  };
}
