import { NORMALIZED_DIR, NORMALIZED_PATHS, RAW_SUBDIRS } from '../utils/paths.js';
import { ensureDir, writeJson } from '../utils/fs.js';
import { loadRawCollection } from './loadRaw.js';
import { logger } from '../utils/logger.js';
import type {
  RawAbility,
  RawEvolutionChain,
  RawForm,
  RawGeneration,
  RawMove,
  RawPokemon,
  RawSpecies,
  RawType,
} from '../fetch/rawTypes.js';
import { idFromUrl } from '../transform/pokeapiRefs.js';

/**
 * Step 3 of the pipeline: normalize raw data into consistent, typed resources.
 *
 * Normalization responsibilities:
 * - Drop resources without numeric IDs.
 * - Keep only main-series abilities.
 * - Flatten nested references into stable numeric IDs.
 * - Sort everything deterministically by ID.
 *
 * No Pokémon data is invented here; raw payloads are only reshaped.
 */
export async function runNormalizeStage(): Promise<void> {
  logger.step('Normalize', 'Reading raw data and building normalized resources…');

  await ensureDir(NORMALIZED_DIR);

  const [
    pokemonRaw,
    speciesRaw,
    formsRaw,
    movesRaw,
    evolutionsRaw,
    abilitiesRaw,
    typesRaw,
    generationsRaw,
  ] = await Promise.all([
    loadRawCollection<RawPokemon>(RAW_SUBDIRS.pokemon),
    loadRawCollection<RawSpecies>(RAW_SUBDIRS.species),
    loadRawCollection<RawForm>(RAW_SUBDIRS.forms),
    loadRawCollection<RawMove>(RAW_SUBDIRS.moves),
    loadRawCollection<RawEvolutionChain>(RAW_SUBDIRS.evolutions),
    loadRawCollection<RawAbility>(RAW_SUBDIRS.abilities),
    loadRawCollection<RawType>(RAW_SUBDIRS.types),
    loadRawCollection<RawGeneration>(RAW_SUBDIRS.generations),
  ]);

  const normalizedPokemon = normalizePokemon(pokemonRaw);
  const normalizedSpecies = normalizeSpecies(speciesRaw);
  const normalizedForms = normalizeForms(formsRaw);
  const normalizedMoves = normalizeMoves(movesRaw);
  const normalizedEvolutions = normalizeEvolutions(evolutionsRaw);
  const normalizedAbilities = normalizeAbilities(abilitiesRaw);
  const normalizedTypes = normalizeTypes(typesRaw);
  const normalizedGenerations = normalizeGenerations(generationsRaw);

  await Promise.all([
    writeJson(NORMALIZED_PATHS.pokemon, normalizedPokemon),
    writeJson(NORMALIZED_PATHS.species, normalizedSpecies),
    writeJson(NORMALIZED_PATHS.forms, normalizedForms),
    writeJson(NORMALIZED_PATHS.moves, normalizedMoves),
    writeJson(NORMALIZED_PATHS.evolutions, normalizedEvolutions),
    writeJson(NORMALIZED_PATHS.abilities, normalizedAbilities),
    writeJson(NORMALIZED_PATHS.types, normalizedTypes),
    writeJson(NORMALIZED_PATHS.generations, normalizedGenerations),
  ]);

  logger.success(
    `Normalized ${normalizedPokemon.length} pokemon, ${normalizedSpecies.length} species, ` +
      `${normalizedForms.length} forms, ${normalizedMoves.length} moves, ` +
      `${normalizedEvolutions.length} evolution chains, ${normalizedAbilities.length} abilities, ` +
      `${normalizedTypes.length} types, ${normalizedGenerations.length} generations`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalized resource shapes (kept minimal — the merge layer adds richness)
// ─────────────────────────────────────────────────────────────────────────────

export interface NormalizedPokemon {
  id: number;
  name: string;
  slug: string;
  isDefault: boolean;
  baseExperience: number | null;
  height: number;
  weight: number;
  abilities: Array<{ id: number; name: string; isHidden: boolean }>;
  forms: number[];
  moves: Array<{ id: number; levelLearnedAt: number; method: string }>;
  sprite: string | null;
  officialArtwork: string | null;
  stats: Record<string, number>;
  types: Array<{ slot: number; name: string }>;
}

export interface NormalizedSpecies {
  id: number;
  name: string;
  isBaby: boolean;
  isLegendary: boolean;
  isMythical: boolean;
  generationId: number | null;
  flavorText: string | null;
  flavorVersion: string | null;
  evolutionChainId: number | null;
  captureRate: number | null;
  hatchCounter: number | null;
  genderRate: number | null;
  eggGroups: string[];
  color: string | null;
  shape: string | null;
  habitat: string | null;
  growthRate: string | null;
  category: string | null;
}

export interface NormalizedForm {
  id: number;
  name: string;
  formName: string;
  isDefault: boolean;
  isMega: boolean;
  isBattleOnly: boolean;
  formOrder: number;
  pokemonId: number;
  sprite: string | null;
}

export interface NormalizedMove {
  id: number;
  name: string;
  type: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  damageClass: string;
}

export interface NormalizedEvolutionChain {
  id: number;
  chain: Array<{
    id: number;
    name: string;
    isBaby: boolean;
    evolutionDetails: Array<{
      trigger: string;
      minLevel: number | null;
      item: string | null;
      heldItem: string | null;
      minHappiness: number | null;
      timeOfDay: string;
      location: string | null;
      knownMove: string | null;
      knownMoveType: string | null;
      needsOverworldRain: boolean;
      tradeSpecies: string | null;
    }>;
    evolvesTo: Array<{
      id: number;
      name: string;
      evolutionDetails: Array<Record<string, unknown>>;
    }>;
  }>;
}

export interface NormalizedAbility {
  id: number;
  name: string;
  isMainSeries: boolean;
}

export interface NormalizedType {
  id: number;
  name: string;
  damageRelations: {
    doubleDamageTo: string[];
    halfDamageTo: string[];
    noDamageTo: string[];
  };
}

export interface NormalizedGeneration {
  id: number;
  name: string;
  pokemonSpeciesIds: number[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalizers (pure; only depend on raw maps)
// ─────────────────────────────────────────────────────────────────────────────

export function normalizePokemon(raw: Map<number, RawPokemon>): NormalizedPokemon[] {
  const result: NormalizedPokemon[] = [];
  for (const [id, p] of raw) {
    const abilities = p.abilities
      .map((a) => ({
        id: idFromUrl(a.ability.url) ?? 0,
        name: a.ability.name,
        isHidden: a.is_hidden,
      }))
      .filter((a) => a.id > 0);
    const forms = p.forms.map((f) => idFromUrl(f.url)).filter((f): f is number => f !== null);
    const moves = p.moves.map((m) => {
      const details = m.version_group_details[0];
      return {
        id: idFromUrl(m.move.url) ?? 0,
        levelLearnedAt: details?.level_learned_at ?? 0,
        method: details?.move_learn_method.name ?? 'unknown',
      };
    });
    const stats: Record<string, number> = {};
    for (const s of p.stats) {
      stats[s.stat.name] = s.base_stat;
    }

    result.push({
      id,
      name: p.name,
      slug: p.name,
      isDefault: p.is_default,
      baseExperience: p.base_experience,
      height: p.height,
      weight: p.weight,
      abilities,
      forms,
      moves,
      sprite: p.sprites.front_default,
      officialArtwork: p.sprites.other?.['official-artwork']?.front_default ?? null,
      stats,
      types: p.types
        .map((t) => ({ slot: t.slot, name: t.type.name }))
        .sort((a, b) => a.slot - b.slot),
    });
  }
  result.sort((a, b) => a.id - b.id);
  return result;
}

export function normalizeSpecies(raw: Map<number, RawSpecies>): NormalizedSpecies[] {
  const result: NormalizedSpecies[] = [];
  for (const [id, s] of raw) {
    const chainId = extractChainId(s.evolution_chain.url);
    const englishFlavor = s.flavor_text_entries.find((f) => f.language.name === 'en') ?? null;
    const englishGenus = s.genera.find((g) => g.language.name === 'en')?.genus ?? null;
    result.push({
      id,
      name: s.name,
      isBaby: s.is_baby,
      isLegendary: s.is_legendary,
      isMythical: s.is_mythical,
      generationId: idFromUrl(s.generation.url),
      flavorText: englishFlavor ? cleanFlavorText(englishFlavor.flavor_text) : null,
      flavorVersion: englishFlavor ? englishFlavor.version.name : null,
      evolutionChainId: chainId,
      captureRate: s.capture_rate ?? null,
      hatchCounter: s.hatch_counter ?? null,
      genderRate: s.gender_rate ?? null,
      eggGroups: s.egg_groups.map((g) => g.name),
      color: s.color?.name ?? null,
      shape: s.shape?.name ?? null,
      habitat: s.habitat?.name ?? null,
      growthRate: s.growth_rate?.name ?? null,
      category: englishGenus ? englishGenus.replace(/\s*Pokémon\s*/i, '').trim() : null,
    });
  }
  result.sort((a, b) => a.id - b.id);
  return result;
}

export function normalizeForms(raw: Map<number, RawForm>): NormalizedForm[] {
  const result: NormalizedForm[] = [];
  for (const [id, f] of raw) {
    const pokemonId = idFromUrl(f.pokemon.url);
    if (pokemonId === null) {
      continue;
    }
    result.push({
      id,
      name: f.name,
      formName: f.form_name || f.name,
      isDefault: f.is_default,
      isMega: f.is_mega,
      isBattleOnly: f.is_battle_only,
      formOrder: f.form_order,
      pokemonId,
      sprite: f.sprites.front_default,
    });
  }
  result.sort((a, b) => a.id - b.id);
  return result;
}

export function normalizeMoves(raw: Map<number, RawMove>): NormalizedMove[] {
  const result: NormalizedMove[] = [];
  for (const [id, m] of raw) {
    result.push({
      id,
      name: m.name,
      type: m.type.name,
      power: m.power,
      accuracy: m.accuracy,
      pp: m.pp,
      damageClass: m.damage_class.name,
    });
  }
  result.sort((a, b) => a.id - b.id);
  return result;
}

export function normalizeEvolutions(
  raw: Map<number, RawEvolutionChain>,
): NormalizedEvolutionChain[] {
  const result: NormalizedEvolutionChain[] = [];
  for (const [id, chain] of raw) {
    result.push({
      id,
      chain: chain.chain.evolves_to.map((link) => ({
        id: idFromUrl(link.species.url) ?? 0,
        name: link.species.name,
        isBaby: link.is_baby,
        evolutionDetails: link.evolution_details.map((d) => ({
          trigger: d.trigger.name,
          minLevel: d.min_level,
          item: d.item?.name ?? null,
          heldItem: d.held_item?.name ?? null,
          minHappiness: d.min_happiness,
          timeOfDay: d.time_of_day,
          location: d.location?.name ?? null,
          knownMove: d.known_move?.name ?? null,
          knownMoveType: d.known_move_type?.name ?? null,
          needsOverworldRain: d.needs_overworld_rain,
          tradeSpecies: d.trade_species?.name ?? null,
        })),
        evolvesTo: link.evolves_to.map((sub) => ({
          id: idFromUrl(sub.species.url) ?? 0,
          name: sub.species.name,
          evolutionDetails: sub.evolution_details.map(() => ({})),
        })),
      })),
    });
  }
  result.sort((a, b) => a.id - b.id);
  return result;
}

export function normalizeAbilities(raw: Map<number, RawAbility>): NormalizedAbility[] {
  const result: NormalizedAbility[] = [];
  for (const [id, a] of raw) {
    result.push({ id, name: a.name, isMainSeries: a.is_main_series });
  }
  result.sort((a, b) => a.id - b.id);
  return result;
}

export function normalizeTypes(raw: Map<number, RawType>): NormalizedType[] {
  const result: NormalizedType[] = [];
  for (const [id, t] of raw) {
    const rel = t.damage_relations ?? {};
    result.push({
      id,
      name: t.name,
      damageRelations: {
        doubleDamageTo: (rel.double_damage_to ?? []).map((r) => r.name),
        halfDamageTo: (rel.half_damage_to ?? []).map((r) => r.name),
        noDamageTo: (rel.no_damage_to ?? []).map((r) => r.name),
      },
    });
  }
  result.sort((a, b) => a.id - b.id);
  return result;
}

export function normalizeGenerations(raw: Map<number, RawGeneration>): NormalizedGeneration[] {
  const result: NormalizedGeneration[] = [];
  for (const [id, g] of raw) {
    result.push({
      id,
      name: g.name,
      pokemonSpeciesIds: g.pokemon_species
        .map((s) => idFromUrl(s.url))
        .filter((s): s is number => s !== null),
    });
  }
  result.sort((a, b) => a.id - b.id);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function extractChainId(url: string): number | null {
  const trimmed = url.replace(/\/+$/, '');
  const segments = trimmed.split('/');
  const last = segments[segments.length - 1];
  if (last === undefined || !/^\d+$/.test(last)) {
    return null;
  }
  return Number.parseInt(last, 10);
}

function cleanFlavorText(text: string): string {
  return text
    .replace(/[\n\f\r\u00ad]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export * from './loadRaw.js';
