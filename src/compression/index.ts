import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { GENERATED_PATHS } from '../utils/paths.js';
import { writeBuffer } from '../utils/fs.js';
import { logger } from '../utils/logger.js';
import { validateCompressedDb } from '../validators/index.js';

const gzipAsync = promisify(gzip);

/**
 * Step 8 of the pipeline: compresses pokemon-db.json into pokemon-db.json.gz.
 *
 * gzip is the required format. The module is structured so Brotli support can
 * be added later without changing the pipeline contract.
 */
export async function runCompressStage(): Promise<void> {
  logger.step('Compress', 'Compressing pokemon-db.json…');

  const raw = await readFile(GENERATED_PATHS.pokemonDb);
  const compressed = await gzipAsync(raw, { level: 9 });

  await writeBuffer(GENERATED_PATHS.pokemonDbGz, compressed);

  const inputKb = (raw.byteLength / 1024).toFixed(1);
  const outputKb = (compressed.byteLength / 1024).toFixed(1);
  const ratio =
    raw.byteLength > 0 ? ((1 - compressed.byteLength / raw.byteLength) * 100).toFixed(1) : '0.0';

  logger.success(`pokemon-db.json.gz written (${inputKb} KB → ${outputKb} KB, ${ratio}% smaller)`);

  // Integrity gate: the .gz must decompress to a schema-valid pokemon-db.
  await validateCompressedDb();
}
