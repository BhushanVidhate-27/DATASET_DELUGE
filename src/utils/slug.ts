/**
 * Creates a URL-safe slug from a Pokémon name.
 *
 * Examples:
 *   "Mr. Mime"   → "mr-mime"
 *   "Flabébé"    → "flabebe"
 *   "Nidoran♀"   → "nidoran-f"
 *   "Type: Null" → "type-null"
 */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[♀]/g, '-f')
    .replace(/[♂]/g, '-m')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

/**
 * Slugifies and asserts a non-empty result.
 */
export function toSlug(name: string): string {
  const slug = slugify(name);
  if (!slug) {
    throw new Error(`Cannot create a slug from name "${name}"`);
  }
  return slug;
}
