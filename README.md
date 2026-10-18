# DriveSafe Vision

Real-time pothole detection, civic reporting, and road-repair tracking. The existing citizen, area-admin, and super-admin experiences share one application.

## Development

```sh
bun install
bun run dev
bun run test
```

Development runs at `http://localhost:8080`. The managed preview validates compilation automatically. `bun run lint` checks coding conventions; `bun run format` formats the project. Do not restart the managed preview server manually.

## Folder structure

```text
src/
  assets/                    Bundled images
  components/                Reusable presentation
    auth/                    Sign-in and password fields
    brand/                   Logo
    charts/                  Analytics charts
    layout/                  Citizen/admin shells and navigation
    map/                     Dynamically loaded Leaflet views
    reports/                 Evidence, status, rating widgets
    ui/                      Shared design-system controls
  config/                    Non-secret defaults and pure config validation
  features/
    auth/                    Auth context, profile query, sign-out
    reports/                 Types, queries, filters, statistics, submission
    staff/                   Roles, areas, performance, admin queries
    storage/                 Private-image signed URL queries
    users/                   User-list aggregation
  hooks/                     Compatibility entry points and shared hooks
  integrations/supabase/     Managed Cloud clients/types; do not edit generated files
  lib/
    api/                     Internal server functions and common request helpers
    email-templates/         Existing account/invitation email support
    mcp/                     OAuth-protected agent interface
    query-client.ts          Per-router query cache and shared failure feedback
    *.functions.ts           Compatibility exports for existing callers
    *.server.ts              Server-only AI implementation
  routes/                    TanStack file routes, thin screen composition
  services/                  Browser image preparation and annotation
  styles.css                 Semantic design tokens and global styling
  router.tsx                 Router and request-local QueryClient
  start.ts                   Existing bearer-token middleware

drizzle/migrations/          Versioned database changes
public/                      Public static assets
```

New modules use kebab-case filenames, PascalCase React component names, camelCase functions, and `use`-prefixed hooks. Existing route filenames follow TanStack's conventions. Existing PascalCase component files and compatibility exports remain to avoid breaking callers; new business logic belongs in features rather than UI files.

## Responsibilities and state

- **UI:** reusable controls and rendering in `components`; routes own screen composition, forms, navigation, and feedback.
- **Business rules:** report filtering, status counting, resolution statistics, and performance classification are pure feature functions, independently testable.
- **Remote state:** TanStack Query owns profiles, reports, areas, permissions, performance, and signed-image URLs. Query keys and invalidation prefixes remain compatible with the existing app.
- **Authentication:** one `AuthProvider` owns session state; sign-out clears cached user data. Permissions come from protected database roles, never browser storage.
- **Transient state:** React state owns dialogs, file previews, progress, and draft form inputs. Do not duplicate remote data in a separate global store.
- **Shareable state:** the admin report filters remain in URL search parameters; each list owns its existing pagination.

## API boundaries

App-internal requests use TanStack `createServerFn` in `src/lib/api`. Validate inputs with Zod. Protected functions use `requireSupabaseAuth` and the existing bearer attachment in `src/start.ts`.

Administrator-only operations additionally call `assertAdminAccess` using the caller's authenticated client. A failed permission query denies access. Load the privileged Cloud client inside the handler only after authorization. Ordinary reads use caller-scoped row-level security; public statistics use a request-local publishable client with no persistent session.

Raw HTTP integrations retain their existing route contracts (MCP, OAuth discovery, managed email webhooks). New external webhooks/APIs belong under `src/routes/api/public/`, must validate inputs and verify callers/signatures themselves, and must not return private information anonymously. Do not create empty versioned endpoints solely for organization.

Keep return values serializable. Existing exported function names and old import paths remain compatibility entry points to avoid breaking the published integration contracts.

## Error handling

`assertRequestSucceeded` prevents request failures from being treated as empty data or successful updates; messages are safe and contextual. It logs only a category/code, not payloads or credentials. `errorMessage` handles unknown thrown values without assuming `Error`.

Shared query/mutation caches provide fallback feedback; mutations with their own error callbacks do not receive duplicate mutation notifications. Route error boundaries remain the final recovery layer. Auth guidance stays centralized in `auth-errors.ts`, with a public, rate-limited server-side AI recovery function.

Multi-step administrator changes are **not transactional**. If a later step fails, earlier changes may already have completed: refresh and inspect before retrying. Refactoring does not replace these workflows with a transaction or alter database policies. Photo upload/report insertion likewise preserves the existing sequence.

## Configuration and secrets

`src/config/app.ts` holds non-secret application origin and AI defaults. `src/config/environment.ts` validates values without reading environment bindings itself.

| Boundary | Configuration |
| --- | --- |
| Browser | Managed `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` |
| Public server reads | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, read inside handlers |
| Privileged server work | Managed generated server client, dynamically loaded after authorization |
| AI | Server-only `LOVABLE_API_KEY`, read inside server execution |

Never place private keys in source, `VITE_*` variables, browser storage, logs, or documentation. Configure secrets through Lovable Cloud; do not edit generated clients or `.env`. Published deployments need publishing to receive changed server configuration. No sample credential file is included intentionally.

## Reporting, access, and AI

Citizens submit photos/location, track their own reports, and rate fixed repairs. Area admins work within assigned areas; super admins manage accounts, assignments, deadlines, and performance. Database row-level security is the authority for visibility and write permissions. GPS routing, deadlines, notifications, overdue synchronization, and audit history remain database-owned.

Private image references retain `<bucket>/<user-id>/<filename>` paths and are displayed through short-lived signed URLs. Notification/audit entries are created by database triggers or protected functions, not client inserts.

Image preparation/annotation lives in `src/services/pothole-analysis.ts`; authenticated vision requests call `src/lib/api/pothole-vision.functions.ts`, whose server-only helper calls the AI gateway. The app uses real AI-assisted analysis, not a trained local YOLO detector. Severity and dimension estimates are not independent field measurements. MCP tools use the OAuth caller's Cloud client so row-level security still applies.

## Tests and verification

Run `bun run test` for regression coverage of report searching, area filtering, date cutoffs, severity sorting, statistics, administrator authorization, and configuration/error boundaries. Add focused tests next to any changed business rules; never use snapshots or copy assertions as substitutes for behavior tests.

Before shipping a refactor, check public pages, restore a permitted real session, open report lists/details and images, exercise filtering, and verify error recovery. Destructive account actions should not be run against real user data just to test a cleanup.
