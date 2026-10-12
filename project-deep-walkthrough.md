# Project Deep Walkthrough

A start-to-end guide to this clinic management system. Read it in order the first time. After that, use the file catalog and the API catalog as a map.

This document explains how the project is planned, how a request moves through it, what each file is for, and why the patterns are there. The "why" matters more than the syntax. A pattern you can defend is a pattern you can reuse.

---

## 1. What this system is

A clinic has people. A person signs in once, with Google. That same person can work at more than one clinic, and at each clinic they can hold more than one job: admin, doctor, receptionist.

Two kinds of power exist, and they are not the same thing:

| Kind | Stored on | What it means |
| --- | --- | --- |
| Platform role | `user.platform_role` | `super_user` runs the platform: create clinics, attach staff, approve accounts. Assigned in the database, never by the user filling in a form. |
| Staff role | `staff_role.role` | What that person may do inside one clinic. An admin at Clinic A is not an admin at Clinic B. |

A session remembers which clinic the user is working in (`session.active_clinic_id`). Null means "no clinic selected". A super user may also clear it on purpose and work in platform mode.

The product today is the shell around that model: sign-in, session, clinic switching, and the staff/clinic APIs. The dashboard home page is a welcome screen. Patients, appointments, and billing are not in this repository.

---

## 2. How the repository is shaped

This is a pnpm workspace. One lockfile, one install, several packages.

```text
clinic-management-fullstack-best-practices/
├── apps/
│   ├── api/                 Hono server. Owns the database.
│   └── dashboard/           Vite + React app. Owns no business rules.
├── packages/
│   ├── shared-lib/          Zod schemas, staff roles, API response shape.
│   ├── eslint-config/       Shared lint rules.
│   └── typescript-config/   Shared TypeScript settings.
├── erd/                     The data model, written before the tables.
├── docker-compose.yml       Postgres only. The apps run on your machine.
├── pnpm-workspace.yaml      Which folders are packages, plus the version catalog.
└── package.json             Scripts that fan out to every package.
```

Why a monorepo: the browser and the server must agree on the shape of a request. If the staff-role enum lived in two places, they would drift. It lives once, in `packages/shared-lib`, and both apps import it.

Why the API owns the database: the dashboard never opens a SQL connection. It cannot forget a `WHERE clinic_id = ?`. Every clinic-scoped query is written on the server, next to the authorization check.

### Dependency direction

```text
dashboard  ──imports types and schemas──▶  shared-lib
dashboard  ──imports auth and response types──▶  api (types only)
api        ──imports schemas and roles──▶  shared-lib
api        ──never imports──▶  dashboard
```

The dashboard may import `@repo/api/client-types` and `@repo/api/types`. Those entry points export types. They must not pull server code into the browser bundle. The client type files use `import type`, which TypeScript erases.

---

## 3. Run it

Requirements: Node 24, pnpm 11, Docker, and the `portless` CLI (named local HTTPS URLs).

```bash
pnpm install
pnpm docker:up          # Postgres on localhost:5442
pnpm --filter @repo/api db:migrate
pnpm dev                # API + dashboard together
```

Or start them separately:

```bash
pnpm --filter @repo/api dev          # https://api.cms-local.dev
pnpm --filter @repo/dashboard dev    # https://app.cms-local.dev
```

Other root scripts:

| Script | What it does |
| --- | --- |
| `pnpm build` | Production build. Only the dashboard has a build script. pnpm skips packages that do not define one. |
| `pnpm --filter @repo/api typecheck` | Typecheck the API without emitting files. |
| `pnpm --filter @repo/api db:generate` | Create a new Drizzle migration from schema changes. |
| `pnpm --filter @repo/api db:studio` | Open Drizzle Studio against the database. |
| `pnpm --filter @repo/api auth:generate` | Regenerate `auth.schema.ts` from the Better Auth config. |
| `pnpm docker:down` | Stop Postgres. Does not delete data. |

### Why the URLs are names, not ports

`portless` puts a local HTTPS proxy in front of whatever port the process actually bound. The browser always uses `https://api.cms-local.dev` and `https://app.cms-local.dev`.

That matters for cookies. A session cookie set for `localhost` is shared by every app on your machine. A cookie set for `api.cms-local.dev` is not. OAuth redirect URLs also stay stable when the real port changes.

The proxy must use the `.dev` TLD, because that is what `.env` says:

```bash
portless proxy stop
portless proxy start --https --tld dev
```

`.dev` is on the browser HSTS preload list, so the browser will refuse plain HTTP. The proxy's HTTPS certificate is the point.

### Environment files

| File | Who reads it |
| --- | --- |
| `.env` | Shared values: `APP_ENV`, public URLs, Postgres host/user/password/database. Docker Compose reads this file automatically. |
| `apps/api/.env` | API port, log level, `DATABASE_URL`, Better Auth secret, Google OAuth client. |
| `apps/dashboard/.env` | `VITE_APP_ENV`, `VITE_API_URL`. Only `VITE_` variables are visible to browser code. |

Scripts load them with `dotenv -e .env -e ../../.env`, so a package file and the root file are both applied.

Both apps parse `process.env` / `import.meta.env` with Zod at startup (`apps/api/src/config/env.ts`, `apps/dashboard/src/config/env.ts`). A missing or malformed variable crashes the process immediately, with a message that names the variable. That is better than a `undefined is not a function` twenty requests later.

`.env` files are gitignored. `.env.example` files are not. Copy the examples, then fill in real values. Google sign-in will not complete until `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are a real OAuth client whose authorized redirect URI is `https://api.cms-local.dev/api/auth/callback/google`. A placeholder such as `replace-me` gets as far as Google's page and then fails with `invalid_client`.

`SUPER_USER_EMAILS` is a comma-separated list. On first Google sign-in, a matching email is created as `status: active` and `platformRole: super_user`. Everyone else is created as `pending` and cannot get a session until a super user activates them.

### Docker project name

`docker-compose.yml` sets `name: cms-fullstack`. Compose uses that name for the container, the network, and the volume. Two repos that share a compose name also share a volume. `pnpm docker:up` in one of them can then replace the other's database. Keep this name unique to this repository. Postgres is published on host port **5442** so it does not collide with a Postgres already on 5432 or 5433.

---

## 4. The design, as a set of decisions

These decisions were made so the next feature has an obvious place to go.

### 4.1 One response shape

Every JSON body from this API looks like this:

```json
{
  "responseCode": "ok",
  "message": "Clinics retrieved successfully",
  "data": {}
}
```

