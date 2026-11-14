# Poke Lab

A phone-friendly Pokemon TCG collection log. Add a card from a photo, match it to its official English catalogue entry (set, set code, collector number, rarity), and track a condition estimate and live prices.

Live site: https://docgonzo420.github.io/PokeLab/

## Where the data comes from

- **Card catalogue:** `cards.json`, built from [PokemonTCG/pokemon-tcg-data](https://github.com/PokemonTCG/pokemon-tcg-data) (English sets through Delta Reign, Nov 2026). Rebuild with `python3 tools/build_index.py <path-to-that-repo> cards.json`.
- **Prices:** TCGplayer and Cardmarket prices from the free [Pokemon TCG API](https://pokemontcg.io) (no key), with [TCGdex](https://tcgdex.dev) as a fallback. Refreshed when you open the app if older than 6 hours.
- **Condition:** inside Claude, Claude estimates condition from your photo. Here, you pick it. Either way it's an estimate on the 1 to 10 scale, not a PSA or CGC grade.

## Storage

On this site your collection and photos stay in this browser (IndexedDB). The Claude copy of the app keeps its own collection in your Claude account; the two don't sync.

Not affiliated with The Pokemon Company, Nintendo, Creatures or Game Freak.
