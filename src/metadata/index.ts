import { GENERATED_PATHS } from '../utils/paths.js';
import { readJson, writeJson } from '../utils/fs.js';
import { logger } from '../utils/logger.js';
import type { Config } from '../utils/env.js';
import {
  metadataSchema,
  versionFileSchema,
  type Metadata,
  type ScoredPokemon,
  type VersionFile,
} from '../validators/schema.js';
import { sha256Hex } from '../utils/hash.js';
import { ValidationError } from '../utils/errors.js';
import { readFile } from 'node:fs/promises';

/**
 * Pure builders for metadata + version files (testable without touching disk).
 */
export function buildMetadata(options: {
  version: string;
  generatedAt: string;
  pokemonCount: number;
  generatorVersion: string;
  checksum: string;
  minExtensionVersion: string;
}): Metadata {
  return {
    version: options.version,
    generatedAt: options.generatedAt,
    pokemonCount: options.pokemonCount,
    generatorVersion: options.generatorVersion,
    checksum: options.checksum,
    minExtensionVersion: options.minExtensionVersion,
  };
}

export function buildVersionFile(options: {
  version: string;
  checksum: string;
  downloadBaseUrl: string;
}): VersionFile {
  return {
    version: options.version,
    checksum: options.checksum,
    downloadURL: `${options.downloadBaseUrl.replace(/\/+$/, '')}/pokemon-db.json.gz`,
  };
}

/**
 * Step 9 of the pipeline: generates metadata.json and version.json.
 *
 * Both files include the SHA-256 checksum of pokemon-db.json, computed by the
 * generate stage and passed through generated/checksum.json.
 */
export async function runMetadataStage(config: Config): Promise<void> {
  logger.step('Metadata', 'Generating metadata.json and version.json…');

  const scored = await readJson<ScoredPokemon[]>(GENERATED_PATHS.payloadSource);
  const checksumInfo = await readJson<{ checksum: string }>(GENERATED_PATHS.checksum).catch(
    () => null,
  );
  let checksum: string;
  if (checksumInfo?.checksum) {
    checksum = checksumInfo.checksum;
  } else {
    const dbRaw = await readFile(GENERATED_PATHS.pokemonDb, 'utf8');
    checksum = sha256Hex(dbRaw);
  }

  const generatedAt = new Date().toISOString();
  const generatorVersion = generatorVersionFromPackage();

  const metadata = buildMetadata({
    version: config.datasetVersion,
    generatedAt,
    pokemonCount: scored.length,
    generatorVersion,
    checksum,
    minExtensionVersion: config.minExtensionVersion,
  });

  const versionFile = buildVersionFile({
    version: config.datasetVersion,
    checksum,
    downloadBaseUrl: config.downloadBaseUrl,
  });

  await Promise.all([
    writeJson(GENERATED_PATHS.metadata, metadata),
    writeJson(GENERATED_PATHS.version, versionFile),
  ]);

  // Fail the stage if either file does not match its schema.
  const writtenMetadata = await readJson(GENERATED_PATHS.metadata);
  const writtenVersion = await readJson(GENERATED_PATHS.version);
  const metadataResult = metadataSchema.safeParse(writtenMetadata);
  const versionResult = versionFileSchema.safeParse(writtenVersion);

  const failures: Array<{ file: string; issues: string[] }> = [];
  if (!metadataResult.success) {
    failures.push({
      file: GENERATED_PATHS.metadata,
      issues: metadataResult.error.issues.map((i) => `${String(i.path)}: ${i.message}`),
    });
  }
  if (!versionResult.success) {
    failures.push({
      file: GENERATED_PATHS.version,
      issues: versionResult.error.issues.map((i) => `${String(i.path)}: ${i.message}`),
    });
  }
  if (failures.length > 0) {
    throw new ValidationError(failures);
  }

  logger.success(`metadata.json + version.json written (${scored.length} Pokémon)`);
}

function generatorVersionFromPackage(): string {
  // Static constant kept in sync with package.json. Avoids reading the
  // package file at runtime so the stage stays portable.
  return '1.0.0';
}
