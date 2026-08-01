import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT } from './paths.js';

export interface ServerConfig {
  port: number;
  host: string;
}

export interface PathConfig {
  rawDir?: string;
  intermediateDir?: string;
  generatedDir?: string;
}

export interface Config {
  pokeApiBaseUrl: string;
  fetchConcurrency: number;
  fetchDelayMs: number;
  fetchRetries: number;
  fetchRetryDelayMs: number;
  fetchTimeoutMs: number;
  datasetVersion: string;
  minExtensionVersion: string;
  generatorVersion: string;
  downloadBaseUrl: string;
  gzipLevel: number;
  server: ServerConfig;
  paths: PathConfig;
}

export const DEFAULT_CONFIG: Config = {
  pokeApiBaseUrl: 'https://pokeapi.co/api/v2',
  fetchConcurrency: 8,
  fetchDelayMs: 0,
  fetchRetries: 3,
  fetchRetryDelayMs: 1000,
  fetchTimeoutMs: 30000,
  datasetVersion: '1.0.0',
  minExtensionVersion: '1.0.0',
  generatorVersion: '1.0.0',
  downloadBaseUrl: 'https://example.com/deluge-db',
  gzipLevel: 9,
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  paths: {
    rawDir: 'raw',
    intermediateDir: 'intermediate',
    generatedDir: 'generated',
  },
};

let cachedConfig: Config | null = null;

/**
 * Loads configuration from config.json (or config.example.json fallback) in project root.
 */
export function loadConfig(configPath?: string): Config {
  const targetPath =
    configPath ??
    (fs.existsSync(path.join(PROJECT_ROOT, 'config.json'))
      ? path.join(PROJECT_ROOT, 'config.json')
      : path.join(PROJECT_ROOT, 'config.example.json'));

  if (!fs.existsSync(targetPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = fs.readFileSync(targetPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<Config>;
    cachedConfig = mergeConfig(DEFAULT_CONFIG, parsed);
    return cachedConfig;
  } catch (error) {
    throw new Error(
      `Failed to parse configuration file at "${targetPath}": ${(error as Error).message}`,
    );
  }
}

/**
 * Returns the current configuration (loading config.json if not already loaded).
 */
export function getConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }
  return loadConfig();
}

/**
 * Resets the cached configuration (useful for testing).
 */
export function resetConfigCache(): void {
  cachedConfig = null;
}

function mergeConfig(base: Config, override: Partial<Config>): Config {
  return {
    pokeApiBaseUrl: override.pokeApiBaseUrl ?? base.pokeApiBaseUrl,
    fetchConcurrency: override.fetchConcurrency ?? base.fetchConcurrency,
    fetchDelayMs: override.fetchDelayMs ?? base.fetchDelayMs,
    fetchRetries: override.fetchRetries ?? base.fetchRetries,
    fetchRetryDelayMs: override.fetchRetryDelayMs ?? base.fetchRetryDelayMs,
    fetchTimeoutMs: override.fetchTimeoutMs ?? base.fetchTimeoutMs,
    datasetVersion: override.datasetVersion ?? base.datasetVersion,
    minExtensionVersion: override.minExtensionVersion ?? base.minExtensionVersion,
    generatorVersion: override.generatorVersion ?? base.generatorVersion,
    downloadBaseUrl: override.downloadBaseUrl ?? base.downloadBaseUrl,
    gzipLevel: override.gzipLevel ?? base.gzipLevel,
    server: {
      port: override.server?.port ?? base.server.port,
      host: override.server?.host ?? base.server.host,
    },
    paths: {
      rawDir: override.paths?.rawDir ?? base.paths.rawDir,
      intermediateDir: override.paths?.intermediateDir ?? base.paths.intermediateDir,
      generatedDir: override.paths?.generatedDir ?? base.paths.generatedDir,
    },
  };
}
