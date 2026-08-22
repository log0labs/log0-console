# Contributing to the log0 console

Thanks for your interest in contributing to the **log0 console** - the web
dashboard for log0, an intelligent incident copilot that turns raw logs into
actionable incidents.

Product and architecture documentation lives at **https://log0.in/docs**.

---

## License & CLA (read first)

The log0 console is **open source** under an **open-core** model:

- The **community edition** (everything outside the `ee/` directory) is licensed
  under **GNU AGPL-3.0** - see [`LICENSE`](./LICENSE).
- The **Enterprise Edition** (`ee/`) is commercial and proprietary - see
  [`ee/LICENSE`](./ee/LICENSE).

Because log0 is dual-licensed, **every contributor must agree to the
[Contributor License Agreement](./CLA.md)** before a pull request can be merged.
This is enforced automatically by a CLA check on your first PR. By contributing
you also agree to license your work under AGPL-3.0 and allow log0labs to
relicense it commercially, as described in the CLA.

Please also read and follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

---

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router) + React 19
- TypeScript
- Tailwind CSS 4 + [shadcn/ui](https://ui.shadcn.com) (Radix primitives)
- TanStack Query (server state) + Zustand (client state)
- axios (via a server-side API proxy)

## Prerequisites

- **Node.js** 20+ (or the version pinned in CI)
- **npm** (this repo uses `package-lock.json`)
- A running **log0 backend** for full functionality - see
  [Running Locally](https://log0.in/docs/local-development) in the `log0-services`
  repo.

## Getting started

```bash
npm install
cp .env.example .env        # then edit values (see below)
npm run dev                 # starts the console on http://localhost:3001
```

### Environment variables

Configured in `.env` (see [`.env.example`](./.env.example)):

| Variable | Exposure | Purpose |
|---|---|---|
| `AUTH_API_URL` | server-only | Base URL of the auth-service (default `http://localhost:8086`) |
| `INCIDENTS_API_URL` | server-only | Base URL of the incident-service (default `http://localhost:8083`) |
| `NEXT_PUBLIC_INGEST_URL` | browser | Public log-ingestion endpoint shown in Workspace settings |

> Only `NEXT_PUBLIC_*` variables are sent to the browser. Never put a secret in a
> `NEXT_PUBLIC_` variable. Server-side calls to the backend go through the API
> proxy route handler (`app/api/v1/[...path]`), which forwards the user's access
> token - keep that boundary intact.

## Useful scripts

```bash
npm run dev         # dev server (Turbopack) on port 3001
npm run build       # production build
npm run start       # serve the production build on port 3001
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run format      # Prettier write
```

Please run `npm run lint` and `npm run typecheck` before opening a PR.

---

## Project layout

```
app/         Next.js App Router routes, layouts, and the API proxy route
components/   Reusable UI components (shadcn/ui-based)
hooks/        React hooks
lib/          Client utilities (API client, helpers)
store/        Zustand stores (e.g. auth state)
types/        Shared TypeScript types
public/       Static assets
```

Before a non-trivial change, skim the [architecture docs](https://log0.in/docs/architecture)
so the UI matches the backend's contracts.

## The `ee/` boundary

- Keep community features **outside** `ee/` (AGPL); put paid/enterprise-only UI
  **inside** `ee/` (proprietary).
- A community build must remain fully functional without anything in `ee/`.
- If unsure which side a feature belongs on, open an issue first.

---

## Development workflow

1. **Open or find an issue** for anything beyond a small fix. Look for
   `good first issue`.
2. **Fork and branch** from `main`: `git checkout -b feat/usage-meter`.
3. **Keep PRs focused** and match the existing style (functional components,
   TypeScript, Tailwind, shadcn/ui patterns, TanStack Query for data fetching).
4. **Check accessibility and both themes** (light/dark) for UI changes; a
   screenshot or short clip in the PR is very welcome.
5. **Verify** `npm run lint`, `npm run typecheck`, and `npm run build` pass.
6. **Write clear commits** - Conventional Commit prefixes (`feat`, `fix`,
   `docs`, `refactor`, `chore`) are encouraged.
7. **Open a PR** against `main` describing what changed, why, and how you tested.
8. **Agree to the CLA** when the bot prompts you (first PR only).

## Pull request checklist

- [ ] Focused change with a clear "why" in the description.
- [ ] `npm run lint`, `npm run typecheck`, and `npm run build` pass.
- [ ] No secrets committed; no secret placed behind `NEXT_PUBLIC_`.
- [ ] UI verified in light and dark themes (screenshot/clip attached if visual).
- [ ] Community code stays outside `ee/`; enterprise code stays inside `ee/`.
- [ ] You have agreed to the [CLA](./CLA.md).

---

## Reporting security issues

**Do not open a public issue for security vulnerabilities.** Please follow
[`SECURITY.md`](./SECURITY.md) (or email ashmitgupta.official@outlook.com).

## Questions

- Product & architecture docs: **https://log0.in/docs**
- General questions: open a GitHub Discussion or issue.
- Commercial/enterprise licensing: ashmitgupta.official@outlook.com

Thank you for helping make log0 better.
