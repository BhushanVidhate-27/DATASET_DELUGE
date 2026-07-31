# DATASET_TASKS.md

# Deluge Companion Dataset Generator

## Purpose

This project is completely separate from the Chrome extension.

Its only responsibility is to generate and publish an optimized Pokémon database for Deluge Companion.

The extension will **never** contact public Pokémon APIs directly.

Instead:

Public Dataset

↓

Dataset Generator

↓

Deluge Companion Database

↓

GitHub Release / Cloudflare R2

↓

Chrome Extension

↓

IndexedDB

---

# AI Agent Instructions

Before writing any code:

Design a maintainable ETL (Extract → Transform → Load) pipeline.

Never hardcode Pokémon data.

Always generate the final dataset from public Pokémon data.

Keep every step modular.

---

# Goals

The generator should:

- Download Pokémon data from a trusted public source.
- Normalize the data.
- Merge related resources.
- Generate optimized JSON files.
- Validate everything.
- Produce versioned output.
- Generate metadata.
- Generate compressed output.
- Prepare files for hosting.

---

# Technology Stack

Language

- TypeScript

Package Manager

- pnpm

Runtime

- Node.js

Validation

- Zod

HTTP

- Native fetch()

Compression

- gzip

Formatting

- Prettier

Testing

- Vitest

---

# Project Structure

dataset-generator/

├── package.json
├── tsconfig.json
├── .env.example
├── README.md
│
├── src/
│
│ ├── fetch/
│ │
│ ├── normalize/
│ │
│ ├── transform/
│ │
│ ├── merge/
│ │
│ ├── scoring/
│ │
│ ├── validators/
│ │
│ ├── generators/
│ │
│ ├── metadata/
│ │
│ ├── compression/
│ │
│ ├── utils/
│ │
│ └── index.ts
│
├── raw/
│
├── generated/
│
└── tests/

---

# Pipeline

Step 1

Fetch public Pokémon data.

↓

Step 2

Store raw files.

↓

Step 3

Normalize data.

↓

Step 4

Merge datasets.

↓

Step 5

Generate recommendation fields.

↓

Step 6

Validate.

↓

Step 7

Generate output files.

↓

Step 8

Compress.

↓

Step 9

Generate metadata.

---

# Fetch Layer

Create independent fetchers.

Example

fetchPokemon()

fetchSpecies()

fetchEvolutionChains()

fetchTypes()

fetchMoves()

fetchAbilities()

fetchForms()

fetchGenerations()

Each fetcher should cache results locally.

---

# Raw Folder

Store untouched downloaded data.

raw/

pokemon/

species/

forms/

moves/

evolutions/

This folder is never manually edited.

---

# Normalize Layer

Normalize:

Names

IDs

Forms

Evolution references

Move references

Type names

Generation values

Everything should become internally consistent.

---

# Merge Layer

Merge all resources into one model.

Example:

Pokemon

↓

Species

↓

Evolution

↓

Forms

↓

Types

↓

Moves

↓

Abilities

↓

One Complete Object

---

# Required Output Fields

Every Pokémon must contain:

id

name

slug

generation

types

forms

baseStats

height

weight

abilities

hiddenAbility

evolutionChain

legendary

mythical

baby

starter

pseudoLegendary

ultraBeast

paradox

megaEvolution

gigantamax

regionalVariant

moves

sprite

officialArtwork

---

# Deluge Companion Fields

Generate custom fields.

recommendation

baseScore

collectorScore

moneyScore

tradeScore

teamScore

rarityScore

tier

recommended

reason

These belong only to Deluge Companion.

---

# Output Structure

generated/

pokemon.json

recommendations.json

evolutions.json

forms.json

metadata.json

version.json

pokemon-db.json

pokemon-db.json.gz

---

# Metadata

Generate

metadata.json

Example

{

version

generatedAt

pokemonCount

generatorVersion

checksum

minExtensionVersion

}

---

# Version File

version.json

{

version

checksum

downloadURL

}

---

# Validation

Validate every generated file with Zod.

Generation should fail if validation fails.

Never publish invalid data.

---

# Compression

Generate:

pokemon-db.json

pokemon-db.json.gz

Future support:

brotli

---

# Testing

Create tests for:

Fetchers

Normalization

Merge

Scoring

Validation

Generation

Compression

---

# Scripts

Required package scripts

pnpm fetch

Downloads latest raw data.

pnpm normalize

Normalizes raw data.

pnpm merge

Combines datasets.

pnpm score

Generates recommendation fields.

pnpm validate

Runs Zod validation.

pnpm generate

Creates final JSON files.

pnpm compress

Generates gzip output.

pnpm metadata

Generates metadata.

pnpm build-db

Runs the complete pipeline.

---

# build-db Pipeline

Should execute:

fetch

↓

normalize

↓

merge

↓

score

↓

validate

↓

generate

↓

compress

↓

metadata

---

# AI Rules

Never modify raw downloaded data.

Always generate derived files.

Keep every pipeline stage independent.

Keep functions pure whenever possible.

Prefer composition.

Avoid duplicate transformations.

Every stage should be individually testable.

Never couple generation logic to the Chrome extension.

The extension should only consume the final generated dataset.

---

# Expected Final Output

generated/

pokemon-db.json

↓

Contains every Pokémon with:

- Official Pokémon information
- Deluge Companion recommendation fields
- Optimized structure
- Version compatibility
- Validation guarantees
- Ready for hosting

This file becomes the only database downloaded by the extension.
