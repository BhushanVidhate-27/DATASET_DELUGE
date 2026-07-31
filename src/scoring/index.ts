import { SCORED_DIR, SCORED_POKEMON_PATH, MERGED_POKEMON_PATH } from '../utils/paths.js';
import { ensureDir, readJson, writeJson } from '../utils/fs.js';
import { logger } from '../utils/logger.js';
import type { Pokemon, ScoredPokemon, TierLevel } from '../validators/schema.js';

/**
 * Step 5 of the pipeline: runs the Deluge Companion scoring pass.
 *
 * This pass adds the custom `recommendation`, base/collector/money/trade/team/
 * rarity/futurePotential scores. It never modifies canonical Pokémon data.
 */
export async function runScoreStage(): Promise<void> {
  logger.step('Score', 'Generating Deluge Companion recommendation fields…');

  const pokemon = await readJson<Pokemon[]>(MERGED_POKEMON_PATH);
  const scored = scoreAll(pokemon);

  await ensureDir(SCORED_DIR);
  await writeJson(SCORED_POKEMON_PATH, scored);

  logger.success(`Scored ${scored.length} Pokémon into ${SCORED_POKEMON_PATH}`);
}

/**
 * Pure scoring function (testable without touching disk).
 */
export function scoreAll(pokemon: readonly Pokemon[]): ScoredPokemon[] {
  return pokemon.map((p) => scoreOne(p));
}

/**
 * Scores a single Pokémon deterministically.
 */
