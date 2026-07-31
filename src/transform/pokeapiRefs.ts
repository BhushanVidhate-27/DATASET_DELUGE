/**
 * Helpers for working with PokéAPI NamedAPIResource references.
 */

export interface NamedApiRef {
  name: string;
  url: string;
}

/**
 * Extracts the numeric ID from a PokéAPI resource URL.
 * Returns null when the URL does not end with a numeric ID.
 */
export function idFromUrl(url: string): number | null {
  const trimmed = url.replace(/\/+$/, '');
  const segments = trimmed.split('/');
  const last = segments[segments.length - 1];
  if (last === undefined || !/^\d+$/.test(last)) {
    return null;
  }
  return Number.parseInt(last, 10);
}

/**
 * Resolves a NamedAPIResource to its numeric ID and name.
 * Returns null when the URL has no numeric ID.
 */
export function refToIdName(ref: NamedApiRef): { id: number; name: string } | null {
  const id = idFromUrl(ref.url);
  if (id === null) {
    return null;
  }
  return { id, name: ref.name };
}

/**
 * Resolves a NamedAPIResource to just its numeric ID.
 */
export function refToId(ref: NamedApiRef): number | null {
  return idFromUrl(ref.url);
}

/**
 * Reads the first non-empty name for the given language, falling back to
 * English, then any language, then null.
 */
export function localizedName(
  names: ReadonlyArray<{ language: NamedApiRef; name: string }> | undefined,
  preferred = 'en',
): string | null {
  if (!names || names.length === 0) {
    return null;
  }
  const preferredEntry = names.find((n) => n.language.name === preferred);
  if (preferredEntry) {
    return preferredEntry.name;
  }
  return names[0]?.name ?? null;
}
