import type { PokemonTypeName } from '../validators/schema.js';

export interface ClassificationFlags {
  legendary: boolean;
  mythical: boolean;
  baby: boolean;
  starter: boolean;
  pseudoLegendary: boolean;
  ultraBeast: boolean;
  paradox: boolean;
  fossil: boolean;
  eventOnly: boolean;
}

export interface ClassificationInput {
  isLegendary: boolean;
  isMythical: boolean;
  isBaby: boolean;
  isUltraBeast: boolean;
  isParadox: boolean;
  name: string;
  types: readonly PokemonTypeName[];
  baseStatTotal: number;
  hasGenderDifferences: boolean;
  isEventOnly: boolean;
}

const STARTER_DEX_IDS = new Set([
  1, 4, 7, 25, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501, 650, 653, 656, 722, 725,
  728, 810, 813, 816, 906, 909, 912,
]);

const PSEUDO_LEGENDARY_DEX_IDS = new Set([
  6, 65, 68, 94, 130, 131, 142, 143, 149, 248, 373, 376, 445, 448, 635, 637, 706, 709, 784, 799,
  800, 845, 887, 901, 998, 1000,
]);

const FOSSIL_DEX_IDS = new Set([
  138, 139, 140, 141, 142, 345, 346, 347, 348, 408, 409, 410, 411, 564, 565, 566, 567, 696, 697,
  698, 699, 880, 881, 882, 883,
]);

const PARADOX_DEX_IDS = new Set([
  984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995, 996, 997, 998, 999, 1000, 1001, 1002,
  1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015, 1016, 1017, 1018,
  1019, 1020, 1021, 1022, 1023,
]);

const EVENT_ONLY_DEX_IDS = new Set([439, 440, 441, 442, 443, 444, 445]);

/**
 * Classifies a Pokémon into boolean flags. Deterministic, no randomness.
 */
export function classifyPokemon(input: ClassificationInput, dexId: number): ClassificationFlags {
  const isPseudo =
    PSEUDO_LEGENDARY_DEX_IDS.has(dexId) && input.baseStatTotal >= 540 && input.baseStatTotal <= 600;
  const isParadox = PARADOX_DEX_IDS.has(dexId) && input.isParadox;
  const isFossil = FOSSIL_DEX_IDS.has(dexId);
  const isEvent = EVENT_ONLY_DEX_IDS.has(dexId) || input.isEventOnly;

  return {
    legendary: input.isLegendary,
    mythical: input.isMythical,
    baby: input.isBaby,
    starter: STARTER_DEX_IDS.has(dexId),
    pseudoLegendary: isPseudo,
    ultraBeast: input.isUltraBeast,
    paradox: isParadox,
    fossil: isFossil,
    eventOnly: isEvent,
  };
}
