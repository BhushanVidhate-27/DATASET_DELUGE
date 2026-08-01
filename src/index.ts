#!/usr/bin/env node
import { getConfig } from './utils/config.js';
import { logger } from './utils/logger.js';
import { MissingInputError } from './utils/errors.js';
import { runFetchStage } from './fetch/fetchStage.js';
import { runNormalizeStage } from './normalize/index.js';
import { runMergeStage } from './merge/index.js';
import { runScoreStage } from './scoring/index.js';
import { runValidateStage } from './validators/index.js';
import { runGenerateStage } from './generators/index.js';
import { runCompressStage } from './compression/index.js';
import { runMetadataStage } from './metadata/index.js';

const STAGES = [
  'fetch',
  'normalize',
  'merge',
  'score',
  'validate',
  'generate',
  'compress',
  'metadata',
] as const;
type StageName = (typeof STAGES)[number];

const STAGE_RUNNERS: Record<StageName, (config: ReturnType<typeof getConfig>) => Promise<void>> = {
  fetch: runFetchStage,
  normalize: runNormalizeStage,
  merge: runMergeStage,
  score: runScoreStage,
  validate: runValidateStage,
  generate: runGenerateStage,
  compress: runCompressStage,
  metadata: runMetadataStage,
};

const PIPELINE_ORDER: readonly StageName[] = [
  'fetch',
  'normalize',
  'merge',
  'score',
  'validate',
  'generate',
  'compress',
  'metadata',
];

/**
 * CLI entry point.
 *
 * Usage:
 *   pnpm <stage>            # run one stage, e.g. pnpm merge
 *   pnpm build-db           # run the full pipeline
 *   tsx src/index.ts <stage>
 */
async function main(): Promise<void> {
  const command = process.argv[2];

  if (command === undefined) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (command === 'build-db') {
    await runPipeline();
    return;
  }

  if (!isStage(command)) {
    logger.error(`Unknown stage "${command}"`);
    printUsage();
    process.exitCode = 1;
    return;
  }

  const config = getConfig();
  try {
    await STAGE_RUNNERS[command](config);
  } catch (error) {
    handleError(command, error);
  }
}

async function runPipeline(): Promise<void> {
  const config = getConfig();
  logger.info(`Starting full pipeline (dataset v${config.datasetVersion})…`);

  for (const stage of PIPELINE_ORDER) {
    try {
      await STAGE_RUNNERS[stage](config);
    } catch (error) {
      handleError(stage, error);
      return;
    }
  }

  logger.success('Pipeline complete. Generated database is ready for hosting.');
}

function handleError(stage: string, error: unknown): void {
  if (error instanceof MissingInputError) {
    logger.error(error.message);
    logger.error('Run the previous pipeline stages first, or use `pnpm build-db`.');
  } else if (error instanceof Error) {
    logger.error(`Stage "${stage}" failed: ${error.message}`);
  } else {
    logger.error(`Stage "${stage}" failed: ${String(error)}`);
  }
  process.exitCode = 1;
}

function isStage(value: string): value is StageName {
  return (STAGES as readonly string[]).includes(value);
}

function printUsage(): void {
  logger.info(
    [
      'Usage:',
      '  tsx src/index.ts <stage>',
      '  pnpm build-db',
      '',
      'Stages:',
      '  fetch      Download raw data from the public Pokémon source.',
      '  normalize  Normalize raw data.',
      '  merge      Combine datasets into one canonical model.',
      '  score      Generate Deluge Companion recommendation fields.',
      '  validate   Validate generated files with Zod.',
      '  generate   Create final JSON files.',
      '  compress   Generate gzip output.',
      '  metadata   Generate metadata + version files.',
    ].join('\n'),
  );
}

await main();
