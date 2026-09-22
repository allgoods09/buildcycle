# BuildCycle interactive prototype

A mobile-first, standalone HTML/CSS/JavaScript demo based on the supplied Figma screen images and material photos. Open it on a phone-sized browser window or use the desktop phone preview. All prices are in Philippine pesos, with Bohol sample locations.

## Run it

From inside this folder:

```bash
python3 -m http.server 8000
```

Open **http://localhost:8000**. You may also open `index.html` directly, though a local server gives more consistent browser storage and photo behavior. No npm, build step, dependencies or internet access are needed.

## Try the full flow

1. Enter a sample location, then log in with any valid email and any password; or create a demo account.
2. Search materials and filter by category, distance, condition or maximum unit price. Open a listing, save it, message the seller or make an offer.
3. In chat, send a message, accept the example offer and continue to a deal. Or use **Buy / Deal** directly from a listing.
4. Choose self-arranged pickup or an illustrative partner delivery quote. Pick simulated protected payment or cash on pickup, then advance the example tracking stages and rate the transaction.
5. Use the central **Sell** button to create a listing. Upload one local photo or leave it blank to use a supplied material photo, edit the example AI wording, and post. View and edit it under **Profile → My Listings**.

The supplied material images are bundled in `assets/`. Extra demo listings reuse those photos rather than adding unrelated images. Listings, chats, saved items, reviews and deal progress persist locally in the browser. **Profile → Settings → Reset demo data** clears them.

## Demo boundaries

This is an interactive visual prototype. Authentication, social login, seller verification, AI text assistance, protected payment, delivery quotes/tracking, notifications and seller replies are simulated. No real account, charge, courier booking, device location lookup or external API request occurs. **Enable Location** continues with the sample Bohol place; the manual option lets you type another display location. Cash on pickup is shown outside protected payment. The sample commission and premium figures are illustrative only.

## Files

- `index.html` — app shell
- `css/styles.css` — styling and responsive layout
- `js/app.js` — sample data, screens and interactions
- `assets/` — supplied photos and logos

This is a standalone web handoff for pitching and review, not a packaged Android/iOS app or a connected marketplace backend.
