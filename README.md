# log0 console

**The web dashboard for log0 - an intelligent incident copilot that turns raw
logs into actionable incidents.**

> From logs to incidents, automatically.

The console is the operator-facing UI for [log0](https://log0.in): it lets teams
sign in, explore logs, triage and assign incidents, read AI-generated summaries,
and manage their workspace and API keys. It talks to the log0 backend
([`log0-services`](https://github.com/log0labs/log0-services)) through a
server-side API proxy.

- Website & docs: **https://log0.in** · **https://log0.in/docs**
- Backend services: **`log0-services`**

---

## Features

- Authentication and tenant-scoped workspace (JWT-based)
- Incident list, detail, assignment, acknowledge/resolve workflows
- Log explorer backed by the incident/logs API
- AI incident summaries surfaced at a glance
- Workspace settings: API keys and the public ingestion endpoint
- Light/dark themes, responsive layout

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
shadcn/ui (Radix) · TanStack Query · Zustand · axios

---

## Getting started

### Prerequisites

- Node.js 20+
- npm
- A running log0 backend for full functionality - see
  [Running Locally](https://log0.in/docs/local-development).

### Setup

```bash
npm install
cp .env.example .env     # edit values as needed
npm run dev              # http://localhost:3001
```

### Environment variables

| Variable | Exposure | Purpose |
|---|---|---|
| `AUTH_API_URL` | server-only | auth-service base URL (default `http://localhost:8086`) |
| `INCIDENTS_API_URL` | server-only | incident-service base URL (default `http://localhost:8083`) |
| `NEXT_PUBLIC_INGEST_URL` | browser | Public log-ingestion endpoint shown in Workspace settings |

Only `NEXT_PUBLIC_*` values reach the browser. Server-side calls are proxied
through `app/api/v1/[...path]`, which forwards the user's access token.

### Scripts

```bash
npm run dev         # dev server (Turbopack), port 3001
npm run build       # production build
npm run start       # serve production build, port 3001
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run format      # Prettier
```

---

## Project structure

```
app/          App Router routes, layouts, and the API proxy route
components/    Reusable UI components (shadcn/ui-based)
hooks/        React hooks
lib/          Client utilities (API client, helpers)
store/        Zustand stores
types/        Shared TypeScript types
public/       Static assets
```

## Related repositories

| Repo | Description |
|---|---|
| [`log0-services`](https://github.com/log0labs/log0-services) | Backend microservices (ingestion, clustering, incidents, AI, auth) |
| [`log0-website`](https://github.com/log0labs/log0-website) | Marketing site + documentation (https://log0.in) |

---

## License

The log0 console is **open source** under an **open-core** model:

- The **community edition** (everything outside the `ee/` directory) is licensed
  under the **GNU AGPL-3.0** - see [`LICENSE`](./LICENSE). You may self-host,
  modify, and redistribute it. If you run a modified version as a network
  service, AGPL-3.0 requires you to make your modified source available to its
  users.
- The **Enterprise Edition** (the `ee/` directory) is **commercial, proprietary**
  software - see [`ee/LICENSE`](./ee/LICENSE). It requires a commercial license
  from log0labs.

Copyright (c) 2026 log0labs and the log0 contributors.

Need a commercial/OEM license without AGPL obligations? Contact
ashmitgupta.official@outlook.com.

## Contributing

Contributions are welcome - see [`CONTRIBUTING.md`](./CONTRIBUTING.md) for setup,
project layout, and workflow. Please also review our
[Code of Conduct](./CODE_OF_CONDUCT.md). Because log0 is dual-licensed
(AGPL + commercial), all contributors must agree to the
[Contributor License Agreement](./CLA.md) before their pull request can be merged
(handled automatically via a CLA check on PRs). For security issues, follow
[`SECURITY.md`](./SECURITY.md).

"log0" and "log0labs" are trademarks of log0labs; the license covers the code,
not the brand.
