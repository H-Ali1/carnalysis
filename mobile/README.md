# Carnalysis mobile app

Expo (React Native) app for phone-first buyers: browse Copart UK in the app, tap
**Analyse ROI** on a lot to get the profit breakdown, then tap **Place bid on Copart** to bid
in the Copart app or mobile site.

## Run with Expo Go

1. Start the backend so the phone can reach it:

   ```bash
   cd ../backend
   uvicorn app.main:app --reload --host 0.0.0.0
   ```

2. Point the app at your machine's LAN address (find it with `ipconfig` or `ifconfig`):

   ```bash
   cp .env.example .env   # EXPO_PUBLIC_BACKEND_URL=http://<your-lan-ip>:8000
   ```

3. Install and start, then scan the QR code with Expo Go (phone and computer on the same
   network):

   ```bash
   npm install
   npx expo start
   ```

## How it works

- [`BrowserScreen`](src/screens/BrowserScreen.tsx) shows copart.co.uk in a WebView. On a lot
  page, **Analyse ROI** injects the extraction script from
  [`@carnalysis/core/webview`](../packages/core), the same extractor the Chrome extension
  uses, and the page posts back what it read.
- [`AnalysisSheet`](src/screens/AnalysisSheet.tsx) takes it from there. Every field stays
  editable, and off a lot page the button becomes **Manual ROI** for typed-in details.
- **Place bid on Copart** opens the lot URL through the OS. It goes to the Copart app if that
  app handles copart.co.uk links, and to the browser otherwise. Bids are never placed by this
  app.

## Notes

- Field labels were written against the desktop site. Check them against the live mobile layout
  (ROADMAP, Phase 5); any field that isn't found can be typed in.
- Expo Go allows plain-HTTP backends. A store build needs the backend served over HTTPS.
- [`metro.config.js`](metro.config.js) adds `../packages/core` to Metro's watch folders, since
  the shared package is linked from outside this project.
