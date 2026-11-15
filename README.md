# Poke Lab

A phone-friendly Pokemon TCG collection log. Add a card from a photo, match it to its official English catalogue entry (set, set code, collector number, rarity), and track a condition estimate and live prices.

Live site: https://docgonzo420.github.io/PokeLab/

## Where the data comes from

- **Card catalogue:** `cards.json`, built from [PokemonTCG/pokemon-tcg-data](https://github.com/PokemonTCG/pokemon-tcg-data) (English sets through Delta Reign, Nov 2026). Rebuild with `python3 tools/build_index.py <path-to-that-repo> cards.json`. `tools/wrap.py` turns the Claude version of the page into this site's `index.html`.
- **Prices:** TCGplayer and Cardmarket prices from the free [TCGdex](https://tcgdex.dev) API, updated daily (no key), with the [Pokemon TCG API](https://pokemontcg.io) as a fallback. Refreshed when you open the app if older than 6 hours.
- **Finding a card from a photo:** this site reads the collector number (and any card names) off your photo with [Tesseract.js](https://github.com/naptha/tesseract.js), which runs in your browser, then matches it to the catalogue. Inside Claude, Claude reads the photo instead.
- **Condition:** measure centering by dragging guides over your photo (limits follow PSA's front-centering standards), and pick the overall condition yourself. Inside Claude, Claude also estimates corners, edges and surface. Either way it's an estimate, not a PSA or CGC grade.

## Deck Builder

The **Decks** tab builds Pokémon TCG decks from the cards you've logged, with nothing to enter twice.

- **Build a deck:** pick a Pokémon you own (or a type) and a format. It builds a 60-card deck around that Pokémon's evolution line, using your cards first. If you don't own enough, it fills the gaps with common staples and basic Energy and lists exactly what you'd need.
- **Rules checks:** exactly 60 cards, no more than 4 of a card by name (basic Energy has no limit), at least 1 Basic Pokémon, 1 ACE SPEC at most, 1 Radiant Pokémon at most, and every card legal in the format.
- **Standard legality:** worked out from regulation marks in `deck.json` (built with `python3 tools/build_deck_data.py <path-to-pokemon-tcg-data> deck.json`). Current Standard: marks H, I, J and later, plus basic Energy, plus older prints of cards that were reprinted with a current mark (same name; same attacks and HP for Pokémon). The G rotation took effect April 10, 2026 (March 26 in TCG Live). When the next rotation is announced, change `FIRST_LEGAL_MARK` in the script and rebuild.
- **Edit, save, share:** add or remove cards (from your collection or the whole catalogue), paste a deck list to see which cards you're missing, copy a shopping list, and copy the deck in the text format Pokémon TCG Live imports.
- Decks are saved in this browser (localStorage), like the collection. The Claude copy of the app doesn't have the Deck Builder.

## Storage

On this site your collection and photos stay in this browser (IndexedDB). The Claude copy of the app keeps its own collection in your Claude account; the two don't sync.

Not affiliated with The Pokemon Company, Nintendo, Creatures or Game Freak.
