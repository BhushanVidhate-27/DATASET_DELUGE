import type { HttpClient } from './httpClient.js';
import { ensureDir, writeBuffer } from '../utils/fs.js';
import path from 'node:path';
import { logger } from '../utils/logger.js';

export interface NamedApiResource {
  name: string;
  url: string;
}

export interface ApiResourceList {
  count: number;
  next: string | null;
  previous: string | null;
  results: NamedApiResource[];
}

export interface FetchResult {
  directory: string;
  count: number;
  files: string[];
}

interface ResourceRef {
  id: number;
}

/**
 * Discovers every resource URL for a collection (e.g. `pokemon`, `move`),
 * extracts stable numeric IDs, and fetches each resource's full payload.
 * Skips resources without a numeric ID.
 *
 * Raw JSON blobs are written untouched to `raw/<collection>/<id>.json`.
 */
export class RawFetcher {
  constructor(
    private readonly http: HttpClient,
    private readonly concurrency: number,
    private readonly delayMs: number,
  ) {}

  async fetchCollection(collection: string, outputDir: string): Promise<FetchResult> {
    const list = await this.http.getJson<ApiResourceList>(`${collection}?limit=100000`);
    if (!list.ok) {
      throw new Error(`Failed to list ${collection}: HTTP ${list.status}`);
    }

    const refs = list.data.results
      .map((r) => parseId(r.url))
      .filter((r): r is ResourceRef => r !== null);

    await ensureDir(outputDir);

    const files: string[] = [];
    let index = 0;

    // Deterministic: process resources in ascending ID order.
    refs.sort((a, b) => a.id - b.id);

    while (index < refs.length) {
      const batch = refs.slice(index, index + this.concurrency);
      index += this.concurrency;

      const results = await Promise.all(
        batch.map(async (ref) => {
          const filePath = path.join(outputDir, `${ref.id}.json`);
          const response = await this.http.getJson<unknown>(`${collection}/${ref.id}`);
          if (!response.ok) {
            logger.warn(`Skipping ${collection}/${ref.id} (HTTP ${response.status})`);
            return null;
          }
          await writeBuffer(filePath, Buffer.from(JSON.stringify(response.data)));
          return filePath;
        }),
      );

      for (const filePath of results) {
        if (filePath !== null) {
          files.push(filePath);
        }
      }

      if (this.delayMs > 0 && index < refs.length) {
        await sleep(this.delayMs);
      }
    }

    logger.info(`Fetched ${files.length}/${refs.length} ${collection} resources into ${outputDir}`);
    return { directory: outputDir, count: files.length, files };
  }
}

/**
 * Extracts the numeric ID from a PokeAPI resource URL.
 * Returns null when the last path segment is not a plain integer.
 */
function parseId(url: string): ResourceRef | null {
  const trimmed = url.replace(/\/+$/, '');
  const segments = trimmed.split('/');
  const last = segments[segments.length - 1];
  if (last === undefined || !/^\d+$/.test(last)) {
    return null;
  }
  return { id: Number.parseInt(last, 10) };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