Errors use the same idea, plus `path`, and sometimes `details`. The HTTP status is the status line, not a field the client has to trust inside the body.

`responseCode` is a closed set of strings (`ok`, `unauthorized`, `forbidden`, `input_validation_failed`, ...), defined once in `packages/shared-lib/src/api-response/index.ts`. The client branches on that code. It does not scrape English sentences, and it does not invent a parallel set of codes.

`ApiResponse<T>` is a class so a handler writes `new ApiResponse({ ... })` and TypeScript checks that `data` matches `T`. The conditional type on `ApiResponseBody` is there so a response with no payload cannot accidentally require `data`, and a response that declares a payload cannot forget it.

### 4.2 Validate at the edge, trust the inside

HTTP is untyped. The first thing a handler does with input is run it through a Zod schema from `shared-lib`. After `ctx.req.valid("json")`, the handler sees a typed object, not `unknown`.

Services do not re-parse that object. They receive a parameter object whose types already came from the schema. Validation has one door.

### 4.3 Controllers are thin, services own the rules

A controller:

1. Reads the validated input and the session from context.
2. Calls one service function.
3. Wraps the result in `ApiResponse`.

A service:

1. Loads rows.
2. Decides whether the action is allowed (not found, conflict, forbidden).
3. Writes, inside a transaction when more than one write must succeed together.
4. Returns a plain object the controller can serialize.

If a rule is in the controller, the next caller of the service will forget it. The "you cannot remove your own admin role" check lives in `staff.service.ts` for that reason. Both the clinic-admin route and the super-user route call the same function.

### 4.4 Authorization is a stack of middleware, and the types get stricter as you pass each one

```text
loadSession          user and session may be null
requireAuth          user and session are present, and the user is active
requireSuperUser     same, and platformRole is super_user
requireActiveClinic  activeClinicId is a number, staffRoles is loaded
requireStaffRole     same, and the role check passed
```

Each middleware is generic over a Hono environment type. `requireAuth` returns a type where `user` is no longer nullable. The handler after it does not need `if (!user)`. The compiler already proved it.

This is also why `requireStaffRole` is a function that returns middleware, not a middleware itself. The allowed roles are arguments: `requireStaffRole("admin")`.

### 4.5 The active clinic is server state

The dashboard does not store "current clinic" in `localStorage`. It is a column on the session row. Switching clinics is `PATCH /api/session/switch-clinic`. After a successful switch the page reloads, so every query refetches against the new clinic. A reload is blunt, and it is correct: nothing on the page can keep showing the previous clinic's data.

### 4.6 Identity comes from Google, status comes from us

Better Auth creates the user and the session. Our hooks decide the status:

- New user whose email is in `SUPER_USER_EMAILS`: `active` + `super_user`.
- Any other new user: `pending`.
- On session create, `pending` and `inactive` throw and no session is stored.
- If an active session's user is later deactivated, `requireAuth` revokes that session on the next request.

Google tells us who the human is. The `user.status` column tells us whether this product will let them in.

### 4.7 Admin is a superset

`staffHasRole` in `packages/shared-lib/src/staff-roles.ts` is the only definition of this rule:

- A direct role match always counts.
- A person with `admin` also satisfies `doctor` and `receptionist`.

The API middleware and the React hook both call that function. If the rule lived in both places, one of them would be updated and the other would not. The UI would hide a button the API still allowed, or the reverse.

Super users skip the staff-role check entirely. They are not staff. They are the platform.

---

## 5. A request, from the button to the row

Follow "switch clinic". It touches every layer.

```text
ClinicSwitcher
  useMutation(switchClinicMutationOptions())
    └─ mutationFn: switchClinic()                     apps/dashboard/src/api/session.ts
         └─ ky.patch("session/switch-clinic")         credentials: "include"  (sends the cookie)
              └─ https://api.cms-local.dev/api/session/switch-clinic

Hono app.ts pipeline, in order:
  1. requestId            every log line can be tied to this request
  2. pino logger          assigned onto the context
  3. body limit 100KB     larger bodies throw payloadTooLarge
  4. logRequest           clones the body so logging does not consume it
  5. CORS                 only the dashboard origin, credentials allowed
  6. loadSession          reads the Better Auth cookie, sets user/session/isSuperUser
  7. route match          sessionController

sessionController:
  requireAuth             401 if no session, 403 if the user is not active
  SwitchClinicSchema      400 if clinicId is missing or not a positive integer or null
  switchClinic()          service checks the clinic exists and the user may enter it
  ApiResponse             200 { responseCode: "ok", message, no data }

Browser:
  onSuccess reloads the window
  on error, handleApiError reads the JSON message and sonner shows it
```

### Why the log middleware clones the body

A request body is a stream. Read it once and it is gone; the validator then sees an empty body and returns a confusing 400. `readRequestBody` calls `ctx.req.raw.clone().json()`. The original stream stays intact for Zod and for Better Auth.

The same function redacts `authorization`, `cookie`, `password`, `token`, `access_token`, and `refresh_token` before they hit the log. Server logs are widely copied. A session token in a log line is a stolen session.

### Why CORS is locked to one origin

`cors({ origin: env.DASHBOARD_URL, credentials: true })`. With credentials, `Access-Control-Allow-Origin: *` is illegal and unsafe. The cookie should only be sent to, and accepted from, the dashboard we shipped.

### The middleware order is the security order

`loadSession` runs for every path, including `/api/auth/*`, but it does not reject anyone. Rejection happens on the route. A public route that forgot `requireAuth` would still have `user === null` available, and the handler would have to be written to notice. Clinic and staff routes are not written that way: the router attaches `requireAuth` with `.use("*", requireAuth)` before any handler in that controller. A new handler added to that controller inherits the check.

---

## 6. Authentication, in the order it actually happens

### 6.1 The browser asks Better Auth to start Google

`apps/dashboard/src/lib/auth-client.ts` creates the client with:

- `baseURL: env.VITE_API_URL` so requests go to the API host, not the dashboard host.
- `credentials: "include"` so the session cookie is stored and sent.
- `inferAdditionalFields<Auth>()` so `user.status`, `user.platformRole`, `user.phone`, and `session.activeClinicId` exist on the client type.

`Auth` is `typeof auth` from the server (`apps/api/src/types/auth.types.ts`). The dashboard does not re-declare those fields. If the server adds a field, the client type changes with it.

### 6.2 Better Auth finishes on the API

