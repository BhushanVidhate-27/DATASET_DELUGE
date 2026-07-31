# Deluge Companion — Dataset Generator

Generates the optimized, versioned Pokémon database consumed by the **Deluge Companion** Chrome extension.

This project is **completely independent** from the extension:

- The dataset generator is the **only** component that talks to public Pokémon data sources.
- The extension **never** contacts public Pokémon APIs.
- The extension downloads `pokemon-db.json` (or `.gz`) once, validates it, and stores it in IndexedDB.

---

## Pipeline

Every stage is independent, ordered, and individually runnable:

```
Fetch
  ↓
Normalize
  ↓
Merge
  ↓
Score (Deluge Companion fields)
  ↓
Validate
  ↓
Generate output files
  ↓
Compress
  ↓
Metadata
```

`pnpm build-db` runs the complete pipeline in this exact order.

### Stage handoffs

To keep every stage independent, each stage writes its output to the `intermediate/` folder:

| Stage     | Input                              | Output                                    |
| --------- | ---------------------------------- | ----------------------------------------- |
| fetch     | Public Pokémon API                 | `raw/`                                    |
| normalize | `raw/`                             | `intermediate/normalized/`                |
| merge     | `intermediate/normalized/`         | `intermediate/merged/pokemon.json`        |
| score     | `intermediate/merged/pokemon.json` | `intermediate/scored/pokemon.json`        |
| validate  | `intermediate/scored/pokemon.json` | (fails fast on invalid data)              |
| generate  | `intermediate/scored/pokemon.json` | `generated/*.json`                        |
| compress  | `generated/pokemon-db.json`        | `generated/pokemon-db.json.gz`            |
| metadata  | `generated/`                       | `generated/metadata.json`, `version.json` |

---

## Scripts

| Script           | Description                                        |
| ---------------- | -------------------------------------------------- |
| `pnpm fetch`     | Downloads latest raw data from the public source.  |
| `pnpm normalize` | Normalizes raw data.                               |
| `pnpm merge`     | Combines datasets into one complete Pokémon model. |
| `pnpm score`     | Generates Deluge Companion recommendation fields.  |
| `pnpm validate`  | Runs Zod validation. Fails on invalid data.        |
| `pnpm generate`  | Creates final JSON files.                          |
| `pnpm compress`  | Generates gzip output.                             |
| `pnpm metadata`  | Generates metadata + version files.                |
| `pnpm build-db`  | Runs the complete pipeline.                        |
| `pnpm test`      | Runs the test suite (Vitest).                      |
| `pnpm typecheck` | Runs `tsc --noEmit`.                               |
| `pnpm format`    | Formats with Prettier.                             |

---

## Quick Start

```bash
pnpm install
cp .env.example .env        # adjust if needed
pnpm build-db               # full pipeline
```

Output lands in `generated/`:

```
generated/
├── pokemon-db.json
├── pokemon-db.json.gz
├── pokemon.json
├── forms.json
├── evolutions.json
├── recommendations.json
├── metadata.json
└── version.json
```

---

## Project Structure

```
dataset-generator/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
├── src/
│   ├── fetch/          # independent fetchers with local caching
│   ├── normalize/      # normalization passes over raw data
│   ├── transform/      # shared pure transformation helpers
│   ├── merge/          # merges resources into one model
│   ├── scoring/        # Deluge Companion recommendation fields
│   ├── validators/     # Zod schemas for every generated file
│   ├── generators/     # final output file writers
│   ├── metadata/       # metadata + version generators
│   ├── compression/    # gzip (brotli-ready)
│   ├── utils/          # fs, hashing, slugs, env, logging
│   ├── types/          # TypeScript types + Zod schema definitions
│   └── index.ts        # CLI entry point
├── raw/                # untouched downloaded data (never edited)
├── intermediate/       # stage handoffs (never committed)
├── generated/          # final output (never committed)
└── tests/
```

---

## Data Source

