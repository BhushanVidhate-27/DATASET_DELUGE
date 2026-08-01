import { MERGED_DIR, MERGED_POKEMON_PATH, NORMALIZED_PATHS } from '../utils/paths.js';
import { ensureDir, readJson, writeJson } from '../utils/fs.js';
import { logger } from '../utils/logger.js';
import type { Pokemon } from '../validators/schema.js';
import { POKEMON_TYPES } from '../validators/schema.js';
import { toSlug } from '../utils/slug.js';
import { classifyPokemon } from '../transform/classification.js';
import { detectFormKind, formatFormName } from '../transform/forms.js';
import { buildRelationsMap, relationsForTypes } from '../transform/typeChart.js';
import type {
  NormalizedAbility,
  NormalizedEvolutionChain,
  NormalizedForm,
  NormalizedGeneration,
  NormalizedMove,
  NormalizedPokemon,
  NormalizedSpecies,
  NormalizedType,
} from '../normalize/index.js';

export interface MergeInputs {
  pokemon: NormalizedPokemon[];
  species: NormalizedSpecies[];
  forms: NormalizedForm[];
  moves: NormalizedMove[];
  evolutions: NormalizedEvolutionChain[];
  abilities: NormalizedAbility[];
  types: NormalizedType[];
  generations: NormalizedGeneration[];
}

/**
 * Step 4 of the pipeline: merges all normalized resources into one complete
 * canonical Pokémon model per species entry.
 */
import type { Config } from '../utils/config.js';

