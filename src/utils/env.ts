import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT } from './paths.js';

/**
 * Loads `.env` from the project root if present. Does not override existing
 * process.env variables. No external dependency — mirror of the tiny subset of
 * dotenv this project needs.
 */
export function loadEnv(): void {
  const envPath = path.join(PROJECT_ROOT, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function readString(key: string, fallback: string): string {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
}

function readInt(key: string, fallback: number): number {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be an integer, got "${value}"`);
  }
  return parsed;
}

export interface Config {
  pokeApiBaseUrl: string;
  fetchConcurrency: number;
  fetchDelayMs: number;
  fetchRetries: number;
  fetchRetryDelayMs: number;
  datasetVersion: string;
  minExtensionVersion: string;
  downloadBaseUrl: string;
}

/**
 * Reads the full configuration from the environment using documented defaults.
 */
export function getConfig(): Config {
  loadEnv();
  return {
    pokeApiBaseUrl: readString('POKEAPI_BASE_URL', 'https://pokeapi.co/api/v2'),
    fetchConcurrency: readInt('FETCH_CONCURRENCY', 8),
    fetchDelayMs: readInt('FETCH_DELAY_MS', 0),
    fetchRetries: readInt('FETCH_RETRIES', 3),
    fetchRetryDelayMs: readInt('FETCH_RETRY_DELAY_MS', 1000),
    datasetVersion: readString('DATASET_VERSION', '1.0.0'),
    minExtensionVersion: readString('MIN_EXTENSION_VERSION', '1.0.0'),
    downloadBaseUrl: readString('DOWNLOAD_BASE_URL', 'https://example.com/deluge-db'),
  };
}
