import { fileURLToPath } from 'node:url';
import path from 'node:path';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Project root is two levels up from src/utils/ → project root.
 * src/utils/paths.ts → src/utils → src → project root
 */
export const PROJECT_ROOT = path.resolve(currentDir, '..', '..');

export const RAW_DIR = path.join(PROJECT_ROOT, 'raw');
export const INTERMEDIATE_DIR = path.join(PROJECT_ROOT, 'intermediate');
export const GENERATED_DIR = path.join(PROJECT_ROOT, 'generated');

export const RAW_SUBDIRS = {
  pokemon: path.join(RAW_DIR, 'pokemon'),
  species: path.join(RAW_DIR, 'species'),
  forms: path.join(RAW_DIR, 'forms'),
  moves: path.join(RAW_DIR, 'moves'),
  evolutions: path.join(RAW_DIR, 'evolutions'),
  abilities: path.join(RAW_DIR, 'abilities'),
  types: path.join(RAW_DIR, 'types'),
  generations: path.join(RAW_DIR, 'generations'),
} as const;
export type RawSubdirKey = keyof typeof RAW_SUBDIRS;

export const NORMALIZED_DIR = path.join(INTERMEDIATE_DIR, 'normalized');
export const MERGED_DIR = path.join(INTERMEDIATE_DIR, 'merged');
export const SCORED_DIR = path.join(INTERMEDIATE_DIR, 'scored');

export const NORMALIZED_PATHS = {
  pokemon: path.join(NORMALIZED_DIR, 'pokemon.json'),
  species: path.join(NORMALIZED_DIR, 'species.json'),
  forms: path.join(NORMALIZED_DIR, 'forms.json'),
  moves: path.join(NORMALIZED_DIR, 'moves.json'),
  evolutions: path.join(NORMALIZED_DIR, 'evolutions.json'),
  abilities: path.join(NORMALIZED_DIR, 'abilities.json'),
  types: path.join(NORMALIZED_DIR, 'types.json'),
  generations: path.join(NORMALIZED_DIR, 'generations.json'),
} as const;

export const MERGED_POKEMON_PATH = path.join(MERGED_DIR, 'pokemon.json');
export const SCORED_POKEMON_PATH = path.join(SCORED_DIR, 'pokemon.json');

export const GENERATED_PATHS = {
  pokemon: path.join(GENERATED_DIR, 'pokemon.json'),
  recommendations: path.join(GENERATED_DIR, 'recommendations.json'),
  evolutions: path.join(GENERATED_DIR, 'evolutions.json'),
  forms: path.join(GENERATED_DIR, 'forms.json'),
  metadata: path.join(GENERATED_DIR, 'metadata.json'),
  version: path.join(GENERATED_DIR, 'version.json'),
  pokemonDb: path.join(GENERATED_DIR, 'pokemon-db.json'),
  pokemonDbGz: path.join(GENERATED_DIR, 'pokemon-db.json.gz'),
  checksum: path.join(GENERATED_DIR, 'checksum.json'),
  payloadSource: path.join(PROJECT_ROOT, 'intermediate', 'scored', 'pokemon.json'),
} as const;
