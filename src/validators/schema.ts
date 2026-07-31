import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Shared enums / primitives
// ─────────────────────────────────────────────────────────────────────────────

export const RARITY_LEVELS = ['COMMON', 'UNCOMMON', 'RARE', 'VERY_RARE', 'LEGENDARY'] as const;
export type RarityLevel = (typeof RARITY_LEVELS)[number];

export const TIER_LEVELS = ['S+', 'S', 'A', 'B', 'C', 'D'] as const;
export type TierLevel = (typeof TIER_LEVELS)[number];

export const GENERATION_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export type GenerationNumber = (typeof GENERATION_NUMBERS)[number];

export const POKEMON_TYPES = [
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
] as const;
export type PokemonTypeName = (typeof POKEMON_TYPES)[number];

export const STAT_NAMES = [
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
] as const;
export type StatName = (typeof STAT_NAMES)[number];

export const FORM_KINDS = [
  'default',
  'mega',
  'mega-x',
  'mega-y',
  'gigantamax',
  'regional',
  'alternate',
  'battle',
  'seasonal',
  'cosmetic',
] as const;
export type FormKind = (typeof FORM_KINDS)[number];

export const MOVE_LEARN_METHODS = ['level-up', 'machine', 'tutor', 'egg', 'other'] as const;
export type MoveLearnMethod = (typeof MOVE_LEARN_METHODS)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Flavortext / detail schemas
// ─────────────────────────────────────────────────────────────────────────────

export const flavorTextSchema = z.object({
  text: z.string(),
  version: z.string(),
});

export const moveSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  type: z.string().min(1),
  power: z.number().int().min(0).nullable(),
  accuracy: z.number().int().min(0).max(100).nullable(),
  pp: z.number().int().min(0).nullable(),
  damageClass: z.string().min(1),
});
export type Move = z.infer<typeof moveSchema>;

export const abilitySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  isHidden: z.boolean(),
});
export type Ability = z.infer<typeof abilitySchema>;

export const evolutionRequirementSchema = z.object({
  method: z.string().min(1),
  detail: z.string().min(1),
});
export type EvolutionRequirement = z.infer<typeof evolutionRequirementSchema>;

export const evolutionStepSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  requirement: evolutionRequirementSchema,
});
export type EvolutionStep = z.infer<typeof evolutionStepSchema>;

export const evolutionChainSchema = z.object({
  id: z.number().int().positive(),
  chain: z.array(evolutionStepSchema),
});
export type EvolutionChain = z.infer<typeof evolutionChainSchema>;

export const pokemonFormSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  kind: z.enum(FORM_KINDS),
  isDefault: z.boolean(),
  sprite: z.string().nullable(),
});
export type PokemonForm = z.infer<typeof pokemonFormSchema>;

export const pokemonMovesSchema = z.object({
  levelUp: z.array(moveSchema),
  machine: z.array(moveSchema),
  tutor: z.array(moveSchema),
  egg: z.array(moveSchema),
  other: z.array(moveSchema),
});
export type PokemonMoves = z.infer<typeof pokemonMovesSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Full Pokémon model (canonical database)
// ─────────────────────────────────────────────────────────────────────────────

export const pokemonSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  slug: z.string().min(1),
  generation: z.number().int().min(1),
  types: z
    .tuple([z.enum(POKEMON_TYPES)])
    .or(z.tuple([z.enum(POKEMON_TYPES), z.enum(POKEMON_TYPES)])),
  forms: z.array(pokemonFormSchema),
  baseStats: z.object({
    hp: z.number().int().min(0),
    attack: z.number().int().min(0),
    defense: z.number().int().min(0),
    'special-attack': z.number().int().min(0),
    'special-defense': z.number().int().min(0),
    speed: z.number().int().min(0),
    total: z.number().int().min(0),
  }),
  height: z.number(),
  weight: z.number(),
  abilities: z.array(abilitySchema),
  hiddenAbility: z.string().nullable(),
  evolutionChain: evolutionChainSchema.nullable(),
  legendary: z.boolean(),
  mythical: z.boolean(),
  baby: z.boolean(),
  starter: z.boolean(),
  pseudoLegendary: z.boolean(),
  ultraBeast: z.boolean(),
  paradox: z.boolean(),
  fossil: z.boolean(),
  eventOnly: z.boolean(),
  megaEvolution: z.boolean(),
  gigantamax: z.boolean(),
  regionalVariant: z.boolean(),
  moves: pokemonMovesSchema,
  sprite: z.string().nullable(),
  officialArtwork: z.string().nullable(),
  typesDefense: z.object({
    weaknesses: z.array(z.enum(POKEMON_TYPES)),
    resistances: z.array(z.enum(POKEMON_TYPES)),
    immunities: z.array(z.enum(POKEMON_TYPES)),
  }),
  flavorText: flavorTextSchema.nullable(),
  baseExperience: z.number().int().min(0).nullable(),
  captureRate: z.number().int().min(0).nullable(),
  growthRate: z.string().nullable(),
  hatchSteps: z.number().int().min(0).nullable(),
  eggGroups: z.array(z.string()).nullable(),
  color: z.string().nullable(),
  shape: z.string().nullable(),
  habitat: z.string().nullable(),
  category: z.string().nullable(),
});
export type Pokemon = z.infer<typeof pokemonSchema>;

