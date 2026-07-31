import path from 'node:path';
import { readFile, readdir } from 'node:fs/promises';

/**
 * Reads every JSON file in a directory, keyed by numeric file stem.
 * Returns an empty map when the directory does not exist or contains no files.
 */
export async function loadRawCollection<T>(dir: string): Promise<Map<number, T>> {
  const map = new Map<number, T>();
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return map;
  }

  for (const entry of entries) {
    if (!entry.endsWith('.json')) {
      continue;
    }
    const stem = entry.slice(0, -'.json'.length);
    if (!/^\d+$/.test(stem)) {
      continue;
    }
    const id = Number.parseInt(stem, 10);
    const filePath = path.join(dir, entry);
    const raw = await readFile(filePath, 'utf8');
    map.set(id, JSON.parse(raw) as T);
  }

  return map;
}
