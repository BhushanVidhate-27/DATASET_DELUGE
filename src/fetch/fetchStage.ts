import { HttpClient } from './httpClient.js';
import { ALL_FETCHERS } from './fetchers.js';
import { dirExists } from '../utils/fs.js';
import { RAW_DIR } from '../utils/paths.js';
import { logger } from '../utils/logger.js';
import type { Config } from '../utils/env.js';

/**
 * Step 1 of the pipeline: downloads public Pokémon data and stores it raw.
 */
export async function runFetchStage(config: Config): Promise<void> {
  logger.step('Fetch', 'Downloading raw data from public Pokémon source…');

  const http = new HttpClient({
    baseUrl: config.pokeApiBaseUrl,
    retries: config.fetchRetries,
    retryDelayMs: config.fetchRetryDelayMs,
  });

  // When the raw directory exists, each fetcher checks its own subdirectory
  // for existing files and skips only that collection if data is present.
  const skipIfExists = await dirExists(RAW_DIR);

  const results: Array<{ name: string; count: number }> = [];
  for (const fetcher of ALL_FETCHERS) {
    const result = await fetcher.fetch({
      http,
      concurrency: config.fetchConcurrency,
      delayMs: config.fetchDelayMs,
      skipIfExists,
    });
    results.push({ name: fetcher.name, count: result.count });
  }

  for (const result of results) {
    logger.info(`  ${result.name}: ${result.count} resources`);
  }
  logger.success(`Fetch complete. Raw data stored in ${RAW_DIR}`);
}
