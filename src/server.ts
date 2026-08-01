import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { getConfig } from './utils/config.js';
import { GENERATED_DIR } from './utils/paths.js';
import { logger } from './utils/logger.js';

export function createServer(config = getConfig()): http.Server {
  return http.createServer((req, res) => {
    // Set CORS headers for Chrome Extension and third-party access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      return;
    }

    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const pathname = url.pathname;

    if (pathname === '/health' || pathname === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          status: 'ok',
          datasetVersion: config.datasetVersion,
          minExtensionVersion: config.minExtensionVersion,
          timestamp: new Date().toISOString(),
        }),
      );
      return;
    }

    const relativeFile = pathname.slice(1) || 'version.json';
    const safeFile = path.basename(relativeFile);
    const filePath = path.join(GENERATED_DIR, safeFile);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Not Found', file: safeFile }));
      return;
    }

    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Not Found' }));
      return;
    }

    if (safeFile.endsWith('.gz')) {
      res.setHeader('Content-Type', 'application/gzip');
      res.setHeader('Content-Encoding', 'gzip');
    } else if (safeFile.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }

    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    res.writeHead(200);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

export function startServer(): http.Server {
  const config = getConfig();
  const port = Number.parseInt(process.env.PORT || String(config.server.port), 10);
  const host = config.server.host;
  const server = createServer(config);

  server.listen(port, host, () => {
    logger.success(`Deluge Pokémon Dataset HTTP Server running at http://${host}:${port}`);
    logger.info(`Serving generated dataset files from: ${GENERATED_DIR}`);
  });

  const shutdown = (): void => {
    logger.info('Shutting down HTTP server…');
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}

if (
  process.argv[1] &&
  (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'))
) {
  startServer();
}