`apps/api/src/app.ts` mounts the handler at `/api/auth/*`. Better Auth's own base path is `/api/auth`, so the client and the server meet.

`apps/api/src/lib/auth.ts` configures:

- Drizzle adapter against the same `db` the rest of the API uses.
- Google, with `prompt: "select_account"` so a shared computer can pick the right Google account.
- `advanced.database.generateId: "serial"` so user and session ids are integers, matching the rest of the schema. String ids would force every foreign key to be text.
- `additionalFields` with `input: false`. The client cannot send `platformRole: "super_user"` or `status: "active"` and have it stick. Those columns are written only by our hooks and our services.
- `onAPIError.errorURL` sends the browser back to `/login` when Better Auth itself fails.

### 6.3 The create-user hook

Before the user row is inserted, the hook lowercases the email and decides status. Promotion is an allow-list of emails, not a checkbox on the sign-up form.

### 6.4 The create-session hook

`before` loads `user.status`:

| Status | Result |
| --- | --- |
| `active` | Session is created. |
| `pending` | `APIError` with code `pending`. Better Auth redirects to `/login?error=pending` (or returns the error). |
| `inactive` | Same, with code `inactive`. |
| anything else | `never` check. If a new status is added to the union and this switch is not updated, TypeScript fails the build. |

`after` calls `resolveActiveClinicIdOnLogin`. If the user has exactly one active staff membership, that clinic id is written onto the session. If they have zero or several, `active_clinic_id` stays null and the clinic switcher asks them to choose. Picking `rows[0]` with no `ORDER BY` would have chosen a different clinic on different days. The query is ordered by `clinic.id`, and it only auto-selects when the length is 1.

### 6.5 Route guards on the dashboard

`apps/dashboard/src/app.tsx`:

```text
/login          PublicRoute → AuthLayout → LoginPage
/               ProtectedRoute → AppLayout → DashboardPage
*               NotFoundPage
```

`PublicRoute`: while `useSession()` is pending, show a full-screen loader. If a session exists, send the user to `returnTo` or `/`. This is what stops a signed-in user from sitting on the login page.

`ProtectedRoute`: pending shows the loader. A thrown session request (the API is down) shows `SessionError` with a retry button. A `null` session is the only "you are signed out" signal, and that redirects to `/login?returnTo=<where you were>`. Treating a network error as "signed out" would bounce people to login every time the API blips.

`resolveLoginRedirect` accepts only paths that start with a single `/`. `//evil.example` is rejected. `https://evil.example` is rejected. That is the open-redirect check. `returnTo` is our own query param, so we have to be the ones who refuse to send the browser somewhere else.

`LoginReasonBanner` only renders for the known codes `pending` and `inactive`. Any other `error` query value is ignored, so a crafted URL cannot put arbitrary text on the page.

### 6.6 What each role is allowed to call

| Route | Who |
| --- | --- |
| `GET /api/clinics` | Any active signed-in user. Returns clinics where they are active staff. |
| `PATCH /api/session/switch-clinic` | Any active signed-in user. Super users may pass `clinicId: null` (platform mode) or any clinic id. Everyone else must be active staff at that clinic. |
| `GET /api/staff` and `GET /api/staff/:staffId` | Active session with an active clinic. Staff need a role at that clinic. Super users pass with the clinic they have selected. |
| `PATCH /api/staff/:staffId/roles` and `.../status` | Same, plus `requireStaffRole("admin")`. Super users pass. An admin cannot remove their own admin role, and cannot change their own membership status. |
| `POST /api/su/clinics` | Super user. |
| `POST /api/su/staff` and the super-user role/status patches | Super user. These are not limited to the active clinic. |
| `PATCH /api/su/users/:userId/status` | Super user. Setting a user to anything other than `active` deletes their sessions in the same transaction. |

---

## 7. The data model

The drawing is `erd/main.dbml` (and `erd/main.dbdiagram` for the diagram tool). The tables that actually exist are the Drizzle schemas. When they disagree, the schema and the migrations win, and the ERD should be updated in the same change.

### Tables

`user`, `session`, `account`, `verification` are Better Auth's tables. Do not add columns to them by hand. Add an `additionalFields` entry in `auth.ts`, then run `pnpm --filter @repo/api auth:generate`, then generate a migration. The CLI output is `apps/api/src/db/schema/auth.schema.ts`. Our extra columns today are `user.phone`, `user.platform_role`, `user.status`, and `session.active_clinic_id`.

`clinic` is intentionally small: `id`, `name`. It exists so staff have something to point at.

`staff` is one row per user per clinic. The unique index on `(user_id, clinic_id)` is what makes "already a staff member" a database fact, not only an `if` in the service. Status is `active` or `inactive`. Inactive staff can still sign in; they just cannot use that clinic. Deactivating the user is the switch that blocks sign-in everywhere.

`staff_role` is one row per role on that staff membership. Unique on `(staff_id, role)`. Zero roles is allowed. A staff member with no roles fails `requireActiveClinic` ("No staff role found") and cannot call clinic-scoped routes. Roles are replaced as a set: the service diffs current vs incoming inside a transaction, deletes the removed ones, inserts the added ones.

### Naming

Tables, enums, and folders are singular: `user`, `clinic`, `staff`, `staff_role`. A row is one user. The table is the set of them, and the name still describes the row.

Columns are snake_case in Postgres (`active_clinic_id`) and camelCase in TypeScript (`activeClinicId`). Drizzle's `casing: "snake_case"` in `db.config.ts` does that translation. You write `activeClinicId` in the query builder and the SQL says `active_clinic_id`.

### Migrations

`apps/api/src/db/migrations/*.sql` are the history. `meta/_journal.json` is the order. `meta/*_snapshot.json` is Drizzle's picture of the schema after each migration. Do not edit an applied migration. Add a new one with `db:generate`.

The history in this repo:

| File | What changed |
| --- | --- |
| `0000_cheerful_catseye.sql` | Better Auth tables. |
| `0001_shiny_joseph.sql` | Clinic, the original clinic-user tables, and the extra user/session columns. |
| `0002_perfect_mysterio.sql` | `user.status` becomes `NOT NULL`. |
| `0003_normal_tombstone.sql` | Rename clinic-user to staff, and the role table to `staff_role`. |
| `0004_swift_radioactive_man.sql` | Default `user.status` changes from `active` to `pending`. |

`0004` is a product decision you can see in SQL: a brand-new account does not get in until someone approves it.

### IDs

