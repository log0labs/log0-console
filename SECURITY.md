# Security Policy

The log0 console is the web dashboard for a multi-tenant incident platform, so
we take security - especially anything affecting **tenant isolation or
authentication** - seriously.

## Reporting a vulnerability

**Please do not report security issues through public GitHub issues, pull
requests, or discussions.**

Instead, report privately by email to **ashmitgupta.official@outlook.com**. If possible,
include:

- a description of the issue and its impact,
- the affected area (page, route, component, or API proxy) and version/commit,
- clear steps to reproduce (a proof of concept helps),
- any suggested remediation.

We will acknowledge your report, keep you updated on progress, and coordinate a
disclosure timeline with you. Please give us a reasonable window to fix the issue
before any public disclosure. We're grateful for responsible disclosure and will
credit reporters who wish to be acknowledged.

## Scope

Issues we especially want to hear about:

- authentication/session handling flaws (JWT storage, token leakage),
- authorization/RBAC gaps that expose another tenant's data,
- cross-site scripting (XSS), CSRF, or open-redirect issues,
- server-side request forgery (SSRF) via the API proxy route handlers,
- leakage of secrets (note: only `NEXT_PUBLIC_*` values are meant to reach the
  browser - report any other secret exposed client-side).

## Out of scope

- Vulnerabilities in the backend services belong in the `log0-services` repo's
  security process (same email is fine).
- Automated scanner output without a demonstrated, exploitable impact.

## Supported versions

The console is under active development. Security fixes target the `main` branch.
Please test against the latest `main` before reporting.
