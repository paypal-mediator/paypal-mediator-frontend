# ResolveAI frontend

React frontend aligned with the implemented M01–M04 backend contracts in the sibling `paypal-mediator-backend` repository. Dark dashboard with fixed navigation, keyboard shortcuts, transaction details, document readiness, evidence history, and merchant settings.

```sh
npm install
npm run dev
npm test
npm run build
```

Development uses `http://localhost:3000`, matching the backend's documented CORS origin. Build output is in `dist`.

## Current data and integration boundary

The UI currently reads explicit fixtures in `src/data/fixtures.js`. It does **not** connect to Supabase Auth or the live backend. Settings are read-only; there are no fake save/check/upload operations. The fixture payment records are illustrative, not actual PayPal transactions. Order/evidence sources retain their `DEMO` provenance in the UI.

`src/lib/api.js` provides an unconnected authenticated API adapter. Pass an API base URL **including `/api`** and a `getAccessToken()` function returning the current Supabase user's access token. It exposes the implemented merchant, integration, transaction, order registration, and structured evidence endpoints. It preserves backend error `code`, `message`, `requestId`, and HTTP status. No credentials or tokens are bundled with the app. Supabase session creation/refresh and live loading/error/pagination states remain integration work.

Use `GET /transactions` for server pagination (`page`, `pageSize`) and exact `paypalCaptureId` lookup. The current fixture list supports exact capture ID search; readiness filters operate on loaded records, not an unsupported backend query. Overview counts are derived from loaded fixtures, not a backend analytics endpoint. Real paginated results must not be treated as global totals for readiness categories.

## Contract alignment

- Transactions: UUID identity, PayPal capture/order references, `COMPLETED` payment status, decimal-string amount and currency.
- Order linking: `LINKED`, `UNLINKED`, `CONFLICT`; linked orders provide items and shipping/tax/discount amounts.
- Document coverage: `READY`, `INCOMPLETE`, `NEEDS_REVIEW` plus five checks with `PRESENT`, `MISSING`, `CONFLICT`. This is not PayPal Seller Protection or an assurance of winning a dispute.
- Evidence: dossier revision, original structured records, versions, provenance, hashes, current/historical status, and integrity.
- Settings: merchant identity/role, investigation/submission policy, mandatory approval, and independent PayPal connection/dispute-read states.
- Disputes and Agent Activity have frontend fixture screens: case list, buyer report, merchant response, evidence picker, defense checklist, and activity filters. M05–M09 APIs remain pending, so preparation/submission buttons are disabled; selected files stay local. Shared buyer/seller conversations, refund agreements, dispute creation, and simulated agent actions were removed.
- Binary uploads, billing, notifications, password management, product photos, buyer contact details, card digits, variants, and refunds are not provided by current transaction contracts and are not presented as supported features.

`ProductThumbnail` remains reusable for a future catalog image extension, with a neutral fallback. Current backend order items have no image field.

## Keyboard controls

- Up/Down: sidebar navigation on load or after selecting a sidebar screen.
- Command/Ctrl+K: open Transactions search; Escape exits typing.
- Left/Right: transaction readiness filters; Down enters table; Up/Down wraps through rows; Enter opens details.
- Escape: evidence → transaction details → Transactions → sidebar focus.
- Settings: Up/Down switches categories; Escape closes the dialog.

Tests cover fixture relationships, exact currency formatting without floating-point conversion, and authenticated API request/error behavior. They do not verify live services or browser rendering.

Evidence history uses explicit revision snapshots from `evidenceSnapshots` for the frontend: selecting a revision updates the category cards, historical views are read-only, and closing history returns to the current version. The current backend exposes evidence item versions but does not expose complete dossier snapshots per revision. Historical snapshot loading/reconstruction needs a backend contract before connecting this view to live data. No restore-to-old-version write is implemented.
