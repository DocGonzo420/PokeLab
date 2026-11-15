# Poke Lab

A phone-friendly Pokemon TCG collection log. Add a card from a photo, match it to its official English catalogue entry (set, set code, collector number, rarity), and track a condition estimate and live prices.

Live site: https://docgonzo420.github.io/PokeLab/

## Where the data comes from

- **Card catalogue:** `cards.json`, built from [PokemonTCG/pokemon-tcg-data](https://github.com/PokemonTCG/pokemon-tcg-data) (English sets through Delta Reign, Nov 2026). Rebuild with `python3 tools/build_index.py <path-to-that-repo> cards.json`. `tools/wrap.py` turns the Claude version of the page into this site's `index.html`.
- **Prices:** TCGplayer and Cardmarket prices from the free [TCGdex](https://tcgdex.dev) API, updated daily (no key), with the [Pokemon TCG API](https://pokemontcg.io) as a fallback. Refreshed when you open the app if older than 6 hours.
- **Finding a card from a photo:** this site reads the collector number (and any card names) off your photo with [Tesseract.js](https://github.com/naptha/tesseract.js), which runs in your browser, then matches it to the catalogue. Inside Claude, Claude reads the photo instead.
- **Scanning with the camera:** Add card > Scan with camera opens the live camera. Fit the card in the frame and the collector number is read as you hold it, like a barcode scanner; it needs two matching reads before it picks the card. Drag the frame to move it and pinch or use the slider to resize it, so it lines up with a card on a scanner stand; it remembers where you put it. Tap the picture to focus, and use Flash, Camera zoom and Focus where the phone's browser allows them. Take photo now captures the frame if the number won't read. Needs camera permission and HTTPS.
- **Adding the match:** each match has its own Add button beside it, so one tap saves the right card. After a camera scan the app goes straight back to scanning: put the next card in and it reads it. It won't re-add the card that's still in the frame until you take it away, and Scan again re-reads a card if the match is wrong.
- **Binder page import:** Add card > Binder page takes a photo of a whole page (9, 4, 12 or 16 pockets) and reads the collector number in every pocket. Drag the yellow grid or its corners to fit the pockets; it remembers the grid. Check the matches, change or search any pocket, then Add saves the whole page at once. You can pick several page photos and go through them one by one. Your photo of each pocket is saved with the card.
- **Deck data:** `deck.json` (types, attacks, abilities, regulation marks and what each Trainer does), built from the same repo with `python3 tools/build_deck.py <path-to-that-repo> deck.json`. Standard means regulation marks H, I and J (since the April 2026 rotation); you can change the marks in the Decks tab when the format rotates.
- **Condition:** measure centering by dragging guides over your photo (limits follow PSA's front-centering standards), and pick the overall condition yourself. Inside Claude, Claude also estimates corners, edges and surface. Either way it's an estimate, not a PSA or CGC grade.

## Gallery and decks

- **Pictures:** show your photo and the catalogue picture side by side (the default) in the binder, gallery and decks, or just one of them.
- **Gallery tab:** your collection as a grid of cards that animate in, tilt toward the pointer, and show value, rarity, quantity and grade.
- **Sorting:** presets for highest or lowest value, recently added, rarest first, best condition, set and number, and name, plus My order. In the gallery, Arrange cards lets you drag cards into your own order (press and hold first on a phone), or move them one place with the arrows.
- **Downloads:** the binder and gallery can download the cards they show (all of them, or what your search and filters leave) as a spreadsheet (CSV) or as one picture of the cards in a grid with names, set numbers and prices, in your current sort order, which you can preview, download or share. The picture can use the catalogue images, your own photos (cards without one fall back to the catalogue image) or both side by side. Over 96 cards, the picture is split into several.
- **Decks tab:** build a 60-card deck by hand or around a Pokémon. It checks deck rules and format legality, counts what you already own and what's left to buy, and suggests cards to finish evolution lines, add energy and make the deck more consistent. Suggestions are rule-based, not tournament results. Each suggestion shows the card's price and the sets you can open it in. There's no free source for booster pack prices, so each set links to a TCGplayer search for its packs.

## Storage

On this site your collection, photos and decks stay in this browser (IndexedDB). The Claude copy of the app keeps its own collection in your Claude account; the two don't sync.

Not affiliated with The Pokemon Company, Nintendo, Creatures or Game Freak.