- [PokéAPI](https://pokeapi.co/) (v2). The base URL is configurable via `POKEAPI_BASE_URL`.

The fetchers are independent and cache results locally in `raw/`:

- `fetchPokemon`
- `fetchSpecies`
- `fetchEvolutionChains`
- `fetchTypes`
- `fetchMoves`
- `fetchAbilities`
- `fetchForms`
- `fetchGenerations`

---

## Schema

The full Zod schema lives in `src/validators/schema.ts` and is the single source of truth for the database shape. Every generated file is validated against it; generation **fails** if validation fails.

### Required fields per Pokémon

`id`, `name`, `slug`, `generation`, `types`, `forms`, `baseStats`, `height`, `weight`, `abilities`, `hiddenAbility`, `evolutionChain`, `legendary`, `mythical`, `baby`, `starter`, `pseudoLegendary`, `ultraBeast`, `paradox`, `megaEvolution`, `gigantamax`, `regionalVariant`, `moves`, `sprite`, `officialArtwork`.

### Deluge Companion fields (scoring pass)

`recommendation` (`overallScore`, `tier`, `recommended`, `reason`), `baseScore`, `collectorScore`, `moneyScore`, `tradeScore`, `teamScore`, `rarityScore`, `futurePotential`.

---

## Determinism

The pipeline is deterministic:

- PokeAPI resources are fetched in ID order.
- Everything is sorted by Pokémon `id`.
- No timestamps influence any stage except `metadata.json` / `version.json` (`generatedAt`).
- A SHA-256 checksum over `pokemon-db.json` is included in metadata and version files.

---

## Validation Guarantees

- Every generated file is validated with Zod before it is considered complete.
- If any file fails validation, the pipeline stops and prints the errors.
- Invalid data is never published.

---

## Compression

`compress` produces `pokemon-db.json.gz`. The compression module is designed so Brotli support can be added later without changing the pipeline.

---

## Future Compatibility

- New Pokémon, forms, and generations require no schema changes.
- New recommendation factors are additive scoring-pass changes.
- Metadata is extensible.
- All PokeAPI resource references use stable IDs.

---

## Environment Variables

See `.env.example` for the full list. All variables have sensible defaults and
can be overridden via a `.env` file or real environment variables.

| Variable                | Default                         | Description                                                                                |
| ----------------------- | ------------------------------- | ------------------------------------------------------------------------------------------ |
| `POKEAPI_BASE_URL`      | `https://pokeapi.co/api/v2`     | Base URL for the public Pokémon data source.                                               |
| `FETCH_CONCURRENCY`     | `8`                             | Number of concurrent HTTP requests during the fetch stage.                                 |
| `FETCH_DELAY_MS`        | `0`                             | Delay (ms) between batches of fetch requests. `0` disables the delay.                      |
| `FETCH_RETRIES`         | `3`                             | Number of retry attempts for failed fetches before giving up.                              |
| `FETCH_RETRY_DELAY_MS`  | `1000`                          | Delay (ms) before retrying a failed request.                                               |
| `DATASET_VERSION`       | `1.0.0`                         | Version string embedded in every generated file and `metadata.json`.                       |
| `MIN_EXTENSION_VERSION` | `1.0.0`                         | Minimum Deluge Companion extension version required to consume this dataset.               |
| `DOWNLOAD_BASE_URL`     | `https://example.com/deluge-db` | Base URL where `pokemon-db.json.gz` is hosted. Used to build `version.json → downloadURL`. |

### `DOWNLOAD_BASE_URL` and `version.json`

The `metadata` stage constructs `version.json`'s `downloadURL` by appending
`/pokemon-db.json.gz` to `DOWNLOAD_BASE_URL` (trailing slashes are stripped).
Set this to the public URL where the compressed database will be hosted, e.g.:

```
DOWNLOAD_BASE_URL=https://cdn.example.com/deluge-db
# → downloadURL: https://cdn.example.com/deluge-db/pokemon-db.json.gz
```

For GitHub Releases, the release workflow automatically derives this from the
repository and tag unless overridden via the `DOWNLOAD_BASE_URL` repository
variable.

---

## CI / CD

### Continuous Integration (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main`/`master`:

1. **Format check** — `pnpm format:check`
2. **Typecheck** — `pnpm typecheck`
3. **Tests** — `pnpm test`
4. **Full pipeline** — `pnpm build-db` (fetches live data, builds the dataset)
5. **Artifact verification** — confirms all expected files exist in `generated/`
6. **Upload** — uploads `generated/` as a CI artifact (7-day retention)

### Release Dataset (`.github/workflows/release-dataset.yml`)

Triggered by pushing a tag matching `v*` (e.g. `v1.2.0`):

1. Runs typecheck + tests
2. Extracts the version from the tag (strips the leading `v`)
3. Builds the full dataset with `DATASET_VERSION` set from the tag
4. Creates a GitHub Release with all `generated/` files attached

### Deploy to Vercel (`.github/workflows/deploy-vercel.yml`)

Triggered by pushing a tag matching `v*` or manually via `workflow_dispatch`:

1. Runs typecheck + tests
2. Builds the full dataset with `DATASET_VERSION` from the tag (or manual input)
3. Deploys `generated/` to Vercel as a static site
4. Outputs the deployment URL

Requires these GitHub secrets:

| Secret              | Description                                                     |
| ------------------- | --------------------------------------------------------------- |
| `VERCEL_TOKEN`      | Vercel access token (from Vercel dashboard → Settings → Tokens) |
| `VERCEL_ORG_ID`     | Vercel org/team ID (from Vercel project settings)               |
| `VERCEL_PROJECT_ID` | Vercel project ID (from Vercel project settings)                |

Optional repository variables:

| Variable                   | Default                        | Description                                             |
| -------------------------- | ------------------------------ | ------------------------------------------------------- |
| `VERCEL_DOWNLOAD_BASE_URL` | `https://<project>.vercel.app` | Override the `DOWNLOAD_BASE_URL` for Vercel deployments |
| `VERCEL_PROJECT_NAME`      | `deluge-db`                    | Used to construct the default download URL              |

### Tagging a Release

```bash
# Create and push a tag to trigger a release + Vercel deploy
git tag v1.2.0
git push origin v1.2.0
```

The release workflow will:

- Build the dataset with `DATASET_VERSION=1.2.0`
- Create a GitHub Release named "Dataset v1.2.0"
- Attach `pokemon-db.json`, `pokemon-db.json.gz`, and all other generated files
- Deploy to Vercel (if secrets are configured)

### Configuring `DOWNLOAD_BASE_URL` for Releases

By default, the release workflow sets `DOWNLOAD_BASE_URL` to the GitHub Release
download URL. To use a custom CDN, set a repository variable:

```bash
gh variable set DOWNLOAD_BASE_URL --body "https://cdn.example.com/deluge-db"
```

For Vercel deployments, set `VERCEL_DOWNLOAD_BASE_URL` instead:

```bash
gh variable set VERCEL_DOWNLOAD_BASE_URL --body "https://deluge-db.vercel.app"
```

---

## Hosting

The dataset can be hosted on any static file host. Two options are supported
out of the box:

### Option 1: Vercel (Recommended)

Vercel hosts the `generated/` directory as a static site with proper CORS
headers and content types configured via `vercel.json`.

#### Quick Setup

1. **Install the Vercel CLI:**

   ```bash
   pnpm add -g vercel
   ```

2. **Link the project:**

   ```bash
   vercel link
   ```

   Follow the prompts to create or link a Vercel project.

3. **Build the dataset locally:**

   ```bash
   pnpm build-db
   ```

4. **Deploy:**

   ```bash
   # Preview deployment
   vercel

   # Production deployment
   vercel --prod
   ```

5. **Set `DOWNLOAD_BASE_URL` to your Vercel URL:**

   ```bash
   # For local builds
   echo 'DOWNLOAD_BASE_URL=https://your-project.vercel.app' >> .env

   # For CI/CD
   gh variable set VERCEL_DOWNLOAD_BASE_URL --body "https://your-project.vercel.app"
   ```

#### What Vercel Serves

After deployment, these URLs are available:

| URL                                                 | Content                                |
| --------------------------------------------------- | -------------------------------------- |
| `https://<project>.vercel.app/pokemon-db.json.gz`   | Compressed database (primary download) |
| `https://<project>.vercel.app/pokemon-db.json`      | Uncompressed database                  |
| `https://<project>.vercel.app/version.json`         | Version + checksum + downloadURL       |
| `https://<project>.vercel.app/metadata.json`        | Full metadata                          |
| `https://<project>.vercel.app/pokemon.json`         | All Pokémon data                       |
| `https://<project>.vercel.app/recommendations.json` | Deluge Companion recommendations       |
| `https://<project>.vercel.app/evolutions.json`      | Evolution chains                       |
| `https://<project>.vercel.app/forms.json`           | Form data                              |
| `https://<project>.vercel.app/checksum.json`        | SHA-256 checksum                       |

#### Vercel Configuration

- `vercel.json` — Sets CORS headers (`Access-Control-Allow-Origin: *`),
  content types (`application/json` for `.json`, `application/gzip` for `.gz`),
  and caching (`max-age=3600`).
- `.vercelignore` — Excludes everything except `generated/` from deployment.

#### Automated Vercel Deploys via GitHub Actions

The `deploy-vercel.yml` workflow automatically deploys to Vercel on tag push.
Set up the required secrets:

```bash
# Get these from Vercel dashboard → Settings
gh secret set VERCEL_TOKEN --body "your-vercel-token"
gh secret set VERCEL_ORG_ID --body "your-org-id"
gh secret set VERCEL_PROJECT_ID --body "your-project-id"
```

Then push a tag:

```bash
git tag v1.2.0
git push origin v1.2.0
# → Builds dataset, deploys to Vercel, creates GitHub Release
```

### Option 2: GitHub Releases / Cloudflare R2

The `release-dataset.yml` workflow creates a GitHub Release with all generated
files attached. These can be used directly or mirrored to Cloudflare R2.

```
GitHub Release / Cloudflare R2
        ↓
Chrome Extension downloads pokemon-db.json.gz
        ↓
IndexedDB
```

`version.json` advertises the `downloadURL` used by the extension to check for updates.

---

## License

Internal project. See `DATASET_TASKS.md` and `DATASET_PROMPT.md` for requirements.