Integer identity columns, everywhere. `Number(user.id)` shows up because Better Auth's inferred field type is a bit wider than our column. The casts are at the boundary. Inside services, ids are numbers.

---

## 8. API catalog

Base path: `/api`. Cookie session. JSON in, JSON out.

### `GET /api`

Health check. No auth. Returns the app name. Use it to see if the process is up and can speak HTTP. It does not check the database; the process already ran `SELECT 1` before it started listening.

### `GET|POST /api/auth/*`

Better Auth. Sign-in, callback, session, sign-out. Do not add business routes under this prefix.

### `GET /api/clinics`

Auth: active user.

Response `data`:

```ts
{
  clinics: Array<{
    id: number
    name: string
    roles: Array<"admin" | "doctor" | "receptionist">
    isActive: boolean
  }>
}
```

The active clinic is sorted first, then the rest by name. `isActive` is computed from `session.activeClinicId`, not stored on the clinic.

### `PATCH /api/session/switch-clinic`

Auth: active user.

Body (`SwitchClinicSchema`):

```ts
{ clinicId: number | null }
```

`null` is only legal for a super user. Success has a message and no `data`. The dashboard reloads rather than patching caches by hand.

### `GET /api/staff`

Auth: active user, active clinic, and (unless super user) at least one staff role.

Query (`ListStaffQuerySchema`):

| Param | Meaning |
| --- | --- |
| `status` | `active`, `inactive`, or `all`. Omitted means no status filter. |
| `role` | One role or several. `?role=admin` or `?role=admin&role=doctor`. The schema normalizes both to an array. |
| `search` | A numeric string matches `staff.id` exactly. Anything else is a case-insensitive match on name or email. |
| `sortBy` | `name` (default) or `createdAt`. |
| `sortDirection` | `asc` (default) or `desc`. |

The role filter is a subquery that joins `staff` again. That second reference is aliased as `staff_role_filter`. Using the same Drizzle table object in the outer query and the subquery makes Postgres see two relations named `staff`. The alias keeps them distinct.

Roles on each row come from a lateral subquery: `json_agg` of that staff member's roles, coalesced to `[]` when they have none. One query returns staff and roles together, so the handler does not do a second round trip per row.

### `GET /api/staff/:staffId`

Same auth as the list. `staffId` is coerced from the URL string to a positive integer. The row must belong to the active clinic. A staff id from another clinic is a 404, not a 403, so we do not confirm that the id exists somewhere else.

### `PATCH /api/staff/:staffId/roles`

Auth: clinic admin (or super user).

Body: `{ roles: StaffRoleName[] }`. This is a full replace, not a patch of one role. Duplicates in the array are collapsed. An admin who omits `admin` from their own roles gets 403.

### `PATCH /api/staff/:staffId/status`

Auth: clinic admin (or super user).

Body: `{ status: "active" | "inactive" }`. You cannot change your own membership. That stops the last admin from locking themselves out by accident. (They also cannot strip their own admin role, which is the other half of that guard.)

### `POST /api/su/clinics`

Auth: super user.

Body: `{ name: string }` trimmed, at least one character. Responds **201**.

### `POST /api/su/staff`

Auth: super user.

Body: `{ userId: number, clinicId: number }`.

The service refuses the call when:

- the user does not exist (404)
- the user is not `active` (403)
- the user is a super user (403) — platform operators are not staff
- the clinic does not exist (404)
- the membership already exists (409)

The new membership is `active` and has no roles until a roles request adds them.

### `PATCH /api/su/staff/:staffId/roles` and `.../status`

Same bodies as the clinic routes. No `clinicId` is passed, so the service does not restrict the row to the caller's active clinic.

### `PATCH /api/su/users/:userId/status`

Auth: super user.

Body: `{ status: "active" | "inactive" | "pending" }`.

If the new status is not `active`, all of that user's sessions are deleted in the same transaction as the status update. A deactivated user cannot keep a cookie that still works.

### Errors you will actually see

| HTTP | `responseCode` | When |
| --- | --- | --- |
| 400 | `input_validation_failed` | Zod failed. `details.issues` is the Zod issue list. `details.flattenError` is the field map. |
| 401 | `unauthorized` | No session. |
| 403 | `forbidden` | Signed in, but not allowed. The `message` says which rule failed. |
| 404 | `resource_not_found` | The row is not there, or not in your clinic. |
| 404 | `path_not_found` | No route matched. |
| 409 | `conflict` | Unique membership already exists. |
| 413 | `payload_too_large` | Body over 100KB. |
| 500 | `internal_server_error` | Anything else. The message to the client is generic. The real error is in the log. |

`ApiError` carries `logContext`, which is written to the log and never put on the response. Put user ids and clinic ids there. Do not put them in `details` unless the client needs them.

---

## 9. The dashboard, as a data flow

```text
main.tsx
  QueryClientProvider          one cache for the whole app
    BrowserRouter
      App                      routes and guards
    Toaster                    sonner toasts, outside the router so they survive navigation
    ReactQueryDevtools
```

There is no global Redux-style store. Server data lives in TanStack Query. Session data lives in Better Auth's `useSession()`. Local UI state (`isSigningIn`, whether the sidebar is open) lives in `useState` next to the component that uses it.

### Where a server call is allowed to exist

```text
src/api/          functions that perform HTTP. They return typed JSON. They do not know about React.
src/queries/      query keys, queryOptions, mutationOptions. They know about React Query. They call src/api.
components        useQuery / useMutation with those options. They do not call ky.
```

`listUserClinics` in `src/api/clinic.ts` is a plain async function. `listUserClinicsQueryOptions` in `src/queries/clinic.ts` binds it to a query key. The component calls `useQuery(listUserClinicsQueryOptions())`.

Why the split: a query key and a request function change for different reasons. The key says "which cache entry". The function says "how to load it". Components should not invent either one inline, or two screens will cache the same data under two keys and show two different lists.

### Query keys

```ts
export const clinicKeys = {
  all: ["clinics"] as const,
  lists: () => [...clinicKeys.all, "list"] as const,
  list: () => [...clinicKeys.lists()] as const,
}
```

`as const` makes the key a readonly tuple of string literals, not `string[]`. React Query uses that tuple as the identity of the cache entry. `["clinics", "list"]` and `["clinics", "detail", 4]` are different entries.

The factory is nested on purpose:

- `clinicKeys.all` is the prefix of every clinic query.
- `clinicKeys.lists()` is the prefix of every list.
- `clinicKeys.list()` is this specific list.