export const pokemonDbSchema = z.object({
  version: z.string().min(1),
  generatedAt: z.string().datetime(),
  pokemonCount: z.number().int().min(0),
  pokemon: z.array(pokemonSchema),
});
export type PokemonDb = z.infer<typeof pokemonDbSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Deluge Companion scoring fields (added by the scoring pass)
// ─────────────────────────────────────────────────────────────────────────────

export const recommendationSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  tier: z.enum(TIER_LEVELS),
  recommended: z.boolean(),
  reason: z.string().min(1),
});
export type Recommendation = z.infer<typeof recommendationSchema>;

export const delugeFieldsSchema = z.object({
  recommendation: recommendationSchema,
  baseScore: z.number().int().min(0).max(100),
  collectorScore: z.number().int().min(0).max(100),
  moneyScore: z.number().int().min(0).max(100),
  tradeScore: z.number().int().min(0).max(100),
  teamScore: z.number().int().min(0).max(100),
  rarityScore: z.number().int().min(0).max(100),
  futurePotential: z.number().int().min(0).max(100),
});
export type DelugeFields = z.infer<typeof delugeFieldsSchema>;

export const scoredPokemonSchema = z.intersection(pokemonSchema, delugeFieldsSchema);
export type ScoredPokemon = z.infer<typeof scoredPokemonSchema>;

export const scoredDbSchema = z.object({
  version: z.string().min(1),
  pokemonCount: z.number().int().min(0),
  pokemon: z.array(scoredPokemonSchema),
});
export type ScoredDb = z.infer<typeof scoredDbSchema>;

/** Schema for the intermediate scored model (array of ScoredPokemon). */
export const scoredPokemonListSchema = z.array(scoredPokemonSchema);
export type ScoredPokemonList = z.infer<typeof scoredPokemonListSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Output files
// ─────────────────────────────────────────────────────────────────────────────

export const pokemonFileSchema = z.object({
  version: z.string().min(1),
  pokemonCount: z.number().int().min(0),
  pokemon: z.array(scoredPokemonSchema),
});
export type PokemonFile = z.infer<typeof pokemonFileSchema>;

export const formFileSchema = z.object({
  version: z.string().min(1),
  formCount: z.number().int().min(0),
  forms: z.array(
    z.object({
      pokemonId: z.number().int().positive(),
      form: pokemonFormSchema,
    }),
  ),
});
export type FormFile = z.infer<typeof formFileSchema>;

export const evolutionFileSchema = z.object({
  version: z.string().min(1),
  chainCount: z.number().int().min(0),
  chains: z.array(
    z.object({
      pokemonId: z.number().int().positive(),
      evolutionChain: evolutionChainSchema,
    }),
  ),
});
export type EvolutionFile = z.infer<typeof evolutionFileSchema>;

export const recommendationFileSchema = z.object({
  version: z.string().min(1),
  recommendationCount: z.number().int().min(0),
  recommendations: z.array(
    z.object({
      pokemonId: z.number().int().positive(),
      deluge: delugeFieldsSchema,
    }),
  ),
});
export type RecommendationFile = z.infer<typeof recommendationFileSchema>;

export const metadataSchema = z.object({
  version: z.string().min(1),
  generatedAt: z.string().datetime(),
  pokemonCount: z.number().int().min(0),
  generatorVersion: z.string().min(1),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  minExtensionVersion: z.string().min(1),
});
export type Metadata = z.infer<typeof metadataSchema>;

export const versionFileSchema = z.object({
  version: z.string().min(1),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  downloadURL: z.string().url(),
});
export type VersionFile = z.infer<typeof versionFileSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Raw normalized resources
// ─────────────────────────────────────────────────────────────────────────────

export const normalizedRawResourceSchema = z.object({});
export type NormalizedRawResource = z.infer<typeof normalizedRawResourceSchema>;
