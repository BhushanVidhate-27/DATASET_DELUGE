import { describe, expect, it } from 'vitest';
import { mergePokemon } from '../src/merge/index.js';
import { scoreAll } from '../src/scoring/index.js';
import { buildOutputFiles, delugeFieldsOf } from '../src/generators/index.js';
import { buildMetadata, buildVersionFile } from '../src/metadata/index.js';
import {
  evolutionFileSchema,
  formFileSchema,
  metadataSchema,
  pokemonFileSchema,
  recommendationFileSchema,
  scoredDbSchema,
  scoredPokemonSchema,
  versionFileSchema,
} from '../src/validators/schema.js';
import {
  buildMergeInputs,
  fixtureEvolutionChain1,
  fixturePokemon1,
  fixtureSpecies1,
} from './fixtures.js';

// ─────────────────────────────────────────────────────────────────────────────
// Merge regression tests
// ─────────────────────────────────────────────────────────────────────────────

describe('merge — empty evolution details', () => {
  it('produces a non-empty requirement.detail when evolution_details is empty', () => {
    const emptyDetailChain = {
      id: 1,
      chain: [
        {
          id: 2,
          name: 'ivysaur',
          isBaby: false,
          evolutionDetails: [] as never[],
          evolvesTo: [],
        },
      ],
    };

    const merged = mergePokemon(
      buildMergeInputs({
        pokemon: [fixturePokemon1],
        species: [fixtureSpecies1],
        evolutions: [emptyDetailChain],
      }),
    );

    const bulb = merged[0]!;
    expect(bulb.evolutionChain).not.toBeNull();
    const requirement = bulb.evolutionChain!.chain[0]!.requirement;
    expect(requirement.method.length).toBeGreaterThan(0);
    expect(requirement.detail.length).toBeGreaterThanOrEqual(1);
  });

  it('still describes normal level-up evolutions', () => {
    const merged = mergePokemon(
      buildMergeInputs({
        pokemon: [fixturePokemon1],
        species: [fixtureSpecies1],
        evolutions: [fixtureEvolutionChain1],
      }),
    );
    expect(merged[0]!.evolutionChain!.chain[0]!.requirement.detail).toContain('16');
  });

  it('handles evolution with empty trigger string gracefully', () => {
    const emptyTriggerChain = {
      id: 1,
      chain: [
        {
          id: 2,
          name: 'ivysaur',
          isBaby: false,
          evolutionDetails: [
            {
              trigger: '',
              minLevel: null,
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

    const merged = mergePokemon(
      buildMergeInputs({
        pokemon: [fixturePokemon1],
        species: [fixtureSpecies1],
        evolutions: [emptyTriggerChain],
      }),
    );

    const requirement = merged[0]!.evolutionChain!.chain[0]!.requirement;
    expect(requirement.detail.length).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Generator unit tests
// ─────────────────────────────────────────────────────────────────────────────

describe('generate — buildOutputFiles', () => {
  const scored = scoreAll(mergePokemon(buildMergeInputs()));

  it('builds schema-valid output payloads from scored fixtures', () => {
    const outputs = buildOutputFiles(scored, '1.0.0');

    expect(pokemonFileSchema.safeParse(outputs.pokemonFile).success).toBe(true);
    expect(recommendationFileSchema.safeParse(outputs.recommendationFile).success).toBe(true);
    expect(evolutionFileSchema.safeParse(outputs.evolutionFile).success).toBe(true);
    expect(formFileSchema.safeParse(outputs.formFile).success).toBe(true);
    expect(scoredDbSchema.safeParse(outputs.pokemonDb).success).toBe(true);

    expect(outputs.pokemonFile.pokemonCount).toBe(scored.length);
    expect(outputs.recommendationFile.recommendations[0]!.deluge).toEqual(
      delugeFieldsOf(scored[0]!),
    );
    expect(outputs.formFile.formCount).toBeGreaterThan(0);
  });

  it('sets the version on every output file', () => {
    const outputs = buildOutputFiles(scored, '2.3.4');
    expect(outputs.pokemonFile.version).toBe('2.3.4');
    expect(outputs.recommendationFile.version).toBe('2.3.4');
    expect(outputs.evolutionFile.version).toBe('2.3.4');
    expect(outputs.formFile.version).toBe('2.3.4');
    expect(outputs.pokemonDb.version).toBe('2.3.4');
  });

  it('counts match array lengths', () => {
    const outputs = buildOutputFiles(scored, '1.0.0');
    expect(outputs.pokemonFile.pokemonCount).toBe(outputs.pokemonFile.pokemon.length);
    expect(outputs.recommendationFile.recommendationCount).toBe(
      outputs.recommendationFile.recommendations.length,
    );
    expect(outputs.evolutionFile.chainCount).toBe(outputs.evolutionFile.chains.length);
    expect(outputs.formFile.formCount).toBe(outputs.formFile.forms.length);
    expect(outputs.pokemonDb.pokemonCount).toBe(outputs.pokemonDb.pokemon.length);
  });

  it('only includes Pokémon with non-null evolution chains in evolutions.json', () => {
    const outputs = buildOutputFiles(scored, '1.0.0');
    for (const chain of outputs.evolutionFile.chains) {
      expect(chain.evolutionChain).not.toBeNull();
    }
    const idsWithChains = new Set(outputs.evolutionFile.chains.map((c) => c.pokemonId));
    for (const p of scored) {
      if (p.evolutionChain !== null) {
        expect(idsWithChains.has(p.id)).toBe(true);
      }
    }
  });

  it('delugeFieldsOf extracts exactly the scoring fields', () => {
    const p = scored[0]!;
    const fields = delugeFieldsOf(p);
    expect(fields).toEqual({
      recommendation: p.recommendation,
      baseScore: p.baseScore,
      collectorScore: p.collectorScore,
      moneyScore: p.moneyScore,
      tradeScore: p.tradeScore,
      teamScore: p.teamScore,
      rarityScore: p.rarityScore,
      futurePotential: p.futurePotential,
    });
    // Should not include canonical fields
    expect((fields as Record<string, unknown>).id).toBeUndefined();
    expect((fields as Record<string, unknown>).name).toBeUndefined();
    expect((fields as Record<string, unknown>).types).toBeUndefined();
  });

  it('every scored Pokémon in the output passes the scored schema', () => {
    const outputs = buildOutputFiles(scored, '1.0.0');
    for (const p of outputs.pokemonFile.pokemon) {
      expect(scoredPokemonSchema.safeParse(p).success).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Metadata unit tests
// ─────────────────────────────────────────────────────────────────────────────

describe('metadata — builders', () => {
  const checksum = 'a'.repeat(64);

  it('builds schema-valid metadata', () => {
    const metadata = buildMetadata({
      version: '1.0.0',
      generatedAt: '2024-01-01T00:00:00.000Z',
      pokemonCount: 2,
      generatorVersion: '1.0.0',
      checksum,
      minExtensionVersion: '1.0.0',
    });
    expect(metadataSchema.safeParse(metadata).success).toBe(true);
  });

  it('builds downloadURL from DOWNLOAD_BASE_URL without a trailing slash', () => {
    const versionFile = buildVersionFile({
      version: '1.2.3',
      checksum,
      downloadBaseUrl: 'https://example.com/deluge-db/',
    });
    expect(versionFile.downloadURL).toBe('https://example.com/deluge-db/pokemon-db.json.gz');
    expect(versionFileSchema.safeParse(versionFile).success).toBe(true);
  });

  it('builds downloadURL from DOWNLOAD_BASE_URL with no trailing slash', () => {
    const versionFile = buildVersionFile({
      version: '1.2.3',
      checksum,
      downloadBaseUrl: 'https://cdn.example.com/db',
    });
    expect(versionFile.downloadURL).toBe('https://cdn.example.com/db/pokemon-db.json.gz');
  });

  it('rejects invalid checksum lengths via schema', () => {
    const metadata = buildMetadata({
      version: '1.0.0',
      generatedAt: '2024-01-01T00:00:00.000Z',
      pokemonCount: 1,
      generatorVersion: '1.0.0',
      checksum: 'not-a-sha256',
      minExtensionVersion: '1.0.0',
    });
    expect(metadataSchema.safeParse(metadata).success).toBe(false);
  });

  it('rejects non-hex checksums via schema', () => {
    const metadata = buildMetadata({
      version: '1.0.0',
      generatedAt: '2024-01-01T00:00:00.000Z',
      pokemonCount: 1,
      generatorVersion: '1.0.0',
      checksum: 'z'.repeat(64),
      minExtensionVersion: '1.0.0',
    });
    expect(metadataSchema.safeParse(metadata).success).toBe(false);
  });

  it('rejects invalid generatedAt timestamps via schema', () => {
    const metadata = buildMetadata({
      version: '1.0.0',
      generatedAt: 'not-a-date',
      pokemonCount: 1,
      generatorVersion: '1.0.0',
      checksum,
      minExtensionVersion: '1.0.0',
    });
    expect(metadataSchema.safeParse(metadata).success).toBe(false);
  });

  it('rejects empty version strings via schema', () => {
    const metadata = buildMetadata({
      version: '',
      generatedAt: '2024-01-01T00:00:00.000Z',
      pokemonCount: 1,
      generatorVersion: '1.0.0',
      checksum,
      minExtensionVersion: '1.0.0',
    });
    expect(metadataSchema.safeParse(metadata).success).toBe(false);
  });

  it('rejects invalid downloadURLs via version schema', () => {
    const versionFile = buildVersionFile({
      version: '1.0.0',
      checksum,
      downloadBaseUrl: 'not-a-url',
    });
    expect(versionFileSchema.safeParse(versionFile).success).toBe(false);
  });

  it('rejects empty version in version.json via schema', () => {
    const versionFile = {
      version: '',
      checksum,
      downloadURL: 'https://example.com/deluge-db/pokemon-db.json.gz',
    };
    expect(versionFileSchema.safeParse(versionFile).success).toBe(false);
  });

  it('strips multiple trailing slashes from downloadBaseUrl', () => {
    const versionFile = buildVersionFile({
      version: '1.0.0',
      checksum,
      downloadBaseUrl: 'https://example.com/deluge-db///',
    });
    expect(versionFile.downloadURL).toBe('https://example.com/deluge-db/pokemon-db.json.gz');
  });
});
