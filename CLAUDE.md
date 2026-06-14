# CLAUDE.md

Guidance for working in this repo. Read this before making changes. (See also
`AI_RULES.md` for the original generic stack rules — note some of it is stale;
this file reflects how the app is *actually* structured.)

## What this is

Fortress — a multi-tenant inventory suite, originally warehouse-focused, pivoted
to restaurant **food-cost variance**, now a one-engine / three-profile product:

- **Business modes** (industry profiles): `warehouse`, `restaurant`, `retail`.
  One inventory engine; the UI (nav, dashboard, item fields) reshapes per mode.

Stack: **Vite + React 18 + TypeScript**, **Supabase** (Postgres + RLS + Edge
Functions + Storage + Realtime), **Tailwind + shadcn/ui (Radix)**, **Capacitor**
(iOS/Android), **next-themes**, **TanStack Query/Table**. Deployed on **Vercel**
from `main`.

## Commands

- Build / typecheck gate: `npx tsc && vite build` (the `build` script). **`tsc`
  passing is the real gate** — keep it green.
- Tests: `pnpm test` (vitest, currently ~24 tests).
- Lint: `npx eslint <files>`. The repo has **pre-existing** lint errors
  (`catch (error: any)`, `react-hooks/exhaustive-deps`, empty interfaces). Don't
  fix-all; just don't add *new* ones. Lint is not the gate; tsc is.
- Before any push: run `tsc`, `vite build`, and `pnpm test`.

## Architecture / conventions

- **Routes live in `src/AppContent.tsx`** (lazy-loaded), not `App.tsx`/`Index.tsx`.
  The home route `/home` → `src/pages/Dashboard.tsx`, which **routes by business
  mode** (retail → `RetailDashboard`, else → variance `DashboardVariance`).
- **State = React Context providers** (one per domain): `InventoryContext`,
  `RecipeContext`, `OrdersContext`, `ProfileContext`, `OnboardingContext`
  (folders/locations), `UnitOfMeasureContext`, variance contexts, etc. Providers
  are nested in `AppContent.tsx`.
- **Multi-tenancy:** everything is scoped by `profile.organizationId`; Supabase
  RLS enforces `organization_id = (profile's org)`. Always set `organization_id`
  on inserts.
- **Business modes:** `src/lib/businessModes.ts` is the single source of truth
  (mode → feature map, metadata, dashboard titles). Read the current mode with
  `useBusinessMode()` (`src/hooks/useBusinessMode.ts`), which derives it from the
  org-level `industry` field. Gate features with `hasFeature(...)`; gate nav by
  tagging `NavItem.modes` in `src/lib/navigation.ts` (omit = all modes).
- **Theming:** `next-themes` with `attribute="class"` and custom themes
  (`light`, `dark`, `emerald`, `deep-forest`, `tropical-indigo`) defined as
  `html.<theme>` blocks in `src/globals.css`. `ThemeInitializer` applies the org
  theme **once** on load (guarded by a ref) so a manual toggle isn't reverted.

## Supabase / database — IMPORTANT GOTCHAS

- **The deployed schema was app-builder-generated and can differ from the
  migration files in `supabase/migrations/`.** Don't trust the migration `.sql`
  as ground truth for column names/constraints — inspect the live table.
- **When an insert returns `400 Bad Request`** (not 401/403 — those are RLS), it
  is the *row shape* being rejected: a missing column, a type mismatch, or a
  **legacy `NOT NULL` column the app doesn't populate**. Diagnose with:
  ```sql
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='<table>' ORDER BY ordinal_position;
  ```
  Real example fixed this session: `recipe_ingredients` had legacy
  `inventory_item_id`, `unit_id`, and `quantity_needed` as `NOT NULL`, but the
  app sends NULL (manual ingredient / no unit) or never writes `quantity_needed`
  (it uses `quantity`). Fix = `ALTER COLUMN ... DROP NOT NULL` + reload cache.
- After DDL, **reload PostgREST's cache**: `NOTIFY pgrst, 'reload schema';`
  (a stale cache itself causes 400s on newly added columns).
- **RLS pattern:** `FOR SELECT USING (org match)` + `FOR ALL USING (org + role in
  ('admin','inventory_manager'))`. Add an explicit `WITH CHECK` on manage
  policies. If only one table fails to insert, suspect a leftover/restrictive
  policy — drop *all* policies on it and recreate clean.
