# Alom's English Center LMS

A custom learning and administration platform for **Alom's English Center**.

## Product scope

- Bangla/English-ready public website and role-aware dashboards.
- Reusable courses, categories, lessons, articles and videos; one content item can be linked to multiple courses.
- Student accounts, enrolments and course progress.
- Manual bKash/Nagad/bank-transfer payment submission, verification and ledger records.
- Timed exams, question bank, autosaved attempts and server-side grading.
- Attendance, CMS blog, testimonials, website settings and SEO metadata.
- Guardian consent portal with parent/guardian access to approved student summaries.
- Teacher-course commission periods, refund-adjusted earnings and manual payout requests/review.
- Academic batches, student placement, capacity management and weekly routine scheduling.
- Target deployment: cPanel with PHP 8.3+, MySQL 8 or compatible MariaDB, and a built React/Vite frontend.

## Implemented backend slices

The PHP API includes authentication/session handling, CSRF protection, role/permission checks, account lifecycle (registration, email verification and password recovery), branch-scoped administration, course/category/content management, enrolments and progress, manual payments/refunds and ledger records, exams, reusable question bank, attendance, live-class scheduling, notifications, CMS settings/posts/testimonials, student directory, public admission inquiries, certificates, guardian consent, teacher commissions/payouts, academic batches and weekly routines, storefront/e-book access and private course-media delivery.

The latest commission and batch modules are server-backed rather than local dashboard demo state. Teacher assignment changes create dated periods, so verified payments retain the rate active at review time; completed refunds reduce earnings, and accountant payout approval is separate from administrator-only assignment management. Payout transfers remain manual and require a confirmed external transaction reference. Batch enrollment requires an active/completed course enrollment, respects capacity and branch scope, and student batch/routine visibility is removed when course access is cancelled.

Database migrations are in `database/migrations/` and are applied in numeric filename order with `php scripts/migrate.php`. The CLI runner records checksums and refuses edited or missing applied migrations. API configuration and route notes are in `api/README.md`; cPanel deployment notes are in `docs/CPANEL-DEPLOYMENT.md`.

## Engineering and security principles

1. Server-side persistence is authoritative; browser storage is not the production database.
2. Protected operations enforce authentication, CSRF and permissions on the server.
3. Migrations must be repeatable and non-destructive.
4. Payment verification must be auditable and must never be simulated as successful.
5. Database credentials and secrets must never enter `VITE_*` variables, browser bundles or Git.
6. A successful build or CI run does not by itself establish production readiness.

## Current release status — 2026-11-13

**Not production-ready. Do not deploy or distribute this repository as a final LMS package yet.**

The main branch now contains persistent APIs and migrations for the modules listed above, and the merged release checks have passed PHP 8.3 syntax/migration safety, MySQL schema and PHP HTTP integration, frontend type-check/build, CodeQL and real cPanel ZIP assembly/content inspection. These checks do not replace a real hosting rehearsal.

The following release gates remain open:

- Clean cPanel installation and upgrade rehearsal using the exact release artifact, including PHP environment variables, Apache rules, file permissions and private-storage denial checks.
- Production email delivery for registration verification and password recovery. The current transport uses PHP `mail()`; the hosting sender/domain must be verified.
- Real payment-provider callback/signature verification and automated settlement/refund integration. Current bKash/Nagad/bank workflows rely on staff verification and manual refunds.
- Teacher payouts are recorded after a confirmed external transfer reference; there is no automatic bank/mobile-wallet payout integration.
- Backup and restore rehearsal, upgrade/rollback procedures and a complete browser-based installer. Initial database migration and super-admin creation currently use cPanel Terminal/CLI.
- Browser end-to-end, accessibility and security testing for the complete student, guardian, teacher, accountant and administrator journeys.
- Full branch/tenant isolation audit across every API module; individual modules have scoped checks, but this is not yet a complete isolation certification.
- Private e-book and course-media upload/download checks on the target cPanel host, including direct-URL denial and MIME/size enforcement.
- Reporting, expenses, library, hostel, transport and SaaS administration modules still require persistent backend and end-to-end implementation.

Some dashboard modules still contain legacy/demo data in `LmsContext`; a visible screen is not proof that its workflow is persisted or secure. The detailed module-by-module status and release gates are maintained in `docs/RELEASE-READINESS-AUDIT.md`.

## Validation

GitHub Actions checks PHP 8.3 syntax and migration safety, applies migrations to disposable MySQL 8.4 and runs PHP HTTP integration tests, and type-checks/builds the frontend. Required browser E2E and deployment rehearsal are separate release gates.

## Development

```bash
bun install --frozen-lockfile
bun run lint
bun run build
```

For backend validation, use the documented test scripts with a disposable test database. Never point destructive integration tests at production data.
