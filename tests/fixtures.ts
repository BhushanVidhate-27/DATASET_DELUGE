import type {
  NormalizedAbility,
  NormalizedEvolutionChain,
  NormalizedForm,
  NormalizedGeneration,
  NormalizedMove,
  NormalizedPokemon,
  NormalizedSpecies,
  NormalizedType,
} from '../src/normalize/index.js';
import type { MergeInputs } from '../src/merge/index.js';

export const fixturePokemon1: NormalizedPokemon = {
  id: 1,
  name: 'bulbasaur',
  slug: 'bulbasaur',
  isDefault: true,
  baseExperience: 64,
  height: 7,
  weight: 69,
  abilities: [
    { id: 65, name: 'overgrow', isHidden: false },
    { id: 34, name: 'chlorophyll', isHidden: true },
  ],
  forms: [1],
  moves: [
    { id: 33, levelLearnedAt: 1, method: 'level-up' },
    { id: 73, levelLearnedAt: 0, method: 'machine' },
  ],
  sprite: 'https://example.com/1.png',
  officialArtwork: 'https://example.com/1-art.png',
  stats: {
    hp: 45,
    attack: 49,
    defense: 49,
    'special-attack': 65,
    'special-defense': 65,
    speed: 45,
  },
  types: [
    { slot: 1, name: 'grass' },
    { slot: 2, name: 'poison' },
  ],
};

export const fixturePokemon2: NormalizedPokemon = {
  id: 150,
  name: 'mewtwo',
  slug: 'mewtwo',
  isDefault: true,
  baseExperience: 306,
  height: 20,
  weight: 1220,
  abilities: [{ id: 94, name: 'pressure', isHidden: false }],
  forms: [150],
  moves: [{ id: 94, levelLearnedAt: 1, method: 'level-up' }],
  sprite: 'https://example.com/150.png',
  officialArtwork: 'https://example.com/150-art.png',
  stats: {
    hp: 106,
    attack: 110,
    defense: 90,
    'special-attack': 154,
    'special-defense': 90,
    speed: 130,
  },
  types: [{ slot: 1, name: 'psychic' }],
};

export const fixtureSpecies1: NormalizedSpecies = {
  id: 1,
  name: 'bulbasaur',
  isBaby: false,
  isLegendary: false,
  isMythical: false,
  generationId: 1,
  flavorText: 'A strange seed was planted on its back at birth.',
  flavorVersion: 'red',
  evolutionChainId: 1,
  captureRate: 45,
  hatchCounter: 20,
  genderRate: 1,
  eggGroups: ['monster', 'grass'],
  color: 'green',
  shape: 'quadruped',
  habitat: 'grassland',
  growthRate: 'medium-slow',
  category: 'Seed Pokémon',
};

export const fixtureSpecies2: NormalizedSpecies = {
  id: 150,
  name: 'mewtwo',
  isBaby: false,
  isLegendary: true,
  isMythical: false,
  generationId: 1,
  flavorText: 'It was created by a scientist after years of horrific gene-splicing.',
  flavorVersion: 'red',
  evolutionChainId: null,
  captureRate: 3,
  hatchCounter: 120,
  genderRate: -1,
  eggGroups: ['undiscovered'],
  color: 'purple',
  shape: 'upright',
  habitat: 'rare',
  growthRate: 'slow',
  category: 'Genetic Pokémon',
};

export const fixtureForm1: NormalizedForm = {
  id: 1,
  name: 'bulbasaur',
  formName: 'bulbasaur',
  isDefault: true,
  isMega: false,
  isBattleOnly: false,
  formOrder: 1,
  pokemonId: 1,
  sprite: 'https://example.com/1.png',
};

export const fixtureForm150: NormalizedForm = {
  id: 150,
  name: 'mewtwo',
  formName: 'mewtwo',
  isDefault: true,
  isMega: false,
  isBattleOnly: false,
  formOrder: 1,
  pokemonId: 150,
  sprite: 'https://example.com/150.png',
};

export const fixtureMegaForm150: NormalizedForm = {
  id: 10033,
  name: 'mewtwo-mega-x',
  formName: 'mewtwo-mega-x',
  isDefault: false,
  isMega: true,
  isBattleOnly: false,
  formOrder: 2,
  pokemonId: 150,
  sprite: 'https://example.com/150-mega-x.png',
};

export const fixtureMoveTackle: NormalizedMove = {
  id: 33,
  name: 'tackle',
  type: 'normal',
  power: 40,
  accuracy: 100,
  pp: 35,
  damageClass: 'physical',
};

export const fixtureMovePsychic: NormalizedMove = {
  id: 94,
  name: 'psychic',
  type: 'psychic',
  power: 90,
  accuracy: 100,
  pp: 10,
  damageClass: 'special',
};

export const fixtureEvolutionChain1: NormalizedEvolutionChain = {
  id: 1,
  chain: [
    {
      id: 2,
      name: 'ivysaur',
      isBaby: false,
      evolutionDetails: [
        {
          trigger: 'level-up',
          minLevel: 16,
          item: null,
          heldItem: null,
          minHappiness: null,
          timeOfDay: '',
          location: null,
          knownMove: null,
          knownMoveType: null,
          needsOverworldRain: false,
          tradeSpecies: null,
        },
      ],
      evolvesTo: [],
    },
  ],
};