export async function runMergeStage(_config?: Config): Promise<void> {
  logger.step('Merge', 'Combining normalized datasets into one model…');

  const inputs: MergeInputs = {
    pokemon: await readJson(NORMALIZED_PATHS.pokemon),
    species: await readJson(NORMALIZED_PATHS.species),
    forms: await readJson(NORMALIZED_PATHS.forms),
    moves: await readJson(NORMALIZED_PATHS.moves),
    evolutions: await readJson(NORMALIZED_PATHS.evolutions),
    abilities: await readJson(NORMALIZED_PATHS.abilities),
    types: await readJson(NORMALIZED_PATHS.types),
    generations: await readJson(NORMALIZED_PATHS.generations),
  };

  const pokemon = mergePokemon(inputs);

  await ensureDir(MERGED_DIR);
  await writeJson(MERGED_POKEMON_PATH, pokemon);

  logger.success(`Merged ${pokemon.length} Pokémon into ${MERGED_POKEMON_PATH}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure merge function (testable without touching disk)
// ─────────────────────────────────────────────────────────────────────────────

export function mergePokemon(inputs: MergeInputs): Pokemon[] {
  const speciesById = byId(inputs.species);
  const formsByPokemon = groupBy(inputs.forms, (f) => f.pokemonId);
  const movesById = byId(inputs.moves);
  const abilitiesById = byId(inputs.abilities);
  const evolutionsById = byId(inputs.evolutions);

  const relationsMap = buildRelationsMap(
    inputs.types.map((t) => ({
      name: t.name,
      damage_relations: {
        double_damage_to: t.damageRelations.doubleDamageTo.map((name) => ({ name })),
        half_damage_to: t.damageRelations.halfDamageTo.map((name) => ({ name })),
        no_damage_to: t.damageRelations.noDamageTo.map((name) => ({ name })),
      },
    })),
  );

  const result: Pokemon[] = [];
  for (const raw of inputs.pokemon) {
    const species = speciesById.get(raw.id);
    if (!species) {
      continue;
    }

    const typeNames = raw.types
      .map((t) => t.name)
      .filter((name): name is (typeof POKEMON_TYPES)[number] =>
        POKEMON_TYPES.includes(name as (typeof POKEMON_TYPES)[number]),
      );
    if (typeNames.length === 0) {
      continue;
    }

    const types: Pokemon['types'] =
      typeNames.length === 1 ? [typeNames[0]!] : [typeNames[0]!, typeNames[1]!];

    const baseStats = {
      hp: raw.stats.hp ?? 0,
      attack: raw.stats.attack ?? 0,
      defense: raw.stats.defense ?? 0,
      'special-attack': raw.stats['special-attack'] ?? 0,
      'special-defense': raw.stats['special-defense'] ?? 0,
      speed: raw.stats.speed ?? 0,
      total: 0,
    };
    baseStats.total =
      baseStats.hp +
      baseStats.attack +
      baseStats.defense +
      baseStats['special-attack'] +
      baseStats['special-defense'] +
      baseStats.speed;

    const abilities = raw.abilities
      .filter((a) => abilitiesById.has(a.id))
      .map((a) => ({ id: a.id, name: a.name, isHidden: a.isHidden }));
    const hiddenAbility = raw.abilities.find((a) => a.isHidden)?.name ?? null;

    const speciesForms = formsByPokemon.get(raw.id) ?? [];
    const forms = speciesForms
      .map((f) => {
        const kind = detectFormKind({
          formId: f.id,
          formName: f.name,
          pokemonName: raw.name,
          pokemonTypes: types,
          isDefault: f.isDefault,
          isMega: f.isMega,
          isBattleOnly: f.isBattleOnly,
          formOrder: f.formOrder,
        });
        return {
          id: f.id,
          name: formatFormName(f.formName || f.name, raw.name),
          kind,
          isDefault: f.isDefault,
          sprite: f.sprite,
        };
      })
      .sort((a, b) => Number(a.isDefault) - Number(b.isDefault) || a.id - b.id);

    const evolutionChain =
      species.evolutionChainId !== null ? evolutionsById.get(species.evolutionChainId) : undefined;

    const classification = classifyPokemon(
      {
        isLegendary: species.isLegendary,
        isMythical: species.isMythical,
        isBaby: species.isBaby,
        isUltraBeast: raw.name.startsWith('ub-') || raw.name.startsWith('nihilego'),
        isParadox: isParadoxName(raw.name),
        name: raw.name,
        types,
        baseStatTotal: baseStats.total,
        hasGenderDifferences: species.genderRate === 8,
        isEventOnly: false,
      },
      raw.id,
    );

    const moves = mergeMoves(raw, movesById);

    result.push({
      id: raw.id,
      name: raw.name,
      slug: toSlug(raw.name),
      generation: inputs.generations.find((g) => g.id === species.generationId)?.id ?? 1,
      types,
      forms,
      baseStats,
      height: raw.height / 10,
      weight: raw.weight / 10,
      abilities,
      hiddenAbility,
      evolutionChain: evolutionChain
        ? {
            id: evolutionChain.id,
            chain: evolutionChain.chain.map((step) => {
              const first = step.evolutionDetails[0];
              const method = first?.trigger ?? 'level-up';
              return {
                id: step.id,
                name: step.name,
                requirement: {
                  method,
                  detail: describeEvolution(first ?? { trigger: method }),
                },
              };
            }),
          }
        : null,
      legendary: classification.legendary,
      mythical: classification.mythical,
      baby: classification.baby,
      starter: classification.starter,
      pseudoLegendary: classification.pseudoLegendary,
      ultraBeast: classification.ultraBeast,
      paradox: classification.paradox,
      fossil: classification.fossil,
      eventOnly: classification.eventOnly,
      megaEvolution: forms.some(
        (f) => f.kind === 'mega' || f.kind === 'mega-x' || f.kind === 'mega-y',
      ),
      gigantamax: forms.some((f) => f.kind === 'gigantamax'),
      regionalVariant: forms.some((f) => f.kind === 'regional'),
      moves,
      sprite: raw.sprite,
      officialArtwork: raw.officialArtwork,
      typesDefense: relationsForTypes(types, relationsMap),
      flavorText: species.flavorText
        ? { text: species.flavorText, version: species.flavorVersion ?? 'unknown' }
        : null,
      baseExperience: raw.baseExperience,
      captureRate: species.captureRate,
      growthRate: species.growthRate,
      hatchSteps: species.hatchCounter !== null ? species.hatchCounter * 255 : null,
      eggGroups: species.eggGroups,
      color: species.color,
      shape: species.shape,
      habitat: species.habitat,
      category: species.category,
    });
  }

  result.sort((a, b) => a.id - b.id);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function byId<T extends { id: number }>(items: T[]): Map<number, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

function isParadoxName(name: string): boolean {
  return (
    name === 'koraidon' || name === 'miraidon' || name === 'walking-wake' || name === 'iron-leaves'
  );
}

function mergeMoves(
  raw: NormalizedPokemon,
  movesById: Map<number, NormalizedMove>,
): Pokemon['moves'] {
  const levelUp: Pokemon['moves']['levelUp'] = [];
  const machine: Pokemon['moves']['levelUp'] = [];
  const tutor: Pokemon['moves']['levelUp'] = [];
  const egg: Pokemon['moves']['levelUp'] = [];
  const other: Pokemon['moves']['levelUp'] = [];

  for (const m of raw.moves) {
    const move = movesById.get(m.id);
    if (!move) {
      continue;
    }
    const entry = {
      id: move.id,
      name: move.name,
      type: move.type,
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
      damageClass: move.damageClass,
    };
    switch (m.method) {
      case 'level-up':
      case 'level-up-female':
      case 'level-up-male':
        levelUp.push(entry);
        break;
      case 'machine':
      case 'tm':
      case 'hm':
        machine.push(entry);
        break;
      case 'tutor':
        tutor.push(entry);
        break;
      case 'egg':
        egg.push(entry);
        break;
      default:
        other.push(entry);
        break;
    }
  }

  return {
    levelUp: dedupeMoves(levelUp),
    machine: dedupeMoves(machine),
    tutor: dedupeMoves(tutor),
    egg: dedupeMoves(egg),
    other: dedupeMoves(other),
  };
}

function dedupeMoves<T extends { id: number }>(moves: T[]): T[] {
  const seen = new Set<number>();
  const result: T[] = [];
  for (const move of moves) {
    if (seen.has(move.id)) {
      continue;
    }
    seen.add(move.id);
    result.push(move);
  }
  return result;
}

function describeEvolution(details: Record<string, unknown>): string {
  const trigger = String(details.trigger ?? '');
  const minLevel = details.minLevel;
  const item = details.item;
  const heldItem = details.heldItem;
  const minHappiness = details.minHappiness;
  const timeOfDay = details.timeOfDay;
  const knownMove = details.knownMove;
  const location = details.location;

  if (trigger === 'level-up') {
    if (typeof minLevel === 'number' && minLevel > 0) {
      return `Level up to ${minLevel}`;
    }
    if (typeof minHappiness === 'number') {
      return 'Level up with high friendship';
    }
    if (timeOfDay && timeOfDay !== '') {
      return `Level up during ${timeOfDay}`;
    }
    if (knownMove) {
      return `Level up while knowing ${knownMove}`;
    }
    return 'Level up';
  }
  if (trigger === 'trade') {
    return heldItem ? `Trade while holding ${heldItem}` : 'Trade';
  }
  if (trigger === 'use-item') {
    return `Use ${item ?? 'an item'}`;
  }
  if (trigger === 'shed') {
    return 'Shed';
  }
  if (trigger === 'spin') {
    return 'Spin around and level up';
  }
  if (location) {
    return `Level up near ${location}`;
  }
  // Guarantee a non-empty detail so the schema's `.min(1)` constraint passes.
  return trigger || 'Level up';
}
