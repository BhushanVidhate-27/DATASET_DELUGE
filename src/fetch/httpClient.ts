import { FetchError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface HttpClientOptions {
  baseUrl: string;
  retries: number;
  retryDelayMs: number;
  timeoutMs?: number;
}

interface JsonResponse<T> {
  ok: boolean;
  status: number;
  data: T;
}

/**
 * Minimal typed HTTP client for the public Pokémon data source.
 * Uses native fetch() with retry + backoff.
 */
export class HttpClient {
  constructor(private readonly options: HttpClientOptions) {}

  /**
   * GET a JSON resource, retrying on network errors and 5xx responses.
   */
  async getJson<T>(resourcePath: string): Promise<JsonResponse<T>> {
    const url = this.buildUrl(resourcePath);

    for (let attempt = 1; attempt <= this.options.retries; attempt++) {
      const result = await this.tryOnce<T>(url);
      if (result === null) {
        continue; // retry
      }
      return result;
    }

    throw new FetchError(resourcePath, null, this.options.retries);
  }

  private buildUrl(resourcePath: string): string {
    const base = this.options.baseUrl.replace(/\/+$/, '');
    const path = resourcePath.startsWith('/') ? resourcePath.slice(1) : resourcePath;
    return `${base}/${path}`;
  }

  private async tryOnce<T>(url: string): Promise<JsonResponse<T> | null> {
    const timeout = this.options.timeoutMs ?? 30_000;
    try {
      const response = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(timeout),
      });

      if (response.status === 404) {
        // Resource does not exist (e.g. an ID past the current dex). Not retryable.
        return { ok: false, status: 404, data: undefined as T };
      }

      if (response.status === 429 || response.status >= 500) {
        logger.warn(`HTTP ${response.status} for ${url}, retrying…`);
        await sleep(this.options.retryDelayMs);
        return null;
      }

      if (!response.ok) {
        logger.warn(`HTTP ${response.status} for ${url}`);
        return { ok: false, status: response.status, data: undefined as T };
      }

      return { ok: true, status: response.status, data: (await response.json()) as T };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Network error for ${url}: ${message}. Retrying…`);
      await sleep(this.options.retryDelayMs);
      return null;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
