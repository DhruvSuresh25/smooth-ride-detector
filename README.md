# DriveSafe Vision — Real-Time Pothole Detection Using Deep Learning

DriveSafe Vision is a responsive web application for reporting and managing road potholes. It has
two experiences:

- **Citizen portal** — upload a road photo, run an analysis, capture the location, submit a report
  and follow its progress.
- **Administrator portal** — review every submitted report, inspect the evidence, update statuses
  with notes, manage accounts and monitor statistics.

## Tech stack

React 19 + TypeScript, TanStack Start / TanStack Router, TanStack Query, Tailwind CSS v4,
shadcn/ui, Lucide icons, Recharts, and Lovable Cloud (Postgres database, authentication and file
storage) as the backend.

## Running locally

```bash
bun install      # or: npm install
bun run dev      # or: npm run dev
```

The app starts on http://localhost:8080.

## Backend configuration

The backend is already provisioned and connected. The app reads these variables from `.env`
(committed values are public, client-side keys):

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Backend API URL used by the browser |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public key used by the browser (row-level security applies) |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | Same values for server-side rendering |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key used by administrator-only server functions |

Never expose the service-role key to browser code.

### Database tables

- `profiles` — one row per account: full name, email, avatar, notification preferences, account
  status. Created automatically on sign-up by a database trigger.
- `user_roles` — role assignments (`user` or `admin`). Roles are deliberately **not** stored on
  `profiles`, to avoid privilege escalation.
- `reports` — report number (`RPT-0001`…), submitter, images, address and coordinates, pothole
  count, severity, confidence, estimated dimensions, road position, description, status, admin
  notes and timestamps.
- `report_status_history` — an append-only trail of status changes with the acting administrator.

Row-level security is enabled on all tables: citizens can read and create only their own reports
and profile; administrators can read everything and update report status and notes. Status-history
rows can only be written by administrators.

### Storage buckets

`report-original-images`, `report-annotated-images` and `avatars` are **private**. Files are stored
under a per-user folder (`<user-id>/<file>`) and displayed through short-lived signed URLs, so
images are never publicly listable.

## Secure administrator setup

There are no built-in or hardcoded administrator credentials, and the interface never grants admin
rights. To promote an account:

1. Have the person register normally through `/register`.
2. Add an admin role row for their account in the database (Cloud → Database → SQL):

   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'person@example.com'
   on conflict (user_id, role) do nothing;
   ```

3. They can now sign in at `/admin/login` and reach `/admin/*`.

Admin checks run against `user_roles` through the `has_role()` security-definer function, both in
row-level security policies and in server functions — not in browser code.

## Connecting a real detection model

Analysis lives in one file: `src/services/potholeAnalysis.ts`. Today it runs a **simulated**
detector so the whole workflow is testable, and the UI states this clearly wherever results are
shown. It is not a verified computer-vision result.

To connect a real model (YOLO, Roboflow, a Hugging Face endpoint, or your own Python service):

1. Replace the body of `analyzeRoadImage(file, onProgress)` with a request to your detection
   endpoint, keeping the same signature.
2. Map the response to the exported `AnalysisResult` shape (pothole count, severity, confidence,
   estimated width/height, road position, detection boxes, annotated image blob).
3. Set `isDetectionApiConfigured = true` in the same file — the disclaimer and the admin Settings
   page switch over automatically.
4. Keep API keys server-side: add the key as a backend secret and call your provider from a server
   function rather than from the browser.

Nothing else in the app needs to change.

## Project structure

```
src/
  components/      brand, layout shells, auth fields, report widgets, charts, shadcn/ui
  hooks/           authentication and profile hooks
  lib/             constants, report queries, admin-only server functions
  routes/          file-based routes (public, auth, /_authenticated user + admin areas)
  services/        pothole analysis service (swap in a real model here)
```

## Report workflow

`Pending → Under Review → Action Taken → Resolved`, with `Rejected` as an alternative outcome.
Every change is written to the status history and shown to the citizen as a timeline; resolving a
report stamps its resolution time, which feeds the average-resolution metric in the admin portal.
