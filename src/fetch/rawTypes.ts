/**
 * Strict TypeScript views of the PokéAPI v2 JSON payloads that this pipeline
 * consumes. Only the fields the merge stage needs are modelled.
 */

export interface RawNamedRef {
  name: string;
  url: string;
}

export interface RawPokemon {
  id: number;
  name: string;
  base_experience: number | null;
  height: number;
  weight: number;
  is_default: boolean;
  abilities: Array<{
    ability: RawNamedRef;
    is_hidden: boolean;
    slot: number;
  }>;
  forms: RawNamedRef[];
  moves: Array<{
    move: RawNamedRef;
    version_group_details: Array<{
      level_learned_at: number;
      move_learn_method: RawNamedRef;
      version_group: RawNamedRef;
    }>;
  }>;
  sprites: {
    front_default: string | null;
    other?: {
      'official-artwork'?: {
        front_default: string | null;
      };
    };
  };
  stats: Array<{
    base_stat: number;
    effort: number;
    stat: RawNamedRef;
  }>;
  types: Array<{
    slot: number;
    type: RawNamedRef;
  }>;
}

export interface RawSpecies {
  id: number;
  name: string;
  is_baby: boolean;
  is_legendary: boolean;
  is_mythical: boolean;
  is_default: boolean;
  generation: RawNamedRef;
  names: Array<{ language: RawNamedRef; name: string }>;
  flavor_text_entries: Array<{
    flavor_text: string;
    language: RawNamedRef;
    version: RawNamedRef;
  }>;
  evolution_chain: { url: string };
  capture_rate: number;
  hatch_counter: number | null;
  gender_rate: number;
  egg_groups: Array<RawNamedRef>;
  color: RawNamedRef | null;
  shape: RawNamedRef | null;
  habitat: RawNamedRef | null;
  growth_rate: RawNamedRef;
  genera: Array<{ genus: string; language: RawNamedRef }>;
  forms_switchable?: boolean;
  has_gender_differences?: boolean;
}

export interface RawEvolutionChain {
  id: number;
  chain: RawChainLink;
}

export interface RawChainLink {
  is_baby: boolean;
  species: RawNamedRef;
  evolution_details: Array<{
    item: RawNamedRef | null;
    trigger: RawNamedRef;
    min_level: number | null;
    min_happiness: number | null;
    min_beauty: number | null;
    time_of_day: string;
    gender: number | null;
    location: RawNamedRef | null;
    held_item: RawNamedRef | null;
    known_move: RawNamedRef | null;
    known_move_type: RawNamedRef | null;
    needs_overworld_rain: boolean;
    party_species: RawNamedRef | null;
    party_type: RawNamedRef | null;
    trade_species: RawNamedRef | null;
    turn_upside_down?: boolean;
  }>;
  evolves_to: RawChainLink[];
}

export interface RawType {
  id: number;
  name: string;
  damage_relations?: {
    double_damage_to?: RawNamedRef[];
    half_damage_to?: RawNamedRef[];
    no_damage_to?: RawNamedRef[];
  };
}

export interface RawMove {
  id: number;
  name: string;
  type: RawNamedRef;
  power: number | null;
  pp: number | null;
  accuracy: number | null;
  damage_class: RawNamedRef;
}

export interface RawAbility {
  id: number;
  name: string;
  is_main_series: boolean;
}

export interface RawForm {
  id: number;
  name: string;
  form_name: string;
  is_default: boolean;
  is_mega: boolean;
  is_battle_only: boolean;
  form_order: number;
  pokemon: RawNamedRef;
  sprites: {
    front_default: string | null;
  };
  types: Array<{ slot: number; type: RawNamedRef }>;
}

export interface RawGeneration {
  id: number;
  name: string;
  pokemon_species: RawNamedRef[];
  main_region: RawNamedRef;
}
