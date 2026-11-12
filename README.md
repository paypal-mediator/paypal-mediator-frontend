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

Startup preloads every accessible team's profile, first transaction/dispute pages,
latest activity, integrations, and billing before showing the workspace. Team loads
run in bounded parallel batches. Navigation and team switching reuse an in-memory
cache scoped to that team and signed-in session. Background refreshes keep existing
rows visible; successful writes invalidate cached reads. Extra pages, filters, and
unvisited detail records load on demand and are reused on return. Failed sections
keep their own retry state without blocking the other tables.

On refresh, one loading screen covers session restoration, app code, account teams,
and all team workspace preloads. The workspace mounts with those results rather
than restarting each read. The URL stays on the requested screen; startup failures
stop at an error with an explicit retry instead of cycling through loading screens.

The sidebar lists all active teams. Creating another team adds it to that list
without replacing the current workspace or navigating away. The wizard displays
creation progress and a confirmation; opening the new team is an explicit action.
For a first team, the account stays on the team chooser until the user opens it.
Team selection is remembered per account, and each team's data cache stays separate.
Team names only expand or collapse their own menu; other expanded menus stay open.
Selecting a menu option opens that team's requested screen, without detouring through
Overview. Expanded menus are remembered per account across navigation and refreshes.

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

Dashboard follow-up: the connected evidence screen reuses the original split
cards, per-category uploads, search, and revision sidebar with backend records.
Older revisions are read-only. Manual refresh controls are removed; a browser
reload fetches fresh workspace data. Dispute rows display one colored PayPal
status pill. Activity entries and inbox notifications open the selected event's
activity details, with transaction navigation available as an explicit action.

Lists now collect every backend page before client-side searching/filtering;
transactions, disputes, and activity have no pagination footer. Transaction rows
prime their detail cache, likely evidence/cases warm in the background, and row
hover/focus prefetches details. Writes retain existing data during revalidation;
uncached reads use the full-screen workspace loader. Team options reuse the
original popover, with persistent account-scoped pin/order and backend renaming.
