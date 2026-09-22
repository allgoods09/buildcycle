# BuildCycle interactive prototype

A mobile-first, standalone HTML/CSS/JavaScript demo based on the supplied Figma screen images and material photos. Open it on a phone-sized browser window or use the desktop phone preview. All prices are in Philippine pesos, with Bohol sample locations.

## Run it

From inside this folder:

```bash
python3 -m http.server 8000
```

Open **http://localhost:8000** for the mobile-first app or **http://localhost:8000/BuildCycle_Web.html** for the desktop web experience. Keep both on the same server origin if you want listings, saves, chats, deals and profile changes to sync through browser storage. You may also open either HTML file directly, though a local server gives more consistent storage and photo behavior. No npm, build step, dependencies or internet access are needed.

## Test it

Run the automated smoke test from this folder:

```bash
node tests/smoke-test.js
node tests/web-smoke-test.js
```

The checks cover direct-file compatibility, saved-data migration, shared mobile/web data, quantity-based deal totals, search recovery, saved-item feedback, chat search, stable dialog behavior and stylesheet structure.

For a quick presentation check, use a narrow/mobile viewport and follow this path:

1. For a clean walkthrough, open the demo in a private window. Separately, refresh any existing demo tab once and confirm its listings and profile still load after the stored-data upgrade.
2. On a clean welcome screen, confirm there is one progress marker. Continue with the sample location and log in using any valid email and any password.
3. Compare **Home**, **Search**, **Sell**, **Chats** and **Profile**. The bottom navigation should stay at the same height and position on each main screen.
4. In **Search**, type a phrase that has no matches. Tap **Reset search** and confirm the query and filter state clear and the listings return. Open Filters and confirm the square filter control stays 48 × 48 px.
5. Save a listing. Its heart should fill red immediately; the count beside **Profile → Saved Items** should increase and the page should contain that listing. Tap the heart again to confirm both update.
6. In **Chats**, tap the search icon and search for `Marcus` or `lumber`. Confirm only the relevant conversation remains, then close the search field.
7. Open any Profile sheet such as **Settings**. Press `Escape` on a hardware keyboard: the sheet should close and focus should return to the button that opened it.
8. Open a listing with multiple units available. In **Make Offer** and **Buy / Deal**, choose a smaller quantity and confirm the material subtotal and total update. Carry an accepted offer into a deal and confirm the same quantity appears in chat and the deal summary.
9. Open Marcus's chat, send a message, accept an offer, continue to a deal and advance every stage. The progress icons should remain behind the sticky action button.
10. In **Sell**, enter a title and location, then use **Suggest description**. Confirm the sentence contains the actual location and no template-code text such as `data.user.location`.
11. Use **Profile → Reset Demo Marketplace** and confirm starter listings, chats, saved items and deals reset while the signed-in profile remains.

For the desktop handoff, open the web page beside the mobile page from the same server. Save or post an item in one layout and confirm the other open tab updates automatically; the catalog and activity should agree. A newly opened tab also loads the latest shared browser state.

You can switch layouts from inside the prototype using the dedicated **Try the Web!** or **Try Mobile!** row on the Profile page, alongside Settings and Reset Demo Marketplace. The switch keeps the same origin and local demo state.

## Try the full flow

1. Enter a sample location, then log in with any valid email and any password; or create a demo account.
2. Search materials and filter by category, distance, condition or maximum unit price. Open a listing, save it, message the seller or make an offer for a chosen quantity up to the available stock.
3. In chat, send a message, accept the example offer and continue to a deal. Or use **Buy / Deal** directly from a listing; the quantity, material subtotal, delivery and example total remain visible throughout.
4. Choose self-arranged pickup or an illustrative partner delivery quote. Pick simulated protected payment or cash on pickup, then advance the example tracking stages and rate the transaction.
5. Use the central **Sell** button to create a listing. Upload one local photo or leave it blank to use a supplied material photo, edit the example AI wording, and post. View and edit it under **Profile → My Listings**.

The supplied material images are bundled in `assets/`. Extra demo listings reuse those photos rather than adding unrelated images. Listings, chats, saved items, reviews and deal progress persist locally in the browser. **Profile → Reset Demo Marketplace** restores the starter marketplace while preserving the signed-in demo profile.

## Demo boundaries

This is an interactive visual prototype. Authentication, social login, seller verification, AI text assistance, protected payment, delivery quotes/tracking, notifications and seller replies are simulated. No real account, charge, courier booking, device location lookup or external API request occurs. Selected quantities are recorded on the local demo deal, but stock is not reserved or reduced across buyers. **Enable Location** continues with the sample Bohol place; the manual option lets you type another display location. Cash on pickup is shown outside protected payment. The sample commission and premium figures are illustrative only.

## Files

- `index.html` — app shell
- `BuildCycle_Web.html` — desktop web app shell
- `css/styles.css` — optional aggregate stylesheet for embedding
- `css/base.css` — shared tokens, controls, navigation and responsive shell
- `css/marketplace.css` — home, search, listing, chat and profile screens
- `css/flows.css` — authentication, selling, deals, reviews and sheets
- `css/web.css` — desktop workspace, navigation and responsive web layouts
- `js/demo-data.js` — starter listings, chats and state factory
- `js/app.js` — screen rendering and prototype interactions
- `js/web-app.js` — desktop rendering and interactions using the shared demo state
- `tests/smoke-test.js` — dependency-free interaction and regression checks
- `tests/web-smoke-test.js` — desktop and shared-data regression checks
- `assets/` — supplied photos and logos

This is a standalone web handoff for pitching and review, not a packaged Android/iOS app or a connected marketplace backend.
