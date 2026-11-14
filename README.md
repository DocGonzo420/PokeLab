# Poke Lab

A phone-friendly Pokemon TCG collection log. Add a card from a photo, match it to its official English catalogue entry (set, set code, collector number, rarity), and track a condition estimate and live prices.

Live site: https://docgonzo420.github.io/PokeLab/

## Where the data comes from

- **Card catalogue:** `cards.json`, built from [PokemonTCG/pokemon-tcg-data](https://github.com/PokemonTCG/pokemon-tcg-data) (English sets through Delta Reign, Nov 2026). Rebuild with `python3 tools/build_index.py <path-to-that-repo> cards.json`. `tools/wrap.py` turns the Claude version of the page into this site's `index.html`.
- **Prices:** TCGplayer and Cardmarket prices from the free [Pokemon TCG API](https://pokemontcg.io) (no key), with [TCGdex](https://tcgdex.dev) as a fallback. Refreshed when you open the app if older than 6 hours.
- **Finding a card from a photo:** this site reads the collector number (and any card names) off your photo with [Tesseract.js](https://github.com/naptha/tesseract.js), which runs in your browser, then matches it to the catalogue. Inside Claude, Claude reads the photo instead.
- **Condition:** measure centering by dragging guides over your photo (limits follow PSA's front-centering standards), and pick the overall condition yourself. Inside Claude, Claude also estimates corners, edges and surface. Either way it's an estimate, not a PSA or CGC grade.

## Storage

On this site your collection and photos stay in this browser (IndexedDB). The Claude copy of the app keeps its own collection in your Claude account; the two don't sync.

Not affiliated with The Pokemon Company, Nintendo, Creatures or Game Freak.