export const fixtureAbilityOvergrow: NormalizedAbility = {
  id: 65,
  name: 'overgrow',
  isMainSeries: true,
};
export const fixtureAbilityPressure: NormalizedAbility = {
  id: 94,
  name: 'pressure',
  isMainSeries: true,
};
export const fixtureAbilityChlorophyll: NormalizedAbility = {
  id: 34,
  name: 'chlorophyll',
  isMainSeries: true,
};

export const fixtureTypeGrass: NormalizedType = {
  id: 12,
  name: 'grass',
  damageRelations: {
    doubleDamageTo: ['ground', 'rock', 'water'],
    halfDamageTo: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'],
    noDamageTo: [],
  },
};

export const fixtureTypePoison: NormalizedType = {
  id: 4,
  name: 'poison',
  damageRelations: {
    doubleDamageTo: ['grass', 'fairy'],
    halfDamageTo: ['poison', 'ground', 'rock', 'ghost'],
    noDamageTo: ['steel'],
  },
};

export const fixtureTypePsychic: NormalizedType = {
  id: 14,
  name: 'psychic',
  damageRelations: {
    doubleDamageTo: ['fighting', 'poison'],
    halfDamageTo: ['psychic', 'steel'],
    noDamageTo: ['dark'],
  },
};

/**
 * The complete 18-type attacking chart (as of Gen 9), modeled after the raw
 * PokeAPI damage relations. Used to compute real defensive type charts in tests.
 */
interface RawTypeFixture {
  name: string;
  double: string[];
  half: string[];
  no: string[];
}

const FULL_TYPE_CHART: RawTypeFixture[] = [
  { name: 'normal', double: [], half: ['rock', 'steel'], no: ['ghost'] },
  {
    name: 'fire',
    double: ['grass', 'ice', 'bug', 'steel'],
    half: ['fire', 'water', 'rock', 'dragon'],
    no: [],
  },
  { name: 'water', double: ['fire', 'ground', 'rock'], half: ['water', 'grass', 'dragon'], no: [] },
  {
    name: 'electric',
    double: ['water', 'flying'],
    half: ['electric', 'grass', 'dragon'],
    no: ['ground'],
  },
  {
    name: 'grass',
    double: ['ground', 'rock', 'water'],
    half: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'],
    no: [],
  },
  {
    name: 'ice',
    double: ['grass', 'ground', 'flying', 'dragon'],
    half: ['fire', 'water', 'ice', 'steel'],
    no: [],
  },
  {
    name: 'fighting',
    double: ['normal', 'ice', 'rock', 'dark', 'steel'],
    half: ['poison', 'flying', 'psychic', 'bug', 'fairy'],
    no: ['ghost'],
  },
  {
    name: 'poison',
    double: ['grass', 'fairy'],
    half: ['poison', 'ground', 'rock', 'ghost'],
    no: ['steel'],
  },
  {
    name: 'ground',
    double: ['fire', 'electric', 'poison', 'rock', 'steel'],
    half: ['grass', 'bug'],
    no: ['flying'],
  },
  {
    name: 'flying',
    double: ['grass', 'fighting', 'bug'],
    half: ['electric', 'rock', 'steel'],
    no: [],
  },
  { name: 'psychic', double: ['fighting', 'poison'], half: ['psychic', 'steel'], no: ['dark'] },
  {
    name: 'bug',
    double: ['grass', 'psychic', 'dark'],
    half: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'],
    no: [],
  },
  {
    name: 'rock',
    double: ['fire', 'ice', 'flying', 'bug'],
    half: ['fighting', 'ground', 'steel'],
    no: [],
  },
  { name: 'ghost', double: ['psychic', 'ghost'], half: ['dark'], no: ['normal'] },
  { name: 'dragon', double: ['dragon'], half: ['steel'], no: ['fairy'] },
  { name: 'dark', double: ['psychic', 'ghost'], half: ['fighting', 'dark', 'fairy'], no: [] },
  {
    name: 'steel',
    double: ['ice', 'rock', 'fairy'],
    half: ['fire', 'water', 'electric', 'steel'],
    no: ['poison'],
  },
  {
    name: 'fairy',
    double: ['fighting', 'dragon', 'dark'],
    half: ['fire', 'poison', 'steel'],
    no: [],
  },
];

/** NormalizedType[] covering all 18 types with damage relations. */
export const fullTypeChart: NormalizedType[] = FULL_TYPE_CHART.map((t, index) => ({
  id: index + 1,
  name: t.name,
  damageRelations: {
    doubleDamageTo: t.double,
    halfDamageTo: t.half,
    noDamageTo: t.no,
  },
}));

export const fixtureGeneration1: NormalizedGeneration = {
  id: 1,
  name: 'generation-i',
  pokemonSpeciesIds: [1, 2, 3, 150],
};

export function buildMergeInputs(overrides: Partial<MergeInputs> = {}): MergeInputs {
  return {
    pokemon: [fixturePokemon1, fixturePokemon2],
    species: [fixtureSpecies1, fixtureSpecies2],
    forms: [fixtureForm1, fixtureForm150, fixtureMegaForm150],
    moves: [fixtureMoveTackle, fixtureMovePsychic],
    evolutions: [fixtureEvolutionChain1],
    abilities: [fixtureAbilityOvergrow, fixtureAbilityPressure, fixtureAbilityChlorophyll],
    types: fullTypeChart,
    generations: [fixtureGeneration1],
    ...overrides,
  };
}