When a later feature adds `clinicKeys.detail(id)`, invalidating `clinicKeys.all` refreshes lists and details together. Invalidating `clinicKeys.lists()` leaves a detail page alone. Invalidating a hard-coded `["clinics"]` from a component tends to miss one of those, or to wipe the entire cache by accident.

Today there is one list and it takes no filters, so `list()` adds no extra segments. The shape is already the one you extend. When the list grows filters, the key becomes `list(filters)` and the filters go inside the key. A key that does not include its filters will show the previous filter's data under the new filter.

### staleTime and gcTime

In `src/queries/client.ts`:

- `staleTime: 15 seconds`. For 15 seconds after a successful fetch, the data is fresh. Remounting a component does not refetch. The clinic list overrides this to 5 minutes, because the set of clinics changes rarely.
- `gcTime: 5 minutes`. After the last component unsubscribes, the cache entry is kept for 5 minutes. Come back within that window and the old data paints immediately, then refetches if it is stale.

These are different clocks. `staleTime` is about freshness. `gcTime` is about memory. Setting them to the same number, or setting `staleTime: Infinity` on data that another user can change, is how a screen lies.

### Retry

The default retry skips any `HTTPError` whose status is below 500. A 401, 403, 404, or 422 will not succeed the second time. Retrying it five times only delays the toast and the redirect. Network failures and 5xx responses still retry, up to 5 times, because those sometimes clear on their own.

### Mutations

`switchClinicMutationOptions` uses `mutationOptions` so the mutation function, the success behavior, and the types stay together. `reloadOnSuccess` defaults to true. A caller that wants to do something else before the reload passes `onSuccess`; it still runs, and then the page reloads. Overrides cannot replace `mutationFn`, so nobody points this mutation at a different request by accident.

### The HTTP client

`ky` in `src/api/client.ts`:

- `prefix` is `${VITE_API_URL}/api`, so call sites write `apiClient.get("clinics")`, not a full URL.
- `credentials: "include"` is set once. A new call site cannot forget the cookie.

`handleApiError` is async because reading a `ky` error body is async. `HTTPError.message` is a generic "request failed" string. The sentence the API wrote is in the JSON `message` field. The helper clones the response (so a later reader can still have it), parses JSON, and falls back to `Error.message`, then to the fallback string you passed. Login, sign-out, and clinic switch all `await` it before showing a toast.

### Keys in lists

```tsx
clinics.map((clinic) => (
  <DropdownMenuItem key={clinic.id} ...>
```

`key` is how React matches a row to last render's row. `clinic.id` is stable for the life of that clinic. The index is not: sort the list, or move the active clinic to the top, and index 0 is a different clinic. React would reuse the DOM node and the wrong checkmark would stick to the wrong name. Keys are not a performance hint you add when a list feels slow. They are identity.

Do not use the array index as a key for data that can be reordered, filtered, or inserted. Do not use `Math.random()` either: that is a new identity every render, so React throws the row away and remounts it, and any internal state (focus, open menus) dies.

### Page header slot

The shell header is rendered by `AppLayout`. The page title is rendered by the page, which sits in an `<Outlet />` below the header. React children cannot reach upward into a sibling. `PageHeaderSlot` uses a React portal: the page renders `<PageTitle />` into the header's DOM node. The header ref is stored in state (not read once during render) so the first render, before the div exists, does not get stuck with `null`.

### RequireRole

`RequireRole` is a render gate, not a security boundary. It hides children when `useActiveClinicRoles()` says no. The API still checks. A hidden button is a courtesy. The 403 is the rule.

While roles are loading it renders nothing, not the fallback. Rendering the fallback immediately flashes "you cannot see this" at an admin for one frame.

---

## 10. Practices worth copying

Each one is in this repo. Each one has a failure it prevents.

### TypeScript

