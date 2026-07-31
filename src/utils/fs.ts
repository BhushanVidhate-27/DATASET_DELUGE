import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

/**
 * Ensures a directory exists (recursively).
 */
export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

/**
 * Reads a JSON file and parses it. Throws with a descriptive error on failure.
 */
export async function readJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, 'utf8');
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON at ${filePath}: ${(error as Error).message}`);
  }
}

/**
 * Serializes a value and writes it as pretty-printed JSON (2-space indent,
 * trailing newline) so output is deterministic across platforms.
 */
export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(filePath, serialized, 'utf8');
}

export async function writeBuffer(filePath: string, buffer: Buffer): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, buffer);
}

/**
 * Lists all file names in a directory. Returns [] when the directory does not exist.
 */
export async function listFiles(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const info = await stat(filePath);
    return info.isFile();
  } catch {
    return false;
  }
}

export async function dirExists(dir: string): Promise<boolean> {
  try {
    const info = await stat(dir);
    return info.isDirectory();
  } catch {
    return false;
  }
}