export function scoreOne(p: Pokemon): ScoredPokemon {
  const baseScore = computeBaseScore(p);
  const teamScore = computeTeamScore(p, baseScore);
  const collectorScore = computeCollectorScore(p);
  const rarityScore = computeRarityScore(p);
  const moneyScore = computeMoneyScore(p, rarityScore, collectorScore);
  const tradeScore = computeTradeScore(p, rarityScore);
  const futurePotential = computeFuturePotential(p);

  const recommendation = buildRecommendation(p, {
    baseScore,
    teamScore,
    collectorScore,
    moneyScore,
    tradeScore,
    rarityScore,
    futurePotential,
  });

  return {
    ...p,
    baseScore,
    collectorScore,
    moneyScore,
    tradeScore,
    teamScore,
    rarityScore,
    futurePotential,
    recommendation,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component scores
// ─────────────────────────────────────────────────────────────────────────────

function computeBaseScore(p: Pokemon): number {
  const bst = p.baseStats.total;
  const statScore = Math.min(100, Math.round((bst / 600) * 100));
  const defensiveScore = Math.min(
    60,
    p.typesDefense.resistances.length * 5 + p.typesDefense.immunities.length * 10,
  );
  return clamp(Math.round(statScore * 0.8 + defensiveScore * 0.2));
}

function computeTeamScore(p: Pokemon, baseScore: number): number {
  const stats = p.baseStats;
  const values = [
    stats.hp,
    stats.attack,
    stats.defense,
    stats['special-attack'],
    stats['special-defense'],
    stats.speed,
  ];
  const avg = stats.total / 6;
  const variance = values.reduce((sum, v) => sum + (v - avg) * (v - avg), 0) / 6;
  const spreadPenalty = Math.min(25, Math.round(Math.sqrt(variance) / 4));

  const offense = Math.max(stats.attack, stats['special-attack']);
  const defense = stats.defense + stats['special-defense'];
  const speed = stats.speed;

  let score = baseScore - spreadPenalty;
  if (defense >= 180) score += 5;
  if (speed >= 100) score += 5;
  if (offense >= 100) score += 5;
  if (p.typesDefense.immunities.length > 0) score += 5;

  return clamp(Math.round(score));
}

function computeCollectorScore(p: Pokemon): number {
  let score = 30;
  if (p.legendary) score += 25;
  if (p.mythical) score += 30;
  if (p.ultraBeast) score += 20;
  if (p.paradox) score += 18;
  if (p.starter) score += 12;
  if (p.baby) score += 5;
  if (p.fossil) score += 8;
  if (p.eventOnly) score += 10;
  if (p.megaEvolution) score += 15;
  if (p.gigantamax) score += 15;
  if (p.regionalVariant) score += 10;
  if (p.forms.length > 1) score += Math.min(10, p.forms.length);

  return clamp(Math.round(score));
}

function computeRarityScore(p: Pokemon): number {
  let score = 15;
  if (p.legendary) score = 90;
  else if (p.mythical) score = 95;
  else if (p.ultraBeast) score = 85;
  else if (p.paradox) score = 75;
  else if (p.pseudoLegendary) score = 70;
  else if (p.fossil) score = 55;
  else if (p.eventOnly) score = 60;
  else if (p.megaEvolution || p.gigantamax) score = 50;
  else if (p.regionalVariant) score = 40;
  else if (p.starter) score = 35;
  else if (p.baby) score = 25;

  return clamp(Math.round(score));
}

function computeMoneyScore(p: Pokemon, rarityScore: number, collectorScore: number): number {
  const value = Math.round(
    rarityScore * 0.6 + collectorScore * 0.25 + (p.forms.length > 1 ? 10 : 0),
  );
  return clamp(value);
}

function computeTradeScore(p: Pokemon, rarityScore: number): number {
  let score = rarityScore;
  if (p.legendary || p.mythical) score += 10;
  if (p.hiddenAbility) score += 5;
  if (p.eventOnly) score += 8;
  return clamp(score);
}

function computeFuturePotential(p: Pokemon): number {
  let score = 40;
  if (p.paradox) score += 30;
  if (p.legendary || p.mythical) score += 15;
  if (p.pseudoLegendary) score += 15;
  if (p.baseStats.total >= 500) score += 10;
  if (p.megaEvolution || p.gigantamax) score += 10;
  if (p.regionalVariant) score += 5;
  if (p.generation >= 8) score += 5;
  return clamp(score);
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendation
// ─────────────────────────────────────────────────────────────────────────────

interface ComponentScores {
  baseScore: number;
  teamScore: number;
  collectorScore: number;
  moneyScore: number;
  tradeScore: number;
  rarityScore: number;
  futurePotential: number;
}

function buildRecommendation(p: Pokemon, s: ComponentScores): ScoredPokemon['recommendation'] {
  const overall = Math.round(
    s.teamScore * 0.4 +
      s.baseScore * 0.15 +
      s.collectorScore * 0.15 +
      s.rarityScore * 0.15 +
      s.futurePotential * 0.1 +
      s.tradeScore * 0.05,
  );

  const tier = tierFromScore(overall);
  const recommended = overall >= 70;

  return {
    overallScore: clamp(overall),
    tier,
    recommended,
    reason: buildReason(p, overall, tier),
  };
}

export function tierFromScore(score: number): TierLevel {
  if (score >= 90) return 'S+';
  if (score >= 80) return 'S';
  if (score >= 70) return 'A';
  if (score >= 60) return 'B';
  if (score >= 45) return 'C';
  return 'D';
}

function buildReason(p: Pokemon, overall: number, tier: TierLevel): string {
  const parts: string[] = [];
  if (p.legendary || p.mythical) {
    parts.push('elite legendary/mythical status');
  } else if (tier === 'S+' || tier === 'S') {
    parts.push('strong competitive stats');
  } else if (tier === 'A') {
    parts.push('solid stats and utility');
  } else if (tier === 'B') {
    parts.push('decent all-rounder');
  } else {
    parts.push('niche or low-tier presence');
  }

  if (p.baseStats.total >= 500) {
    parts.push('high base stat total');
  }
  if (p.typesDefense.immunities.length > 0) {
    parts.push('useful type immunities');
  }
  if (p.starter) {
    parts.push('iconic starter');
  }
  if (p.fossil || p.megaEvolution || p.gigantamax) {
    parts.push('strong collector value');
  }
  if (p.eventOnly) {
    parts.push('event-exclusive');
  }

  return parts
    .slice(0, 3)
    .map((part, i) => (i === 0 ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join('. ')
    .concat(` (${overall} overall, ${tier})`);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