- **Send new/optional columns conditionally** so inserts work *before* a
  migration is applied: `...(item.barcode ? { barcode: item.barcode } : {})`
  (used for `barcode`, `usage_unit_id`).
- Cross-org safety: include `.eq("organization_id", profile.organizationId)` on
  updates/deletes.

## Inventory items

- Item identity: `sku` (unique), `barcodeUrl` (QR-encoded value), and `barcode`
  (printed 1D UPC/EAN, separate column added this session). Quick Scan + warehouse
  tools match on all three.
- Quantity model: `pickingBinQuantity` + `overstockQuantity` (warehouse);
  `quantity` is the derived total. Stock adjustments spread the item and bump
  `pickingBinQuantity`, then log via `useStockMovement().addStockMovement`.

## Scanning (camera + hardware)

- **Camera decoding uses ZXing (`@zxing/browser` `BrowserMultiFormatReader`) in
  `src/components/CameraFeed.tsx`** — NOT html5-qrcode (which can't read 1D
  barcodes on iOS WebKit; all iOS browsers are WebKit). Key requirements that
  make 1D work on iPhone: high-res constraints (`width/height ideal 1920x1080`),
  `TRY_HARDER` + explicit `POSSIBLE_FORMATS`, `<video playsInline muted>`, and
  **stop the MediaStream tracks + clear `srcObject` on stop** (or reopening
  stalls on "Loading camera").
- `CameraScannerDialog` wraps `CameraFeed`; supports a `continuous` prop
  (keep scanning, debounced) — currently the Quick Scan station closes on each
  scan for clear confirmation.
- `QuickScanStation` (`/quick-scan`, nav for retail+warehouse) is a
  keyboard-wedge + camera station: Check / Stock In / Stock Out, resolves a code
  via `handleResolve` against an in-memory lookup map.

## Mobile / UI conventions (learned this session)

- **No horizontal page scroll:** `html, body, #root { overflow-x: hidden;
  max-width: 100% }` (global guard) + `min-w-0` on the Layout's flex containers
  so wide content (tables) scrolls *inside* its own box. Tables already wrap in
  an `overflow-auto` div.
- **Sticky header:** the header is `sticky top-0 z-30` in `src/components/
  Header.tsx`. ⚠️ Do **not** put `overflow-x-hidden` on an *ancestor* of a sticky
  element — it silently breaks `position: sticky`. Keep horizontal clipping on
  the global root only.
- **Big numbers in cards:** use compact formatting (`Intl.NumberFormat` with
  `notation: "compact"` → `$1.2M`) + responsive sizing (`text-xl sm:text-2xl`) +
  `tabular-nums break-words` so 6-figure values don't overflow.
- Mobile header shows a dark/light toggle (desktop shows date/time). Removed the
  mobile tap-flash via `* { -webkit-tap-highlight-color: transparent }`.
- Multi-tab rows: don't use fixed `grid-cols-N` with `whitespace-nowrap` on
  mobile (overlaps + forces overflow). Use `grid-cols-2 sm:grid-cols-N h-auto`
  with wrapping labels.
- The tawk.to live chat (`LiveChatWidget`) is intentionally **disabled**
  (commented out in `AppContent.tsx`).

## React data-display gotcha

List rows often load *without* their children (e.g. recipes without
ingredients). Don't cache a "full" version at one moment and let it shadow fresh
state (caused recipe cards to show stale "No ingredients yet"). Prefer: render
from current context state, fetch detail on demand (e.g. card expand), and have
create/update attach the saved children to state.

## Git / deploy workflow

- Develop on branch **`claude/elegant-bell-ytabes`**. Commit with identity
  `Claude <noreply@anthropic.com>` (commits are SSH-signed → "Verified").
- For live demos the user deploys from `main` (Vercel): after pushing the feature
  branch, fast-forward `main` and push it:
  `git checkout main && git merge --ff-only <branch> && git push origin main`,
  then return to the feature branch.
- Do not create PRs unless asked.

## Edge functions

Live in `supabase/functions/*` (Deno). When calling the Claude/Anthropic API
from one, use the Anthropic SDK via `npm:@anthropic-ai/sdk`, model
`claude-opus-4-8`, with adaptive thinking; check `stop_reason` before reading
content. (An invoice-PDF reader was prototyped then removed earlier in history.)
