import type { PokemonTypeName } from '../validators/schema.js';
import { POKEMON_TYPES } from '../validators/schema.js';

export interface TypeRelations {
  weaknesses: PokemonTypeName[];
  resistances: PokemonTypeName[];
  immunities: PokemonTypeName[];
}

interface AttackerRelations {
  weaknesses: PokemonTypeName[];
  resistances: PokemonTypeName[];
  immunities: PokemonTypeName[];
}

/**
 * Computes the defensive type chart for a Pokémon given its types.
 *
 * `relationsByAttacker` maps each attacking type to the types it hits
 * super-effectively (`weaknesses`), not-very-effectively (`resistances`),
 * or not at all (`immunities`).
 */
export function relationsForTypes(
  typeNames: readonly PokemonTypeName[],
  relationsByAttacker: Readonly<Record<string, AttackerRelations | undefined>>,
): TypeRelations {
  const weaknesses = new Set<PokemonTypeName>();
  const resistances = new Set<PokemonTypeName>();
  const immunities = new Set<PokemonTypeName>();

  for (const attacker of POKEMON_TYPES) {
    const relations = relationsByAttacker[attacker];
    if (!relations) {
      continue;
    }

    let factor = 1;
    for (const type of typeNames) {
      if (relations.immunities.includes(type)) {
        factor = 0;
        break;
      }
      if (relations.resistances.includes(type)) {
        factor *= 0.5;
      }
      if (relations.weaknesses.includes(type)) {
        factor *= 2;
      }
    }

    if (factor === 0) {
      immunities.add(attacker);
    } else if (factor < 1) {
      resistances.add(attacker);
    } else if (factor > 1) {
      weaknesses.add(attacker);
    }
  }

  return {
    weaknesses: [...weaknesses].sort(byTypeOrder),
    resistances: [...resistances].sort(byTypeOrder),
    immunities: [...immunities].sort(byTypeOrder),
  };
}

/**
 * Builds the complete attacking map for all 18 types from raw PokeAPI
 * `type` resources, keyed by attacker type name.
 */
export function buildRelationsMap(
  rawTypes: ReadonlyArray<{
    name: string;
    damage_relations?: {
      double_damage_to?: Array<{ name: string }>;
      half_damage_to?: Array<{ name: string }>;
      no_damage_to?: Array<{ name: string }>;
    };
  }>,
): Record<string, AttackerRelations> {
  const map: Record<string, AttackerRelations> = {};
  for (const rawType of rawTypes) {
    if (!POKEMON_TYPES.includes(rawType.name as PokemonTypeName)) {
      continue;
    }
    const relations = rawType.damage_relations ?? {};
    map[rawType.name] = {
      weaknesses: toTypeList(relations.double_damage_to),
      resistances: toTypeList(relations.half_damage_to),
      immunities: toTypeList(relations.no_damage_to),
    };
  }
  return map;
}

function toTypeList(refs: ReadonlyArray<{ name: string }> | undefined): PokemonTypeName[] {
  return (refs ?? [])
    .map((r) => r.name)
    .filter((name): name is PokemonTypeName => POKEMON_TYPES.includes(name as PokemonTypeName));
}

const TYPE_ORDER: ReadonlyArray<PokemonTypeName> = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
];

export function byTypeOrder(a: PokemonTypeName, b: PokemonTypeName): number {
  return TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b);
}
