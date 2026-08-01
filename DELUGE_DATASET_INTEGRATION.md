# Deluge Companion Pokémon Dataset Integration Guide

This document provides complete instructions, data schemas, API specifications, and code snippets for integrating the generated Pokémon database into the **Deluge Companion Chrome Extension**.

---

## 1. Overview & Key Principles

- **Independent Dataset**: The Pokémon database generator operates independently of the Chrome Extension.
- **Zero Public API Dependencies**: The extension must **never** communicate with public Pokémon APIs (e.g. PokéAPI) during gameplay.
- **One-Time Local Sync**: The extension checks `version.json`, downloads `pokemon-db.json.gz` once when a new version is published, decompresses it, and persists the dataset locally in **IndexedDB**.
- **CORS Enabled**: All endpoints set `Access-Control-Allow-Origin: *` and appropriate caching headers (`max-age=3600`).

---

## 2. Live Host & Endpoint URLs

| Resource | Public URL | Description |
| :--- | :--- | :--- |
| **Version File** | `https://dataset-for-deluge.vercel.app/version.json` | Extension queries this to detect updates and verify SHA-256 checksums |
| **Metadata File** | `https://dataset-for-deluge.vercel.app/metadata.json` | Detailed metadata (Pokémon count, generator version, timestamp) |
| **Compressed Database** | `https://dataset-for-deluge.vercel.app/pokemon-db.json.gz` | Primary database file downloaded and decompressed by the extension |
| **Uncompressed Database** | `https://dataset-for-deluge.vercel.app/pokemon-db.json` | Raw JSON database (fallback option) |

---

## 3. Data Schemas & Types

### 3.1 Version File (`version.json`)

```typescript
export interface VersionFile {
  version: string;        // e.g. "1.0.0"
  checksum: string;       // SHA-256 hex string of pokemon-db.json
  downloadURL: string;    // Direct URL to pokemon-db.json.gz
}
```

Example JSON response:
```json
{
  "version": "1.0.0",
  "checksum": "a98678fb10ad92e7a7495ab3af8d9f374f8243b3a6656b17b021b46962f1c1c1",
  "downloadURL": "https://dataset-for-deluge.vercel.app/pokemon-db.json.gz"
}
```

---

### 3.2 Main Database (`pokemon-db.json.gz` decompressed)

```typescript
export interface PokemonDb {
  version: string;
  pokemonCount: number;
  pokemon: ScoredPokemon[];
}

export type TierLevel = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';

export interface Recommendation {
  overallScore: number;   // 0 - 100
  tier: TierLevel;        // S+, S, A, B, C, D
  recommended: boolean;   // true if overallScore >= 70
  reason: string;         // Human-readable rationale
}

export interface DelugeFields {
  recommendation: Recommendation;
  baseScore: number;       // 0 - 100
  collectorScore: number;  // 0 - 100
  moneyScore: number;      // 0 - 100
  tradeScore: number;      // 0 - 100
  teamScore: number;       // 0 - 100
  rarityScore: number;     // 0 - 100
  futurePotential: number; // 0 - 100
}

export interface ScoredPokemon extends DelugeFields {
  id: number;
  name: string;
  slug: string;
  generation: number;
  types: [string] | [string, string];
  forms: Array<{
    id: number;
    name: string;
    kind: 'default' | 'mega' | 'mega-x' | 'mega-y' | 'gigantamax' | 'regional' | 'alternate' | 'battle' | 'seasonal' | 'cosmetic';
    isDefault: boolean;
    sprite: string | null;
  }>;
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    'special-attack': number;
    'special-defense': number;
    speed: number;
    total: number;
  };
  height: number;
  weight: number;
  abilities: Array<{ id: number; name: string; isHidden: boolean }>;
  hiddenAbility: string | null;
  evolutionChain: {
    id: number;
    chain: Array<{
      id: number;
      name: string;
      requirement: { method: string; detail: string };
    }>;
  } | null;
  legendary: boolean;
  mythical: boolean;
  baby: boolean;
  starter: boolean;
  pseudoLegendary: boolean;
  ultraBeast: boolean;
  paradox: boolean;
  fossil: boolean;
  eventOnly: boolean;
  megaEvolution: boolean;
  gigantamax: boolean;
  regionalVariant: boolean;
  moves: {
    levelUp: Array<Move>;
    machine: Array<Move>;
    tutor: Array<Move>;
    egg: Array<Move>;
    other: Array<Move>;
  };
  sprite: string | null;
  officialArtwork: string | null;
  typesDefense: {
    weaknesses: string[];
    resistances: string[];
    immunities: string[];
  };
  flavorText: { text: string; version: string } | null;
  baseExperience: number | null;
  captureRate: number | null;
  growthRate: string | null;
  hatchSteps: number | null;
  eggGroups: string[] | null;
  color: string | null;
  shape: string | null;
  habitat: string | null;
  category: string | null;
}

export interface Move {
  id: number;
  name: string;
  type: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  damageClass: string;
}
```

