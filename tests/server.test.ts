import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer } from '../src/server.js';
import type http from 'node:http';
import { getConfig } from '../src/utils/config.js';

describe('HTTP Dataset Server', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const config = getConfig();
    server = createServer(config);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('responds with 200 OK on GET /health', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { status: string; datasetVersion: string };
    expect(data.status).toBe('ok');
    expect(data.datasetVersion).toBeDefined();
  });

  it('sets CORS headers on all requests', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('handles OPTIONS preflight requests', async () => {
    const res = await fetch(`${baseUrl}/health`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
  });

  it('returns 404 for non-existent files', async () => {
    const res = await fetch(`${baseUrl}/nonexistent-file.json`);
    expect(res.status).toBe(404);
  });
});
