import { GENERATED_DIR, GENERATED_PATHS, SCORED_POKEMON_PATH } from '../utils/paths.js';
import { ensureDir, readJson, writeJson } from '../utils/fs.js';
import { logger } from '../utils/logger.js';
import type { DelugeFields, ScoredPokemon } from '../validators/schema.js';
import type { Config } from '../utils/env.js';
import { sha256Hex } from '../utils/hash.js';
import { validateOutputFiles } from '../validators/index.js';
import { readFile } from 'node:fs/promises';

/**
 * Pure builders for the final JSON output files (testable without touching disk).
 */
export interface GeneratedOutputs {
  pokemonFile: {
    version: string;
    pokemonCount: number;
    pokemon: ScoredPokemon[];
  };
  recommendationFile: {
    version: string;
    recommendationCount: number;
    recommendations: Array<{ pokemonId: number; deluge: DelugeFields }>;
  };
  evolutionFile: {
    version: string;
    chainCount: number;
    chains: Array<{
      pokemonId: number;
      evolutionChain: NonNullable<ScoredPokemon['evolutionChain']>;
    }>;
  };
  formFile: {
    version: string;
    formCount: number;
    forms: Array<{ pokemonId: number; form: ScoredPokemon['forms'][number] }>;
  };
  pokemonDb: {
    version: string;
    pokemonCount: number;
    pokemon: ScoredPokemon[];
  };
}

/**
 * Builds all generate-stage payloads from the scored model.
 */
export function buildOutputFiles(
  scored: readonly ScoredPokemon[],
  version: string,
): GeneratedOutputs {
  const pokemon = [...scored];
  const pokemonCount = pokemon.length;

  const chains = pokemon
    .filter((p) => p.evolutionChain !== null)
    .map((p) => ({
      pokemonId: p.id,
      evolutionChain: p.evolutionChain!,
    }));

  const forms = pokemon.flatMap((p) => p.forms.map((form) => ({ pokemonId: p.id, form })));

  return {
    pokemonFile: { version, pokemonCount, pokemon },
    recommendationFile: {
      version,
      recommendationCount: pokemonCount,
      recommendations: pokemon.map((p) => ({ pokemonId: p.id, deluge: delugeFieldsOf(p) })),
    },
    evolutionFile: {
      version,
      chainCount: chains.length,
      chains,
    },
    formFile: {
      version,
      formCount: forms.length,
      forms,
    },
    pokemonDb: {
      version,
      pokemonCount,
      pokemon,
    },
  };
}

/**
 * Step 7 of the pipeline: generates the final JSON output files.
 *
 * Writes:
 * - pokemon.json
 * - recommendations.json
 * - evolutions.json
 * - forms.json
 * - pokemon-db.json
 * - checksum.json (internal handoff for metadata + version stages)
 *
 * Self-validates the emitted files against their schemas before completing.
 */
export async function runGenerateStage(config: Config): Promise<void> {
  logger.step('Generate', 'Generating final output files…');

  const scored = await readJson<ScoredPokemon[]>(SCORED_POKEMON_PATH);
  const outputs = buildOutputFiles(scored, config.datasetVersion);

  await ensureDir(GENERATED_DIR);

  await Promise.all([
    writeJson(GENERATED_PATHS.pokemon, outputs.pokemonFile),
    writeJson(GENERATED_PATHS.recommendations, outputs.recommendationFile),
    writeJson(GENERATED_PATHS.evolutions, outputs.evolutionFile),
    writeJson(GENERATED_PATHS.forms, outputs.formFile),
    writeJson(GENERATED_PATHS.pokemonDb, outputs.pokemonDb),
  ]);

  // Generate-stage self-check: every output file must match its schema.
  await validateOutputFiles();

  // Compute checksum over the exact bytes written to pokemon-db.json.
  const dbRaw = await readFile(GENERATED_PATHS.pokemonDb, 'utf8');
  const checksum = sha256Hex(dbRaw);
  await writeJson(GENERATED_PATHS.checksum, { checksum });

  logger.success(
    'Generated pokemon.json, recommendations.json, evolutions.json, forms.json, pokemon-db.json, checksum.json',
  );
  logger.info(`pokemon-db.json SHA-256: ${checksum}`);
}

export function delugeFieldsOf(p: ScoredPokemon): DelugeFields {
  return {
    recommendation: p.recommendation,
    baseScore: p.baseScore,
    collectorScore: p.collectorScore,
    moneyScore: p.moneyScore,
    tradeScore: p.tradeScore,
    teamScore: p.teamScore,
    rarityScore: p.rarityScore,
    futurePotential: p.futurePotential,
  };
}
