import { describe, expect, it } from 'vitest';
import { mergePokemon } from '../src/merge/index.js';
import { scoreAll, scoreOne, tierFromScore } from '../src/scoring/index.js';
import { pokemonSchema, scoredPokemonSchema, type Pokemon } from '../src/validators/schema.js';
import { buildMergeInputs, fixtureSpecies1 } from './fixtures.js';

describe('merge', () => {
  it('produces canonical Pokémon sorted by id', () => {
    const merged = mergePokemon(buildMergeInputs());
    expect(merged.length).toBe(2);
    expect(merged[0]!.id).toBe(1);
    expect(merged[1]!.id).toBe(150);
  });

  it('merges species, forms, abilities, types and flavor text', () => {
    const merged = mergePokemon(buildMergeInputs());
    const bulb = merged.find((p) => p.id === 1)!;

    expect(bulb.name).toBe('bulbasaur');
    expect(bulb.generation).toBe(1);
    expect(bulb.types).toEqual(['grass', 'poison']);
    expect(bulb.hiddenAbility).toBe('chlorophyll');
    expect(bulb.abilities.map((a) => a.name)).toEqual(['overgrow', 'chlorophyll']);
    expect(bulb.baseStats.total).toBe(318);
    expect(bulb.height).toBeCloseTo(0.7);
    expect(bulb.weight).toBeCloseTo(6.9);
    expect(bulb.flavorText).not.toBeNull();
    expect(bulb.category).toBe('Seed Pokémon');
    expect(bulb.starter).toBe(true);
    expect(bulb.legendary).toBe(false);
    expect(bulb.evolutionChain).not.toBeNull();
    expect(bulb.moves.levelUp.some((m) => m.name === 'tackle')).toBe(true);
  });

  it('detects mega forms and sets megaEvolution flag', () => {
    const merged = mergePokemon(buildMergeInputs());
    const mewtwo = merged.find((p) => p.id === 150)!;

    expect(mewtwo.megaEvolution).toBe(true);
    expect(mewtwo.forms.some((f) => f.kind === 'mega-x')).toBe(true);
    expect(mewtwo.forms.some((f) => f.kind === 'default')).toBe(true);
  });

  it('computes type defenses', () => {
    const merged = mergePokemon(buildMergeInputs());
    const bulb = merged.find((p) => p.id === 1)!;

    // Grass/Poison: fire, flying, ice, psychic = 2x+
    expect(bulb.typesDefense.weaknesses).toContain('fire');
    expect(bulb.typesDefense.weaknesses).toContain('flying');
    expect(bulb.typesDefense.weaknesses).toContain('ice');
    expect(bulb.typesDefense.weaknesses).toContain('psychic');
    // Water is resisted by grass
    expect(bulb.typesDefense.resistances).toContain('water');
  });

  it('handles missing species by skipping', () => {
    const inputs = buildMergeInputs({ species: [fixtureSpecies1] });
    const merged = mergePokemon(inputs);
    expect(merged.length).toBe(1);
    expect(merged[0]!.id).toBe(1);
  });
});

describe('scoring', () => {
  const merged = mergePokemon(buildMergeInputs());

  it('adds all Deluge Companion fields', () => {
    const scored = scoreAll(merged);
    for (const p of scored) {
      expect(typeof p.baseScore).toBe('number');
      expect(typeof p.collectorScore).toBe('number');
      expect(typeof p.moneyScore).toBe('number');
      expect(typeof p.tradeScore).toBe('number');
      expect(typeof p.teamScore).toBe('number');
      expect(typeof p.rarityScore).toBe('number');
      expect(typeof p.futurePotential).toBe('number');
      expect(p.recommendation.overallScore).toBeGreaterThanOrEqual(0);
      expect(p.recommendation.overallScore).toBeLessThanOrEqual(100);
      expect(p.recommendation.reason.length).toBeGreaterThan(0);
    }
  });

  it('scores legendaries higher than common starters', () => {
    const scored = scoreAll(merged);
    const bulb = scored.find((p) => p.id === 1)!;
    const mewtwo = scored.find((p) => p.id === 150)!;

    expect(mewtwo.recommendation.overallScore).toBeGreaterThan(bulb.recommendation.overallScore);
    expect(mewtwo.rarityScore).toBeGreaterThan(bulb.rarityScore);
  });

  it('is deterministic', () => {
    const a = scoreAll(merged);
    const b = scoreAll(merged);
    expect(a).toEqual(b);
  });

  it('tierFromScore maps boundaries', () => {
    expect(tierFromScore(95)).toBe('S+');
    expect(tierFromScore(85)).toBe('S');
    expect(tierFromScore(75)).toBe('A');
    expect(tierFromScore(65)).toBe('B');
    expect(tierFromScore(50)).toBe('C');
    expect(tierFromScore(30)).toBe('D');
  });
});

describe('schema validation', () => {
  const merged = mergePokemon(buildMergeInputs());

  it('canonical Pokémon pass the Zod schema', () => {
    for (const p of merged) {
      const result = pokemonSchema.safeParse(p);
      expect(result.success).toBe(true);
    }
  });

  it('scored Pokémon pass the scored schema', () => {
    for (const p of scoreAll(merged)) {
      const result = scoredPokemonSchema.safeParse(p);
      expect(result.success).toBe(true);
    }
  });

  it('fails on invalid type tuples', () => {
    const merged: Pokemon[] = mergePokemon(buildMergeInputs());
    const bad = { ...merged[0]!, types: ['grass', 'poison', 'fire'] as never };
    expect(pokemonSchema.safeParse(bad).success).toBe(false);
  });
});