- **`strict`, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`** in the shared base config. `arr[0]` is `T | undefined`. A function that may omit a property is not the same type as a function that passes `prop: undefined`. Both bugs are real and both are invisible without these flags.
- **`verbatimModuleSyntax`.** A type import is written `import type`. The compiler will not leave a runtime import behind for something that does not exist at runtime.
- **Named exports only.** `import { LoginPage } from "..."` survives a rename. A default export can be imported as any name, and the codebase slowly grows three names for one component.
- **One object parameter when a function takes more than two arguments.** `createStaff({ userId, clinicId, ctxLogger })` reads clearly at the call site. A positional `(userId, clinicId, logger)` will eventually be called with the ids swapped. This is a project rule, in `.cursor/rules/project-conventions.mdc`.
- **`as const` objects instead of string enums.** `staffRoleNames.admin` is the value `"admin"` and the type `"admin"`. A TypeScript `enum` compiles to a runtime object you did not ask for. A union of string literals does not.
- **Derive the type from the value.** `type StaffRoleName = (typeof staffRoleNames)[keyof typeof staffRoleNames]`. Add a role to the object and the type updates. A hand-written union next to the object will be forgotten.
- **`z.infer<typeof Schema>`** for the TypeScript type of a payload. The schema is the source. The type is a view of it.
- **Exhaustive switches with `never`.** The session-status switch assigns the leftover case to `never`. A new status that is not handled is a compile error.
- **Do not use `any` to get past a mismatch.** The mismatch is the bug.

### Validation and env

- **Parse environment variables at startup.** The process should die before it serves traffic.
- **Coerce ids from URL params** with `z.coerce.number().int().positive()`. URL segments are strings. `"0"`, `"-1"`, and `"abc"` should fail the schema, not become `NaN` inside SQL.
- **`.trim()` on names** before `min(1)`. A name of three spaces is not a name.
- **Share the schema.** `SwitchClinicSchema` is imported by the API validator and by the dashboard mutation's parameter type. The client cannot send a field the server will reject without TypeScript noticing.
- **Throw a typed `ApiError` from the validator hook** so validation failures go through the same error handler as everything else. One error shape, one log path.

### React

- **Stable keys from ids**, covered above.
- **Put the server cache in React Query**, not in `useEffect` + `useState`. `useEffect` fetching has no cache, no deduping, and a race: a slow response for clinic A can arrive after you switched to clinic B and overwrite the screen. React Query keys that race for you and drops the stale response.
- **Query key factories**, covered above.
- **`staleTime` on data that is expensive or rarely changes.** The default of 0 refetches on every mount. The clinic list does not need that.
- **Do not retry 4xx.**
- **Colocate the query options with the feature**, not inside the component. Two components can share `listUserClinicsQueryOptions()` and they share one cache entry.
- **Disable the button while the mutation is pending** (`switchClinic.isPending`, `isSigningIn`). Double-clicks should not fire two requests.
- **A loader is a state, not a blank page.** `isPending` on the session renders `FullScreenLoader`. The alternative is a one-frame flash of the login page for a user who is signed in.
- **An error is not the same as signed-out.** `ProtectedRoute` splits those.
- **Do not store server data in `useState` after fetching it.** You then have two copies. The cache is the copy.
- **React Compiler is on** (`babel-plugin-react-compiler` in `vite.config.ts`). Write simple components. Do not wrap every function in `useCallback` "for performance" unless you have measured a problem the compiler cannot see. Manual memoization that closes over a stale value is worse than no memoization.
- **Portals for UI that must render in a different DOM parent** (`PageHeaderSlot`), not duplicated header markup in every page.

### HTTP and security

- **Cookies, not tokens in `localStorage`.** `localStorage` is readable by any script on the page. An HttpOnly session cookie (Better Auth sets this) is not readable by JavaScript, so an XSS bug cannot exfiltrate it as easily. The dashboard never sees the raw token. It only sees `useSession()`.
- **`credentials: "include"` on both the auth client and `ky`.**
- **CORS origin is the dashboard URL, not `*`.**
- **`trustedOrigins` on Better Auth** is the same dashboard URL. A random site cannot start a sign-in flow that comes back to us.
- **`input: false` on privileged user fields.**
- **Allow-list for super users**, not a role you can request.
- **Open-redirect check** on `returnTo`.
- **Allow-list for login error banners**, so the query string is not an HTML injection point. React also escapes text nodes, which is why the banner renders `{message}` and not `dangerouslySetInnerHTML`.
- **Authorize on the server for every route.** Hiding a button is not authorization.
- **Scope clinic queries by `activeClinicId` from the session**, never by a clinic id the client sends in a query string for "which clinic am I listing". The switch endpoint is the only place a client chooses a clinic, and it checks membership first.
- **404 when a staff id is outside your clinic.** Do not reveal that the id exists.
- **Transactions when two writes must agree.** Role replace is delete-plus-insert. User deactivation is status-plus-session-delete. If the process dies between them, you do not want one half committed.
- **Unique indexes for invariants** the service also checks. The service check returns a friendly 409. The index saves you when two requests pass the check at the same time.
- **Body size limit** before you parse. A 100KB cap is plenty for JSON commands and rejects accidental uploads.
- **Redact secrets in logs. Clone bodies before reading them.**
- **Log with a request id** so one user's failure can be found among everyone else's.
- **`logContext` stays on the server.** `details` is allowed to reach the client. Know which bag you put a value in.
- **Generic 500 message.** Stack traces are for the log.

### Data access

- **Drizzle, not string-built SQL**, for queries the application owns. Parameters are bound. The role-filter alias is the kind of thing you only get right if the query is visible in TypeScript next to the types.
- **Snake case in the database, camel case in TypeScript**, with one casing setting. Do not hand-map every column.
- **Lateral aggregate for "parent plus its children"** when you would otherwise query roles in a loop.
- **Order every query whose first row you will use**, or whose order a user can see. `ORDER BY clinic.id` on the login lookup. `localeCompare` on clinic names in the list, with the active clinic pinned first.
- **Return the row you just wrote** by reading it back through the same mapper (`getStaff` after insert). The insert's `returning` clause and the GET shape then cannot diverge.
- **Cascade foreign keys** (`onDelete: "cascade"` from user to session, account, and staff, and from staff to staff_role). Deleting a user should not leave orphan staff rows. The application can still prefer soft-deactivation (`status`) over deletes. The cascade is there for real deletes.

### Monorepo and files

- **pnpm, only.** The workspace file, the lockfile, and the catalog are pnpm's. `npm install` will write a different lockfile and you will not be able to explain the diff.
- **The catalog** in `pnpm-workspace.yaml` pins one version of TypeScript, Zod, Hono, Better Auth, and ESLint for every package. `catalog:` in a package.json means "use the shared version". Two packages on two Zod majors will produce two incompatible `ZodType`s and the shared schema will not typecheck on one side.
- **Kebab-case file names.** `login-page.tsx`, `staff-role.ts`. It matches the URLs and it avoids `StaffRole` vs `staffRole` vs `staff-role` as three files.
- **Singular domain names.** `staff`, not `staffs`.
- **Package exports are explicit** (`"./zod-schemas"`, `"./client-types"`). Deep imports into `src` of another package are not a public API and will break when the file moves.
- **`#src/*` imports inside the API** (`package.json` `imports`). The API does not depend on a bundler to resolve paths. Node understands this map. Files include the `.ts` extension because Node's ESM resolver requires a full specifier when you are not bundling.
- **The dashboard alias `@/`** is a Vite/TypeScript path. It is fine there because Vite bundles the app. Do not copy that style into the API, which runs the TypeScript files directly via Node.

### Git and secrets

- Commit `.env.example`. Do not commit `.env`.
- The example Better Auth secret in the example file is a local-dev placeholder. Production gets its own, from a secret manager, not from the repo.
- `dist/` and `node_modules/` are gitignored. Build output is not source.

---

## 11. File by file

### Root

| File | Job |
| --- | --- |
| `package.json` | Workspace scripts: `dev`, `build`, `lint`, Docker, portless. |
| `pnpm-workspace.yaml` | Workspace globs and the version catalog. |
| `pnpm-lock.yaml` | Exact versions. Commit it. |
| `docker-compose.yml` | Postgres 18. Project name `cms-fullstack`. Host port 5442. Volume on `/var/lib/postgresql`, which is what the Postgres 18 image expects. |
| `.env.example` | Shared variables. |
| `.gitignore` | Ignores `node_modules`, `dist`, `.env*` except examples, logs. |
| `.prettierrc`, `.prettierignore` | Formatting. |
| `erd/main.dbml` | The data model in DBML, with notes about which tables Better Auth owns. |
| `erd/main.dbdiagram` | Same model for the diagram editor. |
| `project-deep-walkthrough.md` | This file. |

### `packages/shared-lib`

