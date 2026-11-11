# ResolveAI frontend

Standalone React frontend with the same screens, connected API adapter, routing, and runtime configuration as `paypal-mediator-production/apps/web`. Dark dashboard with fixed navigation, keyboard shortcuts, transaction details, document readiness, evidence history, and merchant settings.

```sh
npm install
npm run dev
npm test
npm run lint
npm run typecheck
npm run build
```

Development uses `http://localhost:3000`, matching the backend's documented CORS origin. Build output is in `dist`.

## Connect to the backend

Copy `.env.example` to `.env.local`, set the Supabase project URL and publishable browser key, then restart Vite. Sign in with an existing Supabase user who has an active merchant membership. The API URL includes `/api`. Keep service-role keys and PayPal credentials on the server.

Connected mode uses Supabase sessions and the authorized backend for merchant settings, PayPal status checks, paginated transactions and disputes, evidence uploads and downloads, investigation and verification runs, activity, and billing records. Uploads accept PDF, PNG, and JPEG files up to 512 KiB. Readiness filters apply to the current transaction page. The backend resolves the merchant context, so connected mode displays the merchant returned by `GET /merchants/me`.

Dispute submission requires explicit approval and uses the backend's verified evidence. Edits to the displayed draft stay in the field. Billing creates subscription records. Card processing and buyer chat still need backend support. Team creation and member invitation APIs exist in the production backend but are not connected to these screens. ERP credential entry stays out of connected mode while credential verification and encrypted storage are unfinished.

Live mode is the default, matching the production frontend. Without Supabase configuration, the app displays connection setup. For the local design workspace without backend credentials, create `.env.local` containing:

```env
VITE_DATA_MODE=preview
```

Restart the dev server after changing environment variables. Existing `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` values are supported; the corresponding `VITE_` variables take precedence. Only public configuration belongs in the browser.

## Routing and deployment

For the Render Web Service, use `npm ci && npm run build` as the build command
and `npm start` as the start command. The production static server listens on
Render's `PORT` (3000 locally) and serves `index.html` for client-side routes.
Set `VITE_DATA_MODE=live`, `VITE_API_URL=https://paypal-mediator-backend.onrender.com/api`,
`VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY` before building.
Set the backend's `CORS_ORIGIN` to include `https://paypal-mediator-frontend.onrender.com`.

Connected screens have stable URLs: `/transactions`, `/transactions/:id`, `/transactions/:id/evidence`, `/disputes`, `/disputes/:id`, `/disputes/:id/evidence/:transactionId`, `/activity`, and `/settings`. Reloads and browser back/forward restore the screen. Legacy `/login?callbackUrl=/transactions` links return to the requested screen after sign-in; external return destinations are ignored.

Deploy this standalone repository with the Vite preset and repository root as the root directory. `vercel.json` uses `npm ci`, `npm run build`, the `dist` output directory, and SPA rewrites for direct screen URLs. No monorepo workspace filter is needed.

The merchant team backend in `paypal-mediator-production` adds team creation, invitations, and selected-team headers. Those flows are not wired into either frontend yet; this synchronization preserves their current behavior.

## Keyboard controls

- Up/Down: sidebar navigation on load or after selecting a sidebar screen.
- Command/Ctrl+K: open Transactions search; Escape exits typing.
- Left/Right: transaction readiness filters; Down enters table; Up/Down wraps through rows; Enter opens details.
- Escape: evidence → transaction details → Transactions → sidebar focus.
- Settings: Up/Down switches categories; Escape closes the dialog.

Tests cover authenticated API requests, query filters, idempotency keys, binary evidence, nullable order fields, stale investigation and verification runs, URL routing, and public runtime configuration.
