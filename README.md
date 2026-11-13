# Alom's English Center LMS

A custom learning and administration platform for **Alom's English Center**.

## Product scope

- Bangla/English-ready public website and role-aware dashboards.
- Reusable courses, categories, lessons, articles and videos; one content item can be linked to multiple courses.
- Student accounts, enrolments and course progress.
- Manual bKash/Nagad/bank-transfer payment submission, verification and ledger records.
- Timed exams, question bank, autosaved attempts and server-side grading.
- Attendance, CMS blog, testimonials, website settings and SEO metadata.
- Target deployment: cPanel with PHP 8.3+, MySQL 8 or compatible MariaDB, and a built React/Vite frontend.

## Implemented backend slices

The PHP API currently includes authentication/session handling, CSRF protection, role/permission checks, course/category/content management, enrolments, users, manual payments and ledger, exams, reusable question bank, attendance, persistent CMS settings/posts/testimonials (PR #31), API-backed Student Directory (PR #34), public admission inquiry intake (PR #35), and certificate issue/verification/revocation (PR #38).

Database migrations are in `database/migrations/` and are applied in numeric filename order with `php scripts/migrate.php`. The CLI runner records checksums and refuses edited or missing applied migrations. API configuration and route notes are in `api/README.md`; cPanel deployment notes are in `docs/CPANEL-DEPLOYMENT.md`.

## Engineering and security principles

1. Server-side persistence is authoritative; browser storage is not the production database.
2. Protected operations enforce authentication, CSRF and permissions on the server.
3. Migrations must be repeatable and non-destructive.
4. Payment verification must be auditable and must never be simulated as successful.
5. Database credentials and secrets must never enter `VITE_*` variables, browser bundles or Git.
6. A successful build or CI run does not by itself establish production readiness.

## Current release status — 2026-11-12

**Not production-ready. Do not deploy or distribute this repository as a final LMS package yet.**

The following release gates remain open:

- Public student registration, email verification/resend, password recovery and self-service profile management (merged and CI-validated in PR #42; production email delivery still requires a cPanel smoke test).
- Certificate issuance, student wallet, public verification and audited revocation are API-backed after PR #38; browser E2E and real print/verification checks remain.
- Live classes, notifications and reporting backed by persistent APIs.
- Branch/tenant-scoped authorization and data isolation.
- Production media upload, private file storage and authorized downloads.
- Payment gateway callbacks/signature verification, refunds/reversals, receipts and invoices.
- Full installer and deployment wizard, installation lock, upgrade/rollback workflow, backup and restore. A CLI migration runner and Apache access-control/SPA rules exist, but a complete installer and deployment rehearsal are still missing.
- Browser end-to-end, security and accessibility testing.
- A clean cPanel deployment rehearsal using the exact release ZIP.

Some dashboard modules still contain legacy/demo data in `LmsContext`; a visible screen is not proof that its workflow is persisted or secure. The detailed gap list and release gates are maintained in `docs/RELEASE-READINESS-AUDIT.md`.

## Validation

GitHub Actions checks PHP 8.3 syntax and migration safety, applies migrations to disposable MySQL 8.4 and runs PHP HTTP integration tests, and type-checks/builds the frontend. Required browser E2E and deployment rehearsal are separate release gates.

## Development

```bash
bun install --frozen-lockfile
bun run lint
bun run build
```

For backend validation, use the documented test scripts with a disposable test database. Never point destructive integration tests at production data.
