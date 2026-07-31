import { RawFetcher } from './rawFetcher.js';
import type { HttpClient } from './httpClient.js';
import { RAW_SUBDIRS } from '../utils/paths.js';
import { dirExists, listFiles } from '../utils/fs.js';
import { logger } from '../utils/logger.js';

export interface FetcherOptions {
  http: HttpClient;
  concurrency: number;
  delayMs: number;
  skipIfExists: boolean;
}

export interface Fetcher {
  readonly name: string;
  fetch(options: FetcherOptions): Promise<{ directory: string; count: number }>;
}

function createCollectionFetcher(collection: string, subdirKey: keyof typeof RAW_SUBDIRS): Fetcher {
  return {
    name: collection,
    async fetch({ http, concurrency, delayMs, skipIfExists }) {
      const fetcher = new RawFetcher(http, concurrency, delayMs);
      const outputDir = RAW_SUBDIRS[subdirKey];
      if (skipIfExists) {
        const hasDir = await dirExists(outputDir);
        if (hasDir) {
          const files = await listFiles(outputDir);
          if (files.length > 0) {
            logger.info(`Skipping ${collection}: ${files.length} raw files already present`);
            return { directory: outputDir, count: files.length };
          }
        }
      }
      const result = await fetcher.fetchCollection(collection, outputDir);
      return { directory: result.directory, count: result.count };
    },
  };
}

export const fetchPokemon: Fetcher = createCollectionFetcher('pokemon', 'pokemon');
export const fetchSpecies: Fetcher = createCollectionFetcher('pokemon-species', 'species');
export const fetchEvolutionChains: Fetcher = createCollectionFetcher(
  'evolution-chain',
  'evolutions',
);
export const fetchTypes: Fetcher = createCollectionFetcher('type', 'types');
export const fetchMoves: Fetcher = createCollectionFetcher('move', 'moves');
export const fetchAbilities: Fetcher = createCollectionFetcher('ability', 'abilities');
export const fetchForms: Fetcher = createCollectionFetcher('pokemon-form', 'forms');
export const fetchGenerations: Fetcher = createCollectionFetcher('generation', 'generations');

export const ALL_FETCHERS: readonly Fetcher[] = [
  fetchPokemon,
  fetchSpecies,
  fetchEvolutionChains,
  fetchTypes,
  fetchMoves,
  fetchAbilities,
  fetchForms,
  fetchGenerations,
];