---

## 4. Extension Synchronization Implementation

Below is a production-ready Service Worker module for downloading, decompressing, and storing the dataset in IndexedDB.

### 4.1 Sync Implementation (`datasetSync.ts`)

```typescript
const VERSION_URL = 'https://dataset-for-deluge.vercel.app/version.json';
const LOCAL_VERSION_KEY = 'deluge_db_version';
const LOCAL_CHECKSUM_KEY = 'deluge_db_checksum';

export interface VersionResponse {
  version: string;
  checksum: string;
  downloadURL: string;
}

/**
 * Checks if a new dataset version is available.
 */
export async function checkForDatabaseUpdate(): Promise<boolean> {
  try {
    const res = await fetch(VERSION_URL);
    if (!res.ok) return false;
    const remote: VersionResponse = await res.json();

    const localChecksum = localStorage.getItem(LOCAL_CHECKSUM_KEY);
    return localChecksum !== remote.checksum;
  } catch (error) {
    console.error('[Deluge Sync] Error checking database version:', error);
    return false;
  }
}

/**
 * Downloads pokemon-db.json.gz, decompresses using DecompressionStream, and parses JSON.
 */
export async function downloadAndDecompressDatabase(downloadURL: string): Promise<ScoredPokemon[]> {
  const response = await fetch(downloadURL);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download database: HTTP ${response.status}`);
  }

  // Use native Web Stream DecompressionStream for fast gzip decompression
  const decompressedStream = response.body.pipeThrough(new DecompressionStream('gzip'));
  const decompressedResponse = new Response(decompressedStream);
  const jsonText = await decompressedResponse.text();
  const parsed = JSON.parse(jsonText);

  return parsed.pokemon as ScoredPokemon[];
}

/**
 * Full sync workflow: Check -> Download -> Update IndexedDB.
 */
export async function syncDatasetWithIndexedDB(db: IDBDatabase): Promise<boolean> {
  const res = await fetch(VERSION_URL);
  if (!res.ok) return false;
  const remote: VersionResponse = await res.json();

  const localChecksum = localStorage.getItem(LOCAL_CHECKSUM_KEY);
  if (localChecksum === remote.checksum) {
    console.log('[Deluge Sync] Database is up to date (checksum match).');
    return false;
  }

  console.log(`[Deluge Sync] Updating database to v${remote.version}…`);
  const pokemonList = await downloadAndDecompressDatabase(remote.downloadURL);

  // Store in IndexedDB inside a transaction
  const tx = db.transaction('pokemon', 'readwrite');
  const store = tx.objectStore('pokemon');
  await store.clear();

  for (const pokemon of pokemonList) {
    store.put(pokemon);
  }

  localStorage.setItem(LOCAL_VERSION_KEY, remote.version);
  localStorage.setItem(LOCAL_CHECKSUM_KEY, remote.checksum);
  console.log(`[Deluge Sync] Successfully updated ${pokemonList.length} Pokémon in IndexedDB.`);
  return true;
}
```

---

## 5. IndexedDB Query Example

Once stored in IndexedDB, look up any Pokémon by **ID** or **Slug** instantaneously:

```typescript
// Query by Pokédex ID
export async function getPokemonById(db: IDBDatabase, id: number): Promise<ScoredPokemon | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pokemon', 'readonly');
    const store = tx.objectStore('pokemon');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

// Example recommendation check
const charizard = await getPokemonById(db, 6);
if (charizard) {
  console.log(`Charizard Tier: ${charizard.tier}`); // "S"
  console.log(`Overall Score: ${charizard.overallScore}`); // 88
  console.log(`Recommendation: ${charizard.recommendation.reason}`);
}
```

---

## 6. Standalone Files (Optional)

If the extension only requires specific subsets of data instead of the full database:

- `https://dataset-for-deluge.vercel.app/pokemon.json` — Core Pokémon list
- `https://dataset-for-deluge.vercel.app/recommendations.json` — Recommendation & scoring fields only
- `https://dataset-for-deluge.vercel.app/evolutions.json` — Evolution chains
- `https://dataset-for-deluge.vercel.app/forms.json` — Alternate forms
