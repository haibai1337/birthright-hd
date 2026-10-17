import { createReadStream } from 'node:fs';
import { cp, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Plugin, Connect } from 'vite';

/** Only local dev/preview serves this ignored directory. Clean builds never copy it. */
export function privateAssetsPlugin(root: string): Plugin {
  let buildDirectory = path.resolve(root, 'apps/game/dist');
  const prefix = '/_private/',
    directory = path.resolve(root, 'reference/private-assets');
  const serve = (server: { middlewares: Connect.Server }) => {
    server.middlewares.use(prefix, async (req, res, next) => {
      try {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.statusCode = 405;
          res.end();
          return;
        }
        const relative = decodeURIComponent((req.url ?? '').split('?')[0]!).replace(/^\/+/, ''),
          file = path.resolve(directory, relative || 'catalog.html');
        const base = await realpath(directory),
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
    name: 'local-private-assets',
    configResolved(config) {
      buildDirectory = path.resolve(config.root, config.build.outDir);
    },
    configureServer: serve,
    configurePreviewServer: serve,
    async closeBundle() {
      if (process.env.BIRTHRIGHT_PRIVATE_BUILD !== '1') return;
      const out = buildDirectory;
      await cp(directory, path.join(out, '_private'), { recursive: true });
      await writeFile(
        path.join(out, 'PRIVATE_BUILD.txt'),
        'PRIVATE LOCAL BUILD: contains original game assets. Do not distribute.\n',
      );
    },
  };
}
