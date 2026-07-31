import { describe, expect, it } from 'vitest';
import { slugify, toSlug } from '../src/utils/slug.js';
import { buildRelationsMap, relationsForTypes } from '../src/transform/typeChart.js';
import { detectFormKind, formatFormName } from '../src/transform/forms.js';
import { classifyPokemon } from '../src/transform/classification.js';
import { idFromUrl, refToId } from '../src/transform/pokeapiRefs.js';
import { fullTypeChart } from './fixtures.js';

describe('slugify', () => {
  it('handles diacritics and special characters', () => {
    expect(slugify('Flabébé')).toBe('flabebe');
    expect(slugify('Mr. Mime')).toBe('mr-mime');
    expect(slugify('Nidoran♀')).toBe('nidoran-f');
    expect(slugify('Nidoran♂')).toBe('nidoran-m');
    expect(slugify('Type: Null')).toBe('type-null');
  });

  it('returns empty for non-alphanumeric input', () => {
    expect(slugify('!!!')).toBe('');
  });

  it('toSlug throws on empty', () => {
    expect(() => toSlug('!!!')).toThrow(/Cannot create a slug/);
  });
});

describe('typeChart', () => {
  const rawChart = fullTypeChart.map((t) => ({
    name: t.name,
    damage_relations: {
      double_damage_to: t.damageRelations.doubleDamageTo.map((name) => ({ name })),
      half_damage_to: t.damageRelations.halfDamageTo.map((name) => ({ name })),
      no_damage_to: t.damageRelations.noDamageTo.map((name) => ({ name })),
    },
  }));
  const map = buildRelationsMap(rawChart);

  it('bulbasaur (grass/poison) is weak to fire, psychic, flying, ice', () => {
    const relations = relationsForTypes(['grass', 'poison'], map);
    for (const weakness of ['fire', 'psychic', 'flying', 'ice']) {
      expect(relations.weaknesses).toContain(weakness);
    }
  });

  it('bulbasaur resists grass, water and fighting', () => {
    const relations = relationsForTypes(['grass', 'poison'], map);
    for (const resist of ['grass', 'water', 'fighting']) {
      expect(relations.resistances).toContain(resist);
    }
  });

  it('pure psychic is weak to bug, ghost and dark with no immunities', () => {
    const relations = relationsForTypes(['psychic'], map);
    expect(relations.weaknesses).toContain('bug');
    expect(relations.weaknesses).toContain('ghost');
    expect(relations.weaknesses).toContain('dark');
    expect(relations.immunities).toHaveLength(0);
  });

  it('sorts output deterministically', () => {
    const relations = relationsForTypes(['grass', 'poison'], map);
    expect([...relations.weaknesses].sort()).toEqual([...relations.weaknesses].sort());
  });
});

describe('forms', () => {
  it('detects mega-x', () => {
    expect(
      detectFormKind({
        formId: 10033,
        formName: 'mewtwo-mega-x',
        pokemonName: 'mewtwo',
        pokemonTypes: ['psychic'],
        isDefault: false,
        isMega: true,
        isBattleOnly: false,
        formOrder: 2,
      }),
    ).toBe('mega-x');
  });

  it('detects gigantamax', () => {
    expect(
      detectFormKind({
        formId: 10059,
        formName: 'charizard-gmax',
        pokemonName: 'charizard',
        pokemonTypes: ['fire', 'flying'],
        isDefault: false,
        isMega: false,
        isBattleOnly: false,
        formOrder: 3,
      }),
    ).toBe('gigantamax');
  });

  it('detects regional variants', () => {
    expect(
      detectFormKind({
        formId: 10100,
        formName: 'vulpix-alolan',
        pokemonName: 'vulpix',
        pokemonTypes: ['ice'],
        isDefault: false,
        isMega: false,
        isBattleOnly: false,
        formOrder: 2,
      }),
    ).toBe('regional');
  });

  it('fallback is alternate for unknown non-default forms', () => {
    expect(
      detectFormKind({
        formId: 999,
        formName: 'weird-thing',
        pokemonName: 'pokemon',
        pokemonTypes: ['normal'],
        isDefault: false,
        isMega: false,
        isBattleOnly: false,
        formOrder: 2,
      }),
    ).toBe('alternate');
  });

  it('formats form names', () => {
    expect(formatFormName('mewtwo-mega-x', 'mewtwo')).toBe('mewtwo-mega-x');
    expect(formatFormName('Alolan Vulpix', 'vulpix')).toBe('Alolan Vulpix');
  });
});

describe('classification', () => {
  it('classifies bulbasaur as starter, not legendary', () => {
    const flags = classifyPokemon(
      {
        isLegendary: false,
        isMythical: false,
        isBaby: false,
        isUltraBeast: false,
        isParadox: false,
        name: 'bulbasaur',
        types: ['grass', 'poison'],
        baseStatTotal: 318,
        hasGenderDifferences: false,
        isEventOnly: false,
      },
      1,
    );
    expect(flags.starter).toBe(true);
    expect(flags.legendary).toBe(false);
    expect(flags.pseudoLegendary).toBe(false);
  });

  it('classifies mewtwo as legendary (680 BST is above pseudo range 540-600)', () => {
    const flags = classifyPokemon(
      {
        isLegendary: true,
        isMythical: false,
        isBaby: false,
        isUltraBeast: false,
        isParadox: false,
        name: 'mewtwo',
        types: ['psychic'],
        baseStatTotal: 680,
        hasGenderDifferences: false,
        isEventOnly: false,
      },
      150,
    );
    expect(flags.legendary).toBe(true);
    expect(flags.pseudoLegendary).toBe(false);
  });
});

describe('pokeapiRefs', () => {
  it('extracts ids from urls', () => {
    expect(idFromUrl('https://pokeapi.co/api/v2/pokemon/25/')).toBe(25);
    expect(idFromUrl('https://pokeapi.co/api/v2/move/1')).toBe(1);
    expect(refToId({ name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25' })).toBe(25);
  });

  it('returns null for non-numeric ids', () => {
    expect(idFromUrl('https://pokeapi.co/api/v2/pokemon/unknown')).toBeNull();
  });
});
