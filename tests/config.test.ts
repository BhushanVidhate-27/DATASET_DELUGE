import { describe, expect, it, beforeEach } from 'vitest';
import { getConfig, loadConfig, resetConfigCache, DEFAULT_CONFIG } from '../src/utils/config.js';
import path from 'node:path';

describe('Config loader', () => {
  beforeEach(() => {
    resetConfigCache();
  });

  it('loads configuration successfully', () => {
    const config = getConfig();
    expect(config).toBeDefined();
    expect(config.pokeApiBaseUrl).toBe('https://pokeapi.co/api/v2');
    expect(config.fetchConcurrency).toBeGreaterThan(0);
    expect(config.datasetVersion).toBeDefined();
    expect(config.server.port).toBe(3000);
  });

  it('loads custom configuration from a specified file', () => {
    const examplePath = path.resolve(__dirname, '..', 'config.example.json');
    const custom = loadConfig(examplePath);
    expect(custom.pokeApiBaseUrl).toBe('https://pokeapi.co/api/v2');
    expect(custom.server.port).toBe(3000);
  });

  it('provides default fallbacks when given an empty config file path', () => {
    const nonExistent = path.resolve(__dirname, '..', 'non-existent-config.json');
    const fallback = loadConfig(nonExistent);
    expect(fallback).toEqual(DEFAULT_CONFIG);
  });
});