| File | Job |
| --- | --- |
| `package.json` | Exports `./zod-schemas`, `./api-response`, `./staff-roles`. |
| `src/staff-roles.ts` | The three role names, the array used to build the Postgres enum, and `staffHasRole`. |
| `src/api-response/index.ts` | `ApiResponseCode`, `ApiResponse`, `ApiResponseBody`, `ErrorResponse`. |
| `src/zod-schemas/index.ts` | Re-exports every schema, plus `AppEnvSchema` (`development`, `staging`, `production`). |
| `src/zod-schemas/staff-role.ts` | `StaffRoleSchema` and the query-param normalizer that turns one value or an array into `StaffRoleName[]`. |
| `src/zod-schemas/staff.ts` | Create staff, update roles, update status, id param, list query. |
| `src/zod-schemas/session.ts` | `SwitchClinicSchema`. `clinicId` is a positive integer or `null`. |
| `src/zod-schemas/su-clinic.ts` | `CreateClinicSchema`. |
| `src/zod-schemas/su-user.ts` | User status enum, update body, user id param. |
| `tsconfig.json` | Extends the shared library config. |
| `eslint.config.js` | Uses `@repo/eslint-config/base`. |

### `packages/eslint-config` and `packages/typescript-config`

| File | Job |
| --- | --- |
| `eslint-config/base.js` | Recommended JS + TypeScript rules, Prettier compatibility, and a small override that allows interfaces which only extend another interface. |
| `typescript-config/base.json` | Strict compiler flags shared by everyone. |
| `typescript-config/node.json` | NodeNext modules, ES2024, for the API and libraries. |
| `typescript-config/library.json` | Library package settings. |

### `apps/api` — process and HTTP shell

| File | Job |
| --- | --- |
| `src/index.ts` | Connects to Postgres (`SELECT 1`), then listens. If the database is down, the process does not pretend to be healthy. |
| `src/app.ts` | Builds the Hono app: middleware, auth mount, controllers, 404, error handler. This is the map of the HTTP API. |
| `src/config/env.ts` | Zod schema for the API environment, including the super-user email list transform. |
| `src/lib/logger.ts` | Pino. Pretty-printed in development. Serializes `err` with its cause so Drizzle errors are readable. |
| `src/lib/scoped-logger.ts` | Child loggers whose messages are prefixed `[staff.service]` or `[user.service]`. |
| `src/lib/api-error.ts` | `ApiError` and the helpers `unauthorized`, `forbidden`, `badRequest`, `notFound`, `conflict`, `payloadTooLarge`, `internalServerError`. |
| `src/lib/zod-validator-wrapper.ts` | `@hono/zod-validator` plus a hook that throws `ApiError` with the Zod issues. |
| `src/lib/auth.ts` | Better Auth: Google, Drizzle, extra fields, the two database hooks. |
| `src/middleware/load-session.ts` | Puts the session on the context, or nulls. Sets `isSuperUser`. |
| `src/middleware/require-auth.ts` | Rejects missing sessions and inactive users. Revokes the session when the user is no longer active. Narrows the context type. |
| `src/middleware/require-super-user.ts` | Rejects anyone who is not a super user. |
| `src/middleware/require-active-clinic.ts` | Loads clinic context. Sets `activeClinicId` and `staffRoles`. 403 when there is no usable clinic. |
| `src/middleware/require-staff-role.ts` | Role check via `staffHasRole`. Super users pass. |
| `src/middleware/global-error-handler.ts` | Turns any thrown error into the JSON error body. Logs `ApiError` at its `logLevel`, everything else at `error`. |
| `src/middleware/log-request/index.ts` | Times the request and logs method, path, redacted headers, redacted bodies, status, and the session summary. |
| `src/middleware/log-request/utils.ts` | Clone, parse, and redact. Depth-limited so a hostile payload cannot blow the logger. |

### `apps/api` — controllers

Controllers are the route table. They do not contain business rules.

| File | Routes |
| --- | --- |
| `src/controllers/clinic.controller.ts` | `GET /clinics` |
| `src/controllers/session.controller.ts` | `PATCH /session/switch-clinic` |
| `src/controllers/staff.controller.ts` | `GET /staff`, `GET /staff/:staffId`, role and status patches for clinic admins |
| `src/controllers/su-clinic.controller.ts` | `POST /su/clinics` |
| `src/controllers/su-staff.controller.ts` | `POST /su/staff`, super-user role and status patches |
| `src/controllers/su-user.controller.ts` | `PATCH /su/users/:userId/status` |

### `apps/api` — services

| File | Job |
| --- | --- |
| `src/services/clinic.service.ts` | Create clinic, find clinic, load the active-clinic context, list the current user's clinics with roles. |
| `src/services/staff.service.ts` | List, get, create, and update staff. The role diff, the self-admin guards, and the lateral role aggregate live here. |
| `src/services/session.service.ts` | Revoke all sessions for a user, pick the clinic on login, switch clinic. |
| `src/services/user.service.ts` | Find user, find status, update status and revoke sessions when the user is no longer active. |
| `src/scripts/seed.ts` | Placeholder. `Promise.all([])` exits 0. Seed scripts belong here when there is data to insert. |

`clinic.service.ts` and `staff.service.ts` import each other. That is safe only because neither module calls the other while it is still evaluating. They call functions later, when a request arrives. Do not add a call at the top level of either file.

### `apps/api` — database and types

| File | Job |
| --- | --- |
| `src/db/index.ts` | The Drizzle client and the `Tx` transaction type. |
| `src/db/db.config.ts` | Shared Drizzle options: snake_case, SQL logging in development. |
| `src/db/drizzle.config.ts` | Drizzle Kit config: where schemas and migrations live, and the database URL. |
| `src/db/schema/index.ts` | Re-exports every schema so Drizzle sees all tables and relations. |
| `src/db/schema/auth.schema.ts` | Generated Better Auth tables. Regenerate; do not hand-edit columns that the CLI owns. |
| `src/db/schema/clinic.schema.ts` | `clinic` table and its relation to staff. |
| `src/db/schema/staff.schema.ts` | `staff`, `staff_role`, enums, unique indexes, relations. |
| `src/db/migrations/` | SQL history and Drizzle snapshots. |
| `src/types/app.types.ts` | Hono's `Variables`: user, session, active clinic, roles, super-user flag, plus the logger. |
| `src/types/auth.types.ts` | `Auth`, `User`, and `AuthSession` inferred from the Better Auth instance. |
| `src/types/index.ts` | Barrel for those types. Exported as `@repo/api/types`. |
| `src/types/api-client/clinic.types.ts` | Response types for the clinic list. |
| `src/types/api-client/staff.types.ts` | `StaffMember` and the list/get response types. `createdAt` is an ISO string at the boundary, a `Date` inside the service. |
| `src/types/api-client/index.ts` | Barrel. Exported as `@repo/api/client-types`. |

