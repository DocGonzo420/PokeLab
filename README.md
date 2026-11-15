# Poke Lab

A phone-friendly Pokemon TCG collection log. Add a card from a photo, match it to its official English catalogue entry (set, set code, collector number, rarity), and track a condition estimate and live prices.

Live site: https://docgonzo420.github.io/PokeLab/

## Where the data comes from

- **Card catalogue:** `cards.json`, built from [PokemonTCG/pokemon-tcg-data](https://github.com/PokemonTCG/pokemon-tcg-data) (English sets through Delta Reign, Nov 2026). Rebuild with `python3 tools/build_index.py <path-to-that-repo> cards.json`. `tools/wrap.py` turns the Claude version of the page into this site's `index.html`.
- **Prices:** TCGplayer and Cardmarket prices from the free [TCGdex](https://tcgdex.dev) API, updated daily (no key), with the [Pokemon TCG API](https://pokemontcg.io) as a fallback. Refreshed when you open the app if older than 6 hours.
- **Finding a card from a photo:** this site reads the collector number (and any card names) off your photo with [Tesseract.js](https://github.com/naptha/tesseract.js), which runs in your browser, then matches it to the catalogue. Inside Claude, Claude reads the photo instead.
- **Deck data:** `deck.json` (types, attacks, abilities, regulation marks and what each Trainer does), built from the same repo with `python3 tools/build_deck.py <path-to-that-repo> deck.json`. Standard means regulation marks H, I and J (since the April 2026 rotation); you can change the marks in the Decks tab when the format rotates.
- **Condition:** measure centering by dragging guides over your photo (limits follow PSA's front-centering standards), and pick the overall condition yourself. Inside Claude, Claude also estimates corners, edges and surface. Either way it's an estimate, not a PSA or CGC grade.

## Gallery and decks

- **Pictures:** show your photo and the catalogue picture side by side (the default) in the binder, gallery and decks, or just one of them.
- **Gallery tab:** your collection as a grid of cards that animate in, tilt toward the pointer, and show value, rarity, quantity and grade.
- **Sorting:** presets for highest or lowest value, recently added, rarest first, best condition, set and number, and name, plus My order. In the gallery, Arrange cards lets you drag cards into your own order (press and hold first on a phone), or move them one place with the arrows.
- **Downloads:** the binder and gallery can download the cards they show (all of them, or what your search and filters leave) as a spreadsheet (CSV) or as one picture of the cards in a grid with names, set numbers and prices, which you can preview, download or share. Over 96 cards, the picture is split into several.
- **Decks tab:** build a 60-card deck by hand or around a Pokémon. It checks deck rules and format legality, counts what you already own and what's left to buy, and suggests cards to finish evolution lines, add energy and make the deck more consistent. Suggestions are rule-based, not tournament results. Each suggestion shows the card's price and the sets you can open it in. There's no free source for booster pack prices, so each set links to a TCGplayer search for its packs.

## Storage

On this site your collection, photos and decks stay in this browser (IndexedDB). The Claude copy of the app keeps its own collection in your Claude account; the two don't sync.

Not affiliated with The Pokemon Company, Nintendo, Creatures or Game Freak.
