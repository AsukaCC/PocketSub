# Pocket Ledger

Pocket Ledger is a local-first personal accounting app built with Expo and React Native. It tracks everyday income and expenses, provides cash-flow insights, and keeps subscription management as a focused secondary feature.

## Features

- Unified manual and subscription records with shared amount, currency, category, and date fields
- Monthly balance, filters, and six-month spending insights
- Subscription tracking with renewal and expiry management
- Device-local storage through AsyncStorage
- Versioned JSON export and import, including legacy PocketSub backups
- Responsive Web, Android, and iOS interfaces

## Development

Install dependencies and start Expo:

```bash
npm install
npm start
```

Run the project checks:

```bash
npx tsc --noEmit
npm run lint
```

The app uses file-based routing under `src/app`. User data stays on the device unless the user explicitly exports a JSON backup.

## Manual GitHub Pages release

GitHub Pages releases are intentionally manual. No GitHub Actions workflow publishes this project.

```bash
npm run build:pages
npm run deploy:pages
```

`build:pages` exports the static site to `dist` with the `/PocketSub` base path. `deploy:pages` rebuilds it and pushes the generated site to the `gh-pages` branch.