### `apps/dashboard` — application

| File | Job |
| --- | --- |
| `index.html` | The single HTML page. Vite injects the script. The title is still the template word "dashboard". |
| `vite.config.ts` | React, React Compiler, Tailwind, `@` alias. |
| `src/main.tsx` | React root: QueryClient, router, toaster, devtools. |
| `src/app.tsx` | The route table. |
| `src/index.css` | Tailwind and the theme tokens. |
| `src/config/env.ts` | Zod parse of `import.meta.env`. |
| `src/lib/auth-client.ts` | Better Auth React client. |
| `src/lib/resolve-login-redirect.ts` | `returnTo` allow-list. |
| `src/lib/utils.ts` | `cn` (clsx + tailwind-merge) and `handleApiError`. |
| `src/api/client.ts` | The `ky` instance. |
| `src/api/clinic.ts` | `GET clinics`. |
| `src/api/session.ts` | `PATCH session/switch-clinic`. |
| `src/queries/client.ts` | The `QueryClient` defaults: stale time, gc time, retry policy. |
| `src/queries/clinic.ts` | `clinicKeys` and `listUserClinicsQueryOptions`. |
| `src/queries/session.ts` | `switchClinicMutationOptions`. |
| `src/hooks/use-active-clinic-roles.ts` | Roles for the active clinic, plus `hasRole` / `hasAnyRole`. Super users pass every check. |
| `src/hooks/use-mobile.ts` | Sidebar breakpoint helper from the sidebar primitive. |
| `src/components/route-guards/protected-route.tsx` | Signed-in gate. |
| `src/components/route-guards/public-route.tsx` | Signed-out gate. |
| `src/components/route-guards/require-role.tsx` | Hide children the current role cannot use. |
| `src/components/layouts/auth-layout.tsx` | Centered column for the login page. |
| `src/components/layouts/app-layout.tsx` | Sidebar shell and the header portal target. |
| `src/components/app-sidebar/app-sidebar.tsx` | Sidebar structure: clinic switcher, nav, user menu. |
| `src/components/app-sidebar/clinic-switcher.tsx` | Loads clinics, switches the active one. Keys the menu by `clinic.id`. |
| `src/components/app-sidebar/nav-user.tsx` | Avatar, email, sign-out. Settings is present and disabled. |
| `src/components/page-header.tsx` | Context + portal for the header slot. |
| `src/components/page-title.tsx` | The `<h1>` pages put in that slot. |
| `src/components/full-screen-loader.tsx` | Spinner used while the session is resolving. |
| `src/components/session-error.tsx` | Retry screen when the session request failed. |
| `src/pages/auth/login/login-page.tsx` | Google button. |
| `src/pages/auth/login/_components/login-reason-banner.tsx` | Pending and inactive explanations. |
| `src/pages/dashboard/dashboard-page.tsx` | Welcome line using the session user's name. |
| `src/pages/not-found/not-found-page.tsx` | 404 with a link home. |
| `src/pages/home.tsx` | Unused Vite leftover. Nothing imports it. It is not a route. |

### `apps/dashboard/src/components/ui`

These are the shadcn/Base UI primitives: `alert`, `avatar`, `button`, `card`, `dropdown-menu`, `input`, `label`, `separator`, `sheet`, `sidebar`, `skeleton`, `sonner`, `tooltip`. They are presentation. They do not know what a clinic is. `components.json` is the shadcn config that generated them. Change a primitive only when the design system changes, not when a page needs a one-off color.

---

## 12. How to add the next feature without making a mess

Say the next feature is "list doctors at the active clinic" as a page.

1. If the request or response shape is new, add a Zod schema in `shared-lib` and a response type in `apps/api/src/types/api-client`.
2. If the rule is new, put it in a service function that takes one object parameter. Check the clinic from context, not from the client.
3. Add the route on the controller that already has the right middleware. Do not copy `requireAuth` into the handler.
4. Add a function in `apps/dashboard/src/api`. Add a query key under a factory in `src/queries`. Pass filters into the key.
5. Render the list with `key={row.id}`.
6. Gate the nav link with `RequireRole` if only some roles should see it. Keep the API check anyway.
7. Generate a migration if the schema changed. Do not edit an old SQL file.
8. Update `erd/main.dbml` in the same change so the drawing does not become fiction.

What you should not do:

- Fetch in `useEffect` and store it in `useState`.
- Put a clinic id in `localStorage`.
- Build a SQL string with a template literal and user input.
- Return a different JSON shape "just for this one endpoint".
- Trust `user.platformRole` sent from the browser.
- Add the role check only in the component.

---

## 13. What is deliberately unfinished

- The dashboard has one real page, the welcome screen. There is no staff UI yet. The staff API is ready for it.
- `seed.ts` inserts nothing.
- The Settings item in the user menu is disabled.
- `pages/home.tsx` is unused.
- Google OAuth needs a real client id and secret in `apps/api/.env`.
- The production JavaScript bundle is one chunk over 500KB. Splitting by route (`React.lazy` on the page components) is the next performance step, when there are more pages worth splitting.
- There is no test runner in the repo yet. The practices above are what a test would pin: role inheritance, the exactly-one clinic rule, the open-redirect check, and the 401 vs 500 retry policy.

---

## 14. A short path through the code on your second day

Read in this order. Each file is small. Together they are the whole design.

1. `erd/main.dbml`
2. `packages/shared-lib/src/staff-roles.ts`
3. `packages/shared-lib/src/api-response/index.ts`
4. `apps/api/src/app.ts`
5. `apps/api/src/lib/auth.ts`
6. `apps/api/src/middleware/require-auth.ts`
7. `apps/api/src/middleware/require-active-clinic.ts`
8. `apps/api/src/services/session.service.ts`
9. `apps/api/src/controllers/staff.controller.ts`
10. `apps/dashboard/src/main.tsx`
11. `apps/dashboard/src/app.tsx`
12. `apps/dashboard/src/queries/clinic.ts`
13. `apps/dashboard/src/components/app-sidebar/clinic-switcher.tsx`
14. `apps/dashboard/src/components/route-guards/protected-route.tsx`

If you can explain, out loud, why `clinic.id` is the React key, why `clinicKeys.list()` is the query key, and why the clinic id used in `listStaff` comes from the session and not from the query string, you understand this project.
