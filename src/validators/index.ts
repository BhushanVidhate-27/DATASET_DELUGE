import { readFile } from 'node:fs/promises';
import { gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import {
  evolutionFileSchema,
  formFileSchema,
  metadataSchema,
  pokemonFileSchema,
  recommendationFileSchema,
  scoredDbSchema,
  scoredPokemonListSchema,
  versionFileSchema,
} from './schema.js';
import { GENERATED_PATHS, SCORED_POKEMON_PATH } from '../utils/paths.js';
import { ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const gunzipAsync = promisify(gunzip);

type Schema = {
  safeParse: (data: unknown) => {
    success: boolean;
    error?: { issues: Array<{ path: PropertyKey[]; message: string }> };
  };
};

type Failure = { file: string; issues: string[] };

/**
 * Target schemas for the output files produced by the **Generate** stage
 * (step 7). metadata.json / version.json are produced by the Metadata stage
 * (step 9) and validated there.
 */
const OUTPUT_VALIDATION_TARGETS: ReadonlyArray<{ file: string; schema: Schema }> = [
  { file: GENERATED_PATHS.pokemon, schema: pokemonFileSchema },
  { file: GENERATED_PATHS.recommendations, schema: recommendationFileSchema },
  { file: GENERATED_PATHS.evolutions, schema: evolutionFileSchema },
  { file: GENERATED_PATHS.forms, schema: formFileSchema },
  { file: GENERATED_PATHS.pokemonDb, schema: scoredDbSchema },
];

/**
 * Step 6 of the pipeline: validates the merged+scored Pokémon model against the
 * documented schema. Runs BEFORE output generation, so it guards the canonical
 * data contract independently of how files are emitted.
 *
 * Throws ValidationError (failing the build) when the model is invalid.
 */
import type { Config } from '../utils/config.js';

export async function runValidateStage(_config?: Config): Promise<void> {
  logger.step('Validate', 'Validating scored Pokémon model against schema…');

  const raw = await readFile(SCORED_POKEMON_PATH, 'utf8').catch(() => null);
  if (raw === null) {
    throw new ValidationError([
      {
        file: SCORED_POKEMON_PATH,
        issues: ['scored model file missing — run the merge + score stages first'],
      },
    ]);
  }

  const parsed = scoredPokemonListSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new ValidationError([
      {
        file: SCORED_POKEMON_PATH,
        issues: parsed.error!.issues.map((i) => `${String(i.path)}: ${i.message}`),
      },
    ]);
  }

  logger.success(`Validated ${parsed.data.length} scored Pokémon against the schema`);
}

/**
 * Validates the final generated output files (called by the Generate stage).
 * Throws ValidationError when any output file is missing or invalid.
 */
export async function validateOutputFiles(): Promise<void> {
  logger.info('Validating generated output files…');

  const failures: Failure[] = [];

  for (const target of OUTPUT_VALIDATION_TARGETS) {
    const raw = await readFile(target.file, 'utf8').catch(() => null);
    if (raw === null) {
      failures.push({ file: target.file, issues: ['file missing'] });
      continue;
    }
    const parsed = target.schema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      failures.push({
        file: target.file,
        issues: parsed.error!.issues.map((i) => `${String(i.path)}: ${i.message}`),
      });
    }
  }

  if (failures.length > 0) {
    throw new ValidationError(failures);
  }

  logger.success('All generated output files passed validation');
}

/**
 * Validates the gzip-compressed database by decompressing and re-parsing it.
 * Called by the Compress stage.
 */
export async function validateCompressedDb(): Promise<void> {
  logger.info('Validating pokemon-db.json.gz integrity…');

  const gzRaw = await readFile(GENERATED_PATHS.pokemonDbGz).catch(() => null);
  if (gzRaw === null) {
    throw new ValidationError([
      { file: GENERATED_PATHS.pokemonDbGz, issues: ['compressed database missing'] },
    ]);
  }

  try {
    const decompressed = await gunzipAsync(gzRaw);
    const parsed = scoredDbSchema.safeParse(JSON.parse(decompressed.toString('utf8')));
    if (!parsed.success) {
      throw new ValidationError([
        {
          file: GENERATED_PATHS.pokemonDbGz,
          issues: parsed.error!.issues.map((i) => `${String(i.path)}: ${i.message}`),
        },
      ]);
    }
  } catch (error) {
    throw new ValidationError([
      {
        file: GENERATED_PATHS.pokemonDbGz,
        issues: [`not a valid gzip file: ${(error as Error).message}`],
      },
    ]);
  }

  logger.success('pokemon-db.json.gz decompresses and validates');
}

/**
 * Validates a single JSON string against a schema; returns issue strings.
 */

export function validateJson(
  raw: string,
  schema: Schema,
): { ok: true } | { ok: false; issues: string[] } {
  const parsed = schema.safeParse(JSON.parse(raw));
  if (parsed.success) {
    return { ok: true };
  }
  return {
    ok: false,
    issues: parsed.error!.issues.map((i) => `${String(i.path)}: ${i.message}`),
  };
}
