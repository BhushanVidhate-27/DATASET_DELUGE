import { createHash } from 'node:crypto';

/**
 * Computes the SHA-256 hex digest of a UTF-8 string.
 */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}
