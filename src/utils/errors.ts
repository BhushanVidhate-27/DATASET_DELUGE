/**
 * Base error for all dataset generator failures.
 */
export class DatasetError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'DatasetError';
  }
}

/**
 * Thrown when a pipeline stage is run without its required input.
 */
export class MissingInputError extends DatasetError {
  constructor(stage: string, inputPath: string) {
    super(`Stage "${stage}" requires missing input: ${inputPath}`);
    this.name = 'MissingInputError';
  }
}

/**
 * Thrown when fetching from the public Pokémon source fails after retries.
 */
export class FetchError extends DatasetError {
  constructor(resource: string, status: number | null, attempts: number) {
    super(
      `Failed to fetch "${resource}" after ${attempts} attempt(s)` +
        (status !== null ? ` (HTTP ${status})` : ' (network error)'),
    );
    this.name = 'FetchError';
  }
}

/**
 * Thrown when validation fails. Carries per-file errors.
 */
export class ValidationError extends DatasetError {
  readonly fileErrors: ReadonlyArray<{ file: string; issues: ReadonlyArray<string> }>;

  constructor(fileErrors: ReadonlyArray<{ file: string; issues: ReadonlyArray<string> }>) {
    const summary = fileErrors
      .map(({ file, issues }) => `${file}: ${issues.length} issue(s)\n  - ${issues.join('\n  - ')}`)
      .join('\n');
    super(`Validation failed for ${fileErrors.length} file(s):\n${summary}`);
    this.name = 'ValidationError';
    this.fileErrors = fileErrors;
  }
}
