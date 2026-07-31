/**
 * Minimal deterministic-aware logger. All output goes to stdout.
 */
export const logger = {
  info(message: string): void {
    console.log(`[info] ${message}`);
  },
  step(stage: string, message: string): void {
    console.log(`\n=== ${stage} ===`);
    console.log(`[info] ${message}`);
  },
  warn(message: string): void {
    console.warn(`[warn] ${message}`);
  },
  error(message: string): void {
    console.error(`[error] ${message}`);
  },
  success(message: string): void {
    console.log(`[ok] ${message}`);
  },
};
