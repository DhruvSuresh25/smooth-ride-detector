<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep sign-in diagnostics in `auth-errors.ts` and AI recovery behind a public `createServerFn`; this centralizes safe messaging and keeps prompts and credentials server-side.
- MCP server lives in src/lib/mcp/ with Supabase OAuth; tools use supabaseForUser so RLS runs as the caller.
- In-app notifications and audit entries are written only by database triggers/security-definer functions (notify_report_events, audit_trigger, sync_overdue); clients never insert them, so they can't be forged.
- Overdue notices are raised by sync_overdue() when a staff member opens the app, not a cron job, to avoid a constantly running database.
- Leaflet is loaded via dynamic import inside ReportsMap's effect so SSR never evaluates it.
- Keep business rules and data hooks in `src/features/<domain>/` and reusable rendering in `src/components/`; this prevents screen code from owning duplicated business logic.
- Keep internal server functions in `src/lib/api/` and old `.functions.ts` paths as compatibility exports; this organizes API growth without breaking existing callers.
- Use a new QueryClient per router with shared query/mutation failure feedback, AuthProvider for session state, and local/URL state for drafts and filters; this avoids competing stores and cross-request cache leakage.
- Validate API inputs and verify administrator access through the authenticated caller before dynamically loading privileged clients; this keeps authorization fail-closed and secrets server-side.
- Store non-secret defaults in `src/config/` and read managed server credentials only inside execution boundaries; this separates deployment configuration from application behavior.
- Use kebab-case for new modules, PascalCase component names, and TanStack route naming; preserve compatibility paths instead of renaming public interfaces.
- Keep pure-rule regression tests beside their feature/API modules and run them with Vitest; this makes behavior-preserving refactors checkable.
