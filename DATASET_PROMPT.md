# DATABASE_PROMPT.md

# AI Prompt — Build Deluge Companion Pokémon Database

You are responsible for building and maintaining the Pokémon database used by the Deluge Companion Chrome Extension.

This project is completely independent from the Chrome extension.

The extension must **never** fetch data directly from public Pokémon APIs.

Instead, this project fetches, validates, enriches, and generates an optimized database that the extension downloads once and stores locally.

---

# Objective

Create the highest quality Pokémon database possible.

The generated database should be:

- Optimized
- Normalized
- Versioned
- Lightweight
- Extensible
- Easy to update
- Ready for IndexedDB
- Compatible with future Pokémon releases

---

# Public Data Sources

Use trusted public Pokémon datasets (examples include PokéAPI or other open Pokémon datasets).

The generator should download data from these sources during the build process.

The final extension must **never** communicate with those public APIs.

---

# Data to Extract

For every Pokémon, extract as much useful information as possible.

## Identity

- National Pokédex ID
- Name
- Slug
- Generation
- Species
- Category
- Forms
- Gender differences
- Regional variants

---

## Typing

- Primary Type
- Secondary Type
- Weaknesses
- Resistances
- Immunities

---

## Base Information

- Height
- Weight
- Base Experience
- Capture Rate
- Growth Rate
- Hatch Steps
- Egg Groups
- Color
- Shape
- Habitat (if available)

---

## Base Stats

- HP
- Attack
- Defense
- Special Attack
- Special Defense
- Speed
- Base Stat Total

---

## Abilities

- Primary Abilities
- Hidden Ability

---

## Evolutions

- Previous Evolution
- Next Evolution
- Evolution Chain
- Evolution Method
- Evolution Level
- Evolution Item
- Special Evolution Requirements

---

## Moves

Extract:

- Level-up Moves
- TM Moves
- Tutor Moves
- Egg Moves

Only keep the data necessary for future features.

---

## Forms

Detect and normalize:

- Mega Evolution
- Gigantamax
- Regional Forms
- Alternate Forms
- Battle Forms
- Seasonal Forms
- Cosmetic Forms

---

## Classification

Generate boolean flags:

- Legendary
- Mythical
- Ultra Beast
- Paradox Pokémon
- Starter
- Baby Pokémon
- Fossil Pokémon
- Pseudo Legendary
- Event Only (if available)

---

## Sprites

Store URLs (or references) for:

- Official Artwork
- Default Sprite
- Shiny Sprite

Do not download image files into the dataset.

---

# Deluge Companion Fields

Generate custom fields used only by this project.

## Recommendation

```text
baseScore

collectorScore

tradeScore

moneyScore

teamScore

rarityScore

futurePotential

overallScore

tier

recommended

reason
```

---

## Rarity

Generate internal rarity classification.

Example:

```text
COMMON

UNCOMMON

RARE

VERY_RARE

LEGENDARY
```

This is **our** classification, not necessarily the game's.

---

## Tier

Generate:

```text
S+

S

A

B

C

D
```

---

## Recommendation Object

Example

```json
{
  "overallScore": 94,
  "tier": "S",
  "recommended": true,
  "reason": "Excellent late-game evolution with strong base stats."
}
```

---

# Optimization

Remove unnecessary fields.

Keep only what benefits:

- Recommendation engine
- Team analyzer
- Future analytics
- Collection tracking

Avoid storing redundant or duplicated data.

---

# Output Files

Generate:

```text
generated/

pokemon.json

forms.json

evolutions.json

recommendations.json

metadata.json

version.json

pokemon-db.json

pokemon-db.json.gz
```

---

# Metadata

Generate:

```json
{
  "version": "1.0.0",
  "generatedAt": "...",
  "pokemonCount": 0,
  "generatorVersion": "1.0.0",
  "checksum": "...",
  "minExtensionVersion": "1.0.0"
}
```

---

# Validation

Validate every output using Zod.

If any validation fails:

- Stop generation.
- Display the errors.
- Do not publish invalid files.

---

# Future Compatibility

Design the schema so future additions require no breaking changes.

Examples:

- New Pokémon
- New forms
- New generations
- New recommendation factors
- Additional metadata

---

#recommendation
One final recommendation: don't generate recommendation scores during the initial data extraction. Instead, make the pipeline:
Fetch (raw Pokémon data)
Normalize (clean and merge data)
Generate canonical database
Run a scoring pass (adds Deluge Companion fields like overallScore, moneyScore, tier, etc.)
Validate
Publish

# Quality Requirements

The generated database should be:

- Compact
- Fast to parse
- Easy to cache
- Versioned
- Deterministic
- Fully typed
- IndexedDB-friendly

The Chrome extension should be able to download this database once, validate it, store it locally, and perform all Pokémon lookups without making any additional network requests during gameplay.
