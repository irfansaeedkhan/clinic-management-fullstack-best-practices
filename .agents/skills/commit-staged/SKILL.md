---
name: commit-staged
description: Generate conventional commit messages (subject and body) from staged changes, extracting the ticket ID from the current branch name. Use when the user wants to create a commit, write a commit message, commit staged changes, or asks for a commit with conventional format (e.g. [CMS-123] feat(api)).
---

# Conventional Commit from Staged Changes

## When to Use

Apply this skill when the user asks to create a commit, write a commit message, or commit staged changes, especially when they mention conventional commits or a ticket number in the branch.

## Workflow

### 1. Get branch name and staged changes

```bash
git branch --show-current
git diff --staged --stat
git diff --staged
```

Run these from the project root. Use the output to infer scope and ticket. If no changes are staged, tell the user to stage first (`git add`).

### 2. Extract ticket from branch name

Branch names often look like: `CMS-194-ui-mismatch-in-email-management`, `feature/CMS-123-add-login`, `fix/CMS-456`.

- Match the first segment that looks like `PREFIX-NUMBER` (e.g. `CMS-194`, `CMS-123`). Common patterns: uppercase letters + hyphen + digits.
- Use that as the scope in parentheses: `(CMS-194)`, `(CMS-123)`.
- If no ticket pattern is found, omit the scope or use a short scope from the change (e.g. module or area).

### 3. Choose conventional type

From the staged diff, pick one:

| Type       | Use when                                   |
| ---------- | ------------------------------------------ |
| `feat`     | New feature or user-facing capability      |
| `fix`      | Bug fix                                    |
| `chore`    | Build, tooling, deps, config, no app logic |
| `docs`     | Documentation only                         |
| `style`    | Formatting, whitespace, no logic change    |
| `refactor` | Code change that is not a fix or feature   |
| `test`     | Adding or updating tests                   |
| `perf`     | Performance improvement                    |

Default to `feat` for new behavior, `fix` for defect fixes, `chore` for everything else when unclear.

### 4. Write the subject line

- Format: `[ticket] type(scope): imperative subject`
- Scope = package/section of the monorepo (e.g. `api`, `dashboard`, `shared-lib`, `deps`).
- Subject: lowercase, imperative ("add" not "added"), no period at end, ~50 characters or less.
- Example: `[CMS-194] feat(dashboard): fix email management UI mismatch`, `[CMS-123] feat(api): fix auth middleware`

### 5. Write the body (optional)

- Add a body if the change needs explanation (what changed and why).
- **Put each item on its own line** (no bullets); use newlines inside the body string.
- Wrap long lines at ~72 characters.

### 6. Output the git command (do not run it)

**Output a copy-pastable `git commit` command** for the user to run—**do not execute `git commit`** unless the user explicitly asks you to run it (e.g. "run it", "execute it", "commit for me"). Otherwise, only show the command so the user can review and run it themselves.

Use one `-m` for the subject; if there is a body, add a second `-m` with the body. Use real newlines inside the body string so each item is on a separate line.

- Subject only: `git commit -m "[ticket] type(scope): subject"`
- Subject + body (multiple items on separate lines): use one `-m` with newlines inside the quoted string.

## Examples

**Example 1**

- Branch: `CMS-194-ui-mismatch-in-email-management`
- Staged: Changes in email management modals and notification CC list UI.

```bash
git commit -m "[CMS-194] feat(dashboard): align email management UI with design" -m "Update notification CC modals and list section to match specs
Fix avatar and remitter sections styling"
```

**Example 2**

- Branch: `fix/CMS-200-login-timeout`
- Staged: Increase auth timeout and retry logic.

```bash
git commit -m "[CMS-200] fix(dashboard): increase login timeout and add retry" -m "Prevent session expiry during slow networks by extending timeout and retrying once on failure."
```

**Example 3**

- Branch: `chore-deps`
- No ticket in branch; staged: package.json and lockfile.

```bash
git commit -m "chore(deps): bump axios to 1.6.0"
```

## Checklist

- [ ] Read branch name and staged diff from the chosen project
- [ ] Ticket/scope from branch (or omit if none)
- [ ] Type chosen from content (feat/fix/chore/etc.)
- [ ] Subject: `[ticket] type(scope): imperative`, &lt; ~50 chars
- [ ] Body only if needed; one item per line; wrap at 72 chars
- [ ] Output a copy-pastable `git commit` command (not just the message); do not run `git commit` unless the user explicitly asks to run it
