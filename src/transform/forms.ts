import type { FormKind, PokemonTypeName } from '../validators/schema.js';
import { toSlug } from '../utils/slug.js';

export interface FormDetectionInput {
  formId: number;
  formName: string;
  pokemonName: string;
  pokemonTypes: readonly PokemonTypeName[];
  isDefault: boolean;
  isMega: boolean;
  isBattleOnly: boolean;
  formOrder: number;
}

// Patterns are unanchored because the input form name may be either the raw
// PokeAPI form_name (e.g. "mega-x", "alolan") or the full name
// (e.g. "mewtwo-mega-x", "vulpix-alolan").
const MEGA_X_PATTERN = /mega-x/i;
const MEGA_Y_PATTERN = /mega-y/i;
const GIGANTAMAX_PATTERN = /-gmax|gigantamax/i;
const REGIONAL_PATTERNS = [
  /alolan/i,
  /galarian/i,
  /hisuian/i,
  /paldean/i,
  /kanto/i,
  /johto/i,
  /hoenn/i,
  /sinnoh/i,
  /unova/i,
  /kalos/i,
  /sevii/i,
];
const SEASONAL_PATTERNS = [/spring/i, /summer/i, /autumn/i, /winter/i];
const COSMETIC_PATTERNS = [
  /crimson/i,
  /violet/i,
  /indigo/i,
  /orange/i,
  /yellow/i,
  /green/i,
  /blue/i,
  /white/i,
  /black/i,
  /pink/i,
  /red/i,
  /blue-striped/i,
  /white-striped/i,
];
const BATTLE_PATTERNS = [
  /battle/i,
  /zen/i,
  /ultimate/i,
  /eternamax/i,
  /ash-/i,
  /pirouette/i,
  /crowned/i,
  /dada/i,
];

/**
 * Detects the canonical form kind from a raw PokeAPI form.
 * Fallback is `alternate` for non-default forms, `default` otherwise.
 */
export function detectFormKind(input: FormDetectionInput): FormKind {
  if (input.isDefault) {
    return 'default';
  }

  const lower = input.formName.toLowerCase();

  if (input.isMega) {
    if (MEGA_X_PATTERN.test(lower)) {
      return 'mega-x';
    }
    if (MEGA_Y_PATTERN.test(lower)) {
      return 'mega-y';
    }
    return 'mega';
  }

  if (GIGANTAMAX_PATTERN.test(lower)) {
    return 'gigantamax';
  }

  if (REGIONAL_PATTERNS.some((re) => re.test(lower))) {
    return 'regional';
  }

  if (SEASONAL_PATTERNS.some((re) => re.test(lower))) {
    return 'seasonal';
  }

  if (COSMETIC_PATTERNS.some((re) => re.test(lower))) {
    return 'cosmetic';
  }

  if (input.isBattleOnly || BATTLE_PATTERNS.some((re) => re.test(lower))) {
    return 'battle';
  }

  return 'alternate';
}

/**
 * Builds a canonical display name for a form ("Alolan Vulpix", "Mega Charizard X").
 */
export function formatFormName(formName: string, pokemonName: string): string {
  if (formName === pokemonName) {
    return pokemonName;
  }
  const slug = toSlug(formName);
  const baseSlug = toSlug(pokemonName);
  if (slug.includes(baseSlug)) {
    return formName;
  }
  return `${formName} ${pokemonName}`;
}
