---
name: gh-draft-pr
description: Produces a gh CLI command to create a draft PR for the monorepo, filling `.github/pull_request_template.md` from branch commits and chat context. Use when the user asks for a draft PR, create draft PR, open a PR with gh, or wants a PR command following the repo template.
---

# Draft PR

## When to Use

Apply when the user wants a **command** to create a **draft** pull request with `gh`, using this repo's PR template and context from **branch commits** and/or **chat**.

Run all commands from the monorepo root.

## Workflow

### 1. Read the PR template

Template path: `.github/pull_request_template.md`

Sections (keep this order):

| Section          | Purpose                                                                        |
| ---------------- | ------------------------------------------------------------------------------ |
| Summary          | Bullets: what changed and why; one theme per bullet; outcomes over file diffs. |
| Related Ticket   | `Closes #N` — GitHub issue number only                                         |
| How to Test      | Numbered steps with `pnpm` commands and expected outcome                       |
| Additional Notes | Optional — trade-offs or reviewer callouts                                     |

**Ticket convention:** `CMS-N` in branch/title is a human alias; `N` is the GitHub issue number. Body must use `Closes #N` (not `Closes CMS-N`) for auto-close.

### 2. Gather branch context

```bash
git rev-parse --show-toplevel
git branch --show-current
git log origin/main..HEAD --oneline
git diff origin/main..HEAD --stat
```

If `origin/main` is missing, use `main`. Target base is `main` unless the user says otherwise.

**Extract ticket from branch name** — same rules as `commit-staged`:

- Patterns: `CMS-194-ui-mismatch`, `feature/CMS-123-add-login`, `fix/CMS-456`
- Match first `PREFIX-NUMBER` (uppercase letters + hyphen + digits), e.g. `CMS-13`
- Issue number `N` = digits after `CMS-` → `Closes #13`

### 3. Fill the template

- **Summary**: Bullet points from commit messages and chat. One theme per bullet — use as many or as few as the change needs. Delete the HTML comment and placeholder `-`.
- **Related Ticket**: `Closes #N` where `N` matches the branch ticket. Delete placeholder `#` alone.
- **How to Test**: Runnable steps for this monorepo (see below). Delete the HTML comment. Replace `1. 2. 3.` placeholders with real steps.
- **Additional Notes**: Fill only when chat/commits surface trade-offs or reviewer risks. Otherwise **remove the entire section** (header, comment, and `-`).

**Always remove HTML comments** (`<!-- ... -->`) from the filled body — they are author guidance, not PR content.

### 4. PR title

Format: `[CMS-N] type(scope): imperative description`

| Part      | Rule                                                              |
| --------- | ----------------------------------------------------------------- |
| `[CMS-N]` | From branch; omit only if branch has no ticket                    |
| `type`    | `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`        |
| `scope`   | Monorepo area: `api`, `dashboard`, `shared-lib`, `deps`, `docker` |
| subject   | Imperative, lowercase, no trailing period, ~50 chars              |

Examples:

- `[CMS-13] feat(api): setup database with docker and drizzle orm`
- `[CMS-15] feat(api): integrate better auth`

Align `type` and `scope` with `commit-staged` conventions.

### 5. How to Test — monorepo patterns

Infer steps from changed packages and chat. Prefer `pnpm --filter <package>` (never `npm`/`npx`/`yarn`).

| Area           | Common commands                                                            |
| -------------- | -------------------------------------------------------------------------- |
| Postgres       | `pnpm docker:up`                                                           |
| Migrations     | `pnpm --filter @repo/api db:migrate`                                       |
| Seed           | `pnpm --filter @repo/api db:seed`                                          |
| API dev        | `pnpm --filter @repo/api dev`                                              |
| API prod-like  | `pnpm --filter @repo/api start`                                            |
| Dashboard dev  | `pnpm --filter @repo/dashboard dev`                                        |
| Drizzle Studio | `pnpm --filter @repo/api db:studio`                                        |
| Env setup      | Copy `.env.example` → `.env` and `apps/api/.env.example` → `apps/api/.env` |

**Local URLs** (when relevant):

- API: `https://api.cms-local.dev`
- Dashboard: `https://app.cms-local.dev`

Each step should state an **expected outcome** (log line, HTTP response, UI state).

### 6. Write body and output command

Write the filled body to `.pr-body-draft.md` at the repo root (user may delete later).

**Output a single copy-pastable command** — do not run `gh pr create` unless the user explicitly asks.

```bash
gh pr create --draft --title "[CMS-N] type(scope): brief title" --body-file .pr-body-draft.md
```

Use explicit `--title`; do not rely on `--fill` (it overrides `--body-file`).

If base is not `main`:

```bash
gh pr create --draft --base <branch> --title "..." --body-file .pr-body-draft.md
```

If the branch is not pushed, remind the user to `git push -u origin HEAD` first. If `gh` fails, suggest `gh auth status`.

## Example

Branch: `CMS-13-setup-database`, commits about Docker Compose + Drizzle.

**Title:** `[CMS-13] feat(api): setup database with docker and drizzle orm`

**`.pr-body-draft.md`:**

```markdown
## Summary

- Add Postgres 18 service via Docker Compose on port 5442 with health checks and persistent volume
- Add root `docker:up`, `docker:down`, and `docker:restart` scripts
- Configure Drizzle ORM with shared db config, schema, and initial migration
- Add API scripts for `db:generate`, `db:migrate`, and `db:studio`
- Validate `DATABASE_URL` in env config and verify DB connectivity on API startup

## Related Ticket

Closes #13

## How to Test

1. Copy `.env.example` to `.env` and `apps/api/.env.example` to `apps/api/.env`
2. Start Postgres: `pnpm docker:up`
3. Run migrations: `pnpm --filter @repo/api db:migrate`
4. Start the API: `pnpm --filter @repo/api start`
5. Confirm the console logs `Database connection successful`
```

**Command:**

```bash
gh pr create --draft --title "[CMS-13] feat(api): setup database with docker and drizzle orm" --body-file .pr-body-draft.md
```

## Checklist

- [ ] Template read from `.github/pull_request_template.md`
- [ ] Ticket `CMS-N` from branch; `Closes #N` in body
- [ ] Title: `[CMS-N] type(scope): imperative`
- [ ] Summary as bullets; HTML comments removed
- [ ] How to Test uses `pnpm --filter` and expected outcomes
- [ ] Additional Notes included only when needed; otherwise section removed
- [ ] Body written to `.pr-body-draft.md`
- [ ] Copy-pastable `gh pr create --draft` command output (not executed unless asked)
